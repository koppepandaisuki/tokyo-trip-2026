(function () {
  "use strict";

  var GH_REPO = "koppepandaisuki/tokyo-trip-2026";
  var LS = {
    cals: "tt_custom_cals",
    items: "tt_my_items",
    token: "tt_gh_token",
    user: "tt_gh_user",
  };

  function load(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; }
  }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  var customCals = load(LS.cals, []);
  var myItems = load(LS.items, {});
  var ghToken = load(LS.token, "");
  var BASE = ["全部", "共有", "個人"];
  var curCal = "全部";
  var editMode = false;
  var currentDay = (TRIP.days.some(function (d) { return d.date === todayStr(); }) ? todayStr() : TRIP.days[0].date);
  var editor = null; // {mode:'add'|'edit', date, entry}

  var WEEK = ["日", "月", "火", "水", "木", "金", "土"];

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function md(dateStr) {
    var p = dateStr.split("-");
    return parseInt(p[1], 10) + "月" + parseInt(p[2], 10) + "日";
  }
  function calOf(it) { return it.cal || "共有"; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function visible(it) { return curCal === "全部" || calOf(it) === curCal; }

  var itemsForDayCache = [];

  function itemsForDay(day) {
    var list = day.items.filter(visible).map(function (it) { return { it: it, shared: true }; });
    (myItems[day.date] || []).filter(visible).forEach(function (it) { list.push({ it: it, shared: false }); });
    list.sort(function (a, b) { return (a.it.start || "").localeCompare(b.it.start || ""); });
    return list;
  }

  // ---------- 共有データの GitHub 反映 ----------
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }

  function putFile(path, content, msg) {
    return fetch("https://api.github.com/repos/" + GH_REPO + "/contents/" + path, {
      headers: { Authorization: "token " + ghToken, Accept: "application/vnd.github+json" },
    }).then(function (r) {
      if (!r.ok) throw new Error("GET " + path + ": " + r.status);
      return r.json();
    }).then(function (meta) {
      return fetch("https://api.github.com/repos/" + GH_REPO + "/contents/" + path, {
        method: "PUT",
        headers: { Authorization: "token " + ghToken, Accept: "application/vnd.github+json" },
        body: JSON.stringify({ message: msg, content: b64(content), sha: meta.sha }),
      });
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error("PUT " + path + ": " + r.status + " " + t.slice(0, 200)); });
      return true;
    });
  }

  function buildICS(trip) {
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var toUTC = function (date, hhmm) {
      var p = date.split("-").map(Number), q = hhmm.split(":").map(Number);
      var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2], q[0] - 9, q[1]));
      return dt.getUTCFullYear() + pad(dt.getUTCMonth() + 1) + pad(dt.getUTCDate()) + "T" + pad(dt.getUTCHours()) + pad(dt.getUTCMinutes()) + "00Z";
    };
    var plusMin = function (hhmm, add) {
      var q = hhmm.split(":").map(Number), t = q[0] * 60 + q[1] + add;
      return pad(Math.floor(t / 60) % 24) + ":" + pad(t % 60);
    };
    var escI = function (s) { return String(s == null ? "" : s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n"); };
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    var out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//tokyo-trip-2026//schedule//JP", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:東京観光 2026/12/11-16", "X-WR-TIMEZONE:Asia/Tokyo"];
    trip.days.forEach(function (day) {
      day.items.forEach(function (it) {
        var start = it.start, end = it.end || plusMin(start, 60);
        var cal = it.cal || "共有";
        var desc = ["カレンダー: " + cal, it.place ? "場所: " + it.place : "", it.fixed ? "Macカレンダーの確定予定" : ""].filter(Boolean).join(" / ");
        var h = 7;
        (day.date + start + it.title).split("").forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) | 0; });
        out.push("BEGIN:VEVENT",
          "UID:" + day.date + "-" + start + "-" + h + "@tokyo-trip-2026",
          "DTSTAMP:" + stamp,
          "DTSTART:" + toUTC(day.date, start),
          "DTEND:" + toUTC(day.date, end),
          "SUMMARY:" + escI(it.title),
          desc ? "DESCRIPTION:" + escI(desc) : null,
          it.place ? "LOCATION:" + escI(it.place) : null,
          "END:VEVENT");
      });
    });
    out.push("END:VCALENDAR");
    return out.filter(Boolean).join("\r\n") + "\r\n";
  }

  function setSaveStatus(text, cls) {
    var el = document.getElementById("saveStatus");
    el.textContent = text;
    el.className = "save-status" + (cls ? " " + cls : "");
  }

  function commitShared(msg) {
    if (!ghToken) return Promise.reject(new Error("GitHub連携が未設定です"));
    setSaveStatus("保存中…", "busy");
    var dataJs = "// 東京観光の予定データ（ページ上の編集や node gen-ics.mjs で更新されます）\nconst TRIP = " + JSON.stringify(TRIP, null, 2) + ";\n";
    return putFile("data.js", dataJs, msg)
      .then(function () { return putFile("trip.ics", buildICS(TRIP), msg); })
      .then(function () { setSaveStatus("✅ 保存しました。サイトへの反映まで1分ほどかかります。", "ok"); })
      .catch(function (e) {
        setSaveStatus("❌ 保存に失敗しました: " + e.message, "err");
      });
  }

  // ---------- カレンダータブ ----------
  function calList() { return BASE.concat(customCals); }

  function renderCalTabs() {
    var nav = document.getElementById("calTabs");
    nav.classList.toggle("editmode", editMode);
    var html = calList().map(function (c) {
      var active = c === curCal ? " active" : "";
      var x = customCals.indexOf(c) >= 0 ? ' <span class="x" data-delcal="' + c + '">✕</span>' : "";
      return '<button class="caltab' + active + '" data-cal="' + c + '">' + c + x + "</button>";
    }).join("");
    html += '<button class="addcal" data-act="newcal" title="カレンダーを追加">＋</button>';
    html += '<button class="addcal-edit" data-act="editcals">' + (editMode ? "完了" : "削除") + "</button>";
    nav.innerHTML = html;
    var row = document.getElementById("newcalRow");
    row.classList.toggle("open", !!row.dataset.open);
  }

  // ---------- 日タブ ----------
  function renderDayTabs() {
    var nav = document.getElementById("tabs");
    nav.innerHTML = TRIP.days.map(function (day) {
      var d = new Date(day.date + "T00:00:00");
      var w = WEEK[d.getDay()];
      var mdS = (d.getMonth() + 1) + "/" + d.getDate();
      var cls = "tab" + (day.date === currentDay ? " active" : "") + (day.date === todayStr() ? " today" : "");
      var n = itemsForDay(day).length;
      return '<button class="' + cls + '" data-day="' + day.date + '"><span class="d">' + mdS + '</span><span class="w">' + w + "</span>" + (n ? ' <span class="w">(' + n + ")</span>" : "") + "</button>";
    }).join("");
  }

  // ---------- 1日の描画 ----------
  function renderItem(entry, i) {
    var it = entry.it;
    var kindCls = it.kind || "";
    var badge = "";
    if (it.fixed) badge = '<span class="badge">カレンダー確定</span>';
    else if (calOf(it) !== "共有") badge = '<span class="badge">' + esc(calOf(it)) + "</span>";
    var time = esc(it.start) + (it.end ? '<span class="end">〜' + esc(it.end) + "</span>" : "");
    return (
      '<li class="item ' + kindCls + '" data-idx="' + i + '">' +
      '<div class="time">' + time + "</div>" +
      '<div class="dot"></div>' +
      '<div class="body"><div class="t">' + esc(it.title) + badge + "</div>" +
      (it.place ? '<div class="p">📍 ' + esc(it.place) + "</div>" : "") +
      "</div></li>"
    );
  }

  function renderDays() {
    var root = document.getElementById("days");
    root.innerHTML = TRIP.days.map(function (day) {
      if (day.date !== currentDay) return "";
      var list = itemsForDay(day);
      itemsForDayCache = list;
      var d = new Date(day.date + "T00:00:00");
      var w = WEEK[d.getDay()];
      var body = list.length
        ? '<ul class="timeline">' + list.map(renderItem).join("") + "</ul>"
        : '<div class="day-card">このカレンダーの予定はありません。</div>';
      return (
        '<section class="day active">' +
        '<div class="day-head"><span class="date">' + (d.getMonth() + 1) + "月" + d.getDate() + "日(" + w + ')</span>' +
        '<span class="theme">' + esc(day.theme || "") + "</span></div>" +
        '<div class="day-card">' + body + "</div>" +
        '<div class="day-card"><button class="addbtn" data-act="addnew">＋ この日へ予定を追加</button></div>' +
        "</section>"
      );
    }).join("");
  }

  function renderAll() {
    document.getElementById("title").textContent = TRIP.title;
    document.getElementById("subtitle").textContent = TRIP.subtitle;
    document.getElementById("note").textContent = TRIP.note || "";
    document.getElementById("gearBtn").classList.toggle("linked", !!ghToken);
    renderCalTabs();
    renderDayTabs();
    renderDays();
    var u = document.getElementById("subUrl");
    u.textContent = location.origin + location.pathname.replace(/[^/]*$/, "") + "trip.ics";
  }

  // ---------- 編集ダイアログ ----------
  function calOptionsFor(selected, includeShared) {
    var opts = (includeShared ? ["共有", "個人"] : ["個人"]).concat(customCals);
    if (opts.indexOf(selected) < 0 && includeShared) opts.unshift(selected);
    return opts.map(function (c) { return "<option" + (c === selected ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("");
  }

  function setLocked(locked) {
    ["fStart", "fEnd", "fTitle", "fPlace", "fCal"].forEach(function (id) { document.getElementById(id).disabled = locked; });
    document.getElementById("edSave").style.display = locked ? "none" : "";
    document.getElementById("edDelete").style.display = locked ? "none" : "";
  }

  function openEditor(mode, entry) {
    editor = { mode: mode, date: currentDay, entry: entry || null };
    var ov = document.getElementById("overlay");
    var warn = document.getElementById("edWarn");
    var shared = !!(entry && entry.shared);
    var locked = shared && !ghToken;
    document.getElementById("edTitle").textContent = mode === "add" ? "予定を追加（" + md(currentDay) + "）" : "予定を編集";
    if (mode === "add") {
      document.getElementById("fStart").value = "";
      document.getElementById("fEnd").value = "";
      document.getElementById("fTitle").value = "";
      document.getElementById("fPlace").value = "";
      var def = curCal === "全部" ? (ghToken ? "共有" : "個人") : curCal;
      if (def === "共有" && !ghToken) def = "個人";
      document.getElementById("fCal").innerHTML = calOptionsFor(def, !!ghToken);
      document.getElementById("edDelete").style.display = "none";
      warn.textContent = def === "共有" ? "「共有」に追加すると全員に見えます（GitHub連携が必要）" : "「" + def + "」に追加します（この端末にのみ保存）";
      setLocked(false);
    } else {
      var it = entry.it;
      document.getElementById("fStart").value = it.start || "";
      document.getElementById("fEnd").value = it.end || "";
      document.getElementById("fTitle").value = it.title || "";
      document.getElementById("fPlace").value = it.place || "";
      document.getElementById("fCal").innerHTML = calOptionsFor(calOf(it), true);
      warn.textContent = locked ? "共有予定の編集・削除には ⚙️ の GitHub 連携が必要です" : (shared ? "「共有」の予定を変更します（全員に反映）" : "この端末に保存された予定を変更します");
      setLocked(locked);
    }
    ov.classList.add("open");
    document.getElementById("fStart").focus();
  }

  function closeEditor() {
    document.getElementById("overlay").classList.remove("open");
    editor = null;
  }

  function saveEditor() {
    if (!editor) return;
    var start = document.getElementById("fStart").value;
    var title = document.getElementById("fTitle").value.trim();
    var end = document.getElementById("fEnd").value || "";
    var place = document.getElementById("fPlace").value.trim();
    var cal = document.getElementById("fCal").value;
    if (!start || !title) return;

    if (editor.mode === "add") {
      if (cal === "共有") {
        if (!ghToken) { document.getElementById("edWarn").textContent = "共有への追加には GitHub 連携が必要です"; return; }
        TRIP.days.find(function (d) { return d.date === editor.date; }).items.push({ start: start, end: end, title: title, place: place, cal: "共有" });
        commitShared("add: " + editor.date + " " + start + " " + title);
      } else {
        (myItems[editor.date] = myItems[editor.date] || []).push({ id: "l-" + Date.now(), start: start, end: end, title: title, place: place, cal: cal });
        save(LS.items, myItems);
      }
    } else {
      var it = editor.entry.it;
      var changed = it.start !== start || it.title !== title || it.end !== end || it.place !== place || calOf(it) !== cal;
      if (!changed) { closeEditor(); return; }
      if (editor.entry.shared) {
        if (!ghToken) return;
        it.start = start; it.end = end; it.title = title; it.place = place; it.cal = cal;
        commitShared("edit: " + editor.date + " " + start + " " + title);
      } else {
        it.start = start; it.end = end; it.title = title; it.place = place; it.cal = cal;
        save(LS.items, myItems);
      }
    }
    closeEditor();
    renderAll();
  }

  function deleteEditor() {
    if (!editor || !editor.entry) return;
    var it = editor.entry.it;
    if (editor.entry.shared) {
      if (!ghToken) return;
      var day = TRIP.days.find(function (d) { return d.date === editor.date; });
      day.items = day.items.filter(function (x) { return x !== it; });
      commitShared("delete: " + editor.date + " " + it.start + " " + it.title);
    } else {
      myItems[editor.date] = (myItems[editor.date] || []).filter(function (m) { return m !== it; });
      save(LS.items, myItems);
    }
    closeEditor();
    renderAll();
  }

  // ---------- 設定（GitHub連携） ----------
  function initSettings() {
    var token = document.getElementById("ghToken");
    var status = document.getElementById("ghStatus");
    token.value = "";
    if (ghToken) status.textContent = "連携中: " + (load(LS.user, "") || "トークン設定済み");
    else status.textContent = "";
  }

  document.getElementById("gearBtn").addEventListener("click", function () {
    var s = document.getElementById("settings");
    s.classList.toggle("open");
    initSettings();
  });

  document.getElementById("ghSave").addEventListener("click", function () {
    var token = document.getElementById("ghToken").value.trim();
    var status = document.getElementById("ghStatus");
    if (!token) return;
    status.textContent = "確認中…";
    fetch("https://api.github.com/user", { headers: { Authorization: "token " + token } })
      .then(function (r) { if (!r.ok) throw new Error("トークンが無効です（" + r.status + "）"); return r.json(); })
      .then(function (u) {
        ghToken = token; save(LS.token, token); save(LS.user, u.login);
        status.textContent = "✅ 連携OK: " + u.login + "（共有タブを直接編集できます）";
        renderAll();
      })
      .catch(function (e) { status.textContent = "❌ " + e.message; });
  });

  document.getElementById("ghClear").addEventListener("click", function () {
    ghToken = ""; localStorage.removeItem(LS.token); localStorage.removeItem(LS.user);
    initSettings(); renderAll();
  });

  // ---------- イベント ----------
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-cal],[data-day],[data-act],[data-delcal]");
    if (!t) return;

    if (t.dataset.cal) { curCal = t.dataset.cal; renderAll(); return; }
    if (t.dataset.day) { currentDay = t.dataset.day; renderAll(); return; }
    if (t.dataset.delcal) {
      customCals = customCals.filter(function (c) { return c !== t.dataset.delcal; });
      save(LS.cals, customCals);
      if (curCal === t.dataset.delcal) curCal = "全部";
      renderAll(); return;
    }

    switch (t.dataset.act) {
      case "newcal": {
        var row = document.getElementById("newcalRow");
        row.dataset.open = row.dataset.open ? "" : "1";
        row.classList.toggle("open", !!row.dataset.open);
        if (row.dataset.open) document.getElementById("newcalName").focus();
        break;
      }
      case "editcals":
        editMode = !editMode;
        renderCalTabs();
        break;
      case "addnew":
        openEditor("add");
        break;
    }
  });

  document.addEventListener("click", function (e) {
    if (e.target.id === "newcalAdd") {
      var name = document.getElementById("newcalName").value.trim();
      if (name && BASE.indexOf(name) < 0 && customCals.indexOf(name) < 0) {
        customCals.push(name);
        save(LS.cals, customCals);
        document.getElementById("newcalName").value = "";
        curCal = name;
        renderAll();
      }
    }
  });

  document.getElementById("days").addEventListener("click", function (e) {
    var li = e.target.closest("li.item");
    if (!li) return;
    var entry = itemsForDayCache[Number(li.dataset.idx)];
    if (entry) openEditor("edit", entry);
  });

  document.getElementById("edCancel").addEventListener("click", closeEditor);
  document.getElementById("edSave").addEventListener("click", saveEditor);
  document.getElementById("edDelete").addEventListener("click", function () {
    if (confirm("この予定を削除しますか？")) deleteEditor();
  });
  document.getElementById("overlay").addEventListener("click", function (e) {
    if (e.target === this) closeEditor();
  });

  renderAll();
})();
