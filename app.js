(function () {
  "use strict";

  var LS_CALS = "tt_custom_cals";
  var LS_ITEMS = "tt_my_items";
  function load(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; }
  }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  var customCals = load(LS_CALS, []);            // ["家族", "友達", ...]
  var myItems = load(LS_ITEMS, {});              // { "2026-12-11": [ {id,start,end,title,place,cal}, ... ] }
  var BASE = ["全部", "共有", "個人"];
  var curCal = "全部";
  var editMode = false;

  var WEEK = ["日", "月", "火", "水", "木", "金", "土"];

  // ---- 期間の判定用 ----
  var todayStr = (function () {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  })();

  function calOf(item) { return item.cal || "共有"; }
  function visible(item) {
    if (curCal === "全部") return true;
    return calOf(item) === curCal;
  }

  function itemsForDay(day) {
    var base = day.items.filter(visible);
    var mine = (myItems[day.date] || []).filter(visible);
    var all = base.concat(mine);
    all.sort(function (a, b) { return (a.start || "").localeCompare(b.start || ""); });
    return all;
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
    nav.innerHTML = TRIP.days.map(function (day, i) {
      var d = new Date(day.date + "T00:00:00");
      var w = WEEK[d.getDay()];
      var md = (d.getMonth() + 1) + "/" + d.getDate();
      var cls = "tab" + (day.date === currentDay ? " active" : "") + (day.date === todayStr ? " today" : "");
      var n = itemsForDay(day).length;
      return '<button class="' + cls + '" data-day="' + day.date + '"><span class="d">' + md + "</span><span class=\"w\">" + w + "</span>" + (n ? ' <span class="w">(' + n + ")</span>" : "") + "</button>";
    }).join("");
  }

  // ---------- 1日の描画 ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderItem(it, isMine) {
    var cal = calOf(it);
    var kindCls = it.kind || "";
    var badge = "";
    if (it.fixed) badge = '<span class="badge">カレンダー確定</span>';
    else if (isMine || cal !== "共有") badge = '<span class="badge">' + esc(cal) + "</span>";
    var time = esc(it.start) + (it.end ? '<span class="end">〜' + esc(it.end) + "</span>" : "");
    var del = isMine ? '<br><button class="del" data-del="' + esc(it.id) + '">削除</button>' : "";
    return (
      '<li class="item ' + kindCls + '">' +
      '<div class="time">' + time + "</div>" +
      '<div class="dot"></div>' +
      '<div class="body"><div class="t">' + esc(it.title) + badge + "</div>" +
      (it.place ? '<div class="p">📍 ' + esc(it.place) + "</div>" : "") +
      del +
      "</div></li>"
    );
  }

  function renderDays() {
    var root = document.getElementById("days");
    root.innerHTML = TRIP.days.map(function (day) {
      if (day.date !== currentDay) return "";
      var list = itemsForDay(day);
      var d = new Date(day.date + "T00:00:00");
      var w = WEEK[d.getDay()];
      var body = list.length
        ? '<ul class="timeline">' + list.map(function (it) {
            var isMine = !!(it.id && (myItems[day.date] || []).some(function (m) { return m.id === it.id; }));
            return renderItem(it, isMine);
          }).join("") + "</ul>"
        : '<div class="day-card">このカレンダーの予定はありません。</div>';
      var calOptions = calList().filter(function (c) { return c !== "全部"; })
        .map(function (c) { return "<option" + (c === formCal ? " selected" : "") + ">" + c + "</option>"; }).join("");
      return (
        '<section class="day active">' +
        '<div class="day-head"><span class="date">' + (d.getMonth() + 1) + "月" + d.getDate() + "日(" + w + ")</span>" +
        '<span class="theme">' + esc(day.theme || "") + "</span></div>" +
        '<div class="day-card">' + body + "</div>" +
        '<div class="day-card">' +
        '<button class="addbtn" data-act="openform">＋ この日へ予定を追加（' + esc(formCal) + ' に登録）</button>' +
        '<div class="addform" id="addForm">' +
        '<div class="row"><input class="tm" type="time" id="fStart" required><input class="tm" type="time" id="fEnd"></div>' +
        '<div class="row"><input class="t" id="fTitle" placeholder="予定の名前" required></div>' +
        '<div class="row"><input class="t" id="fPlace" placeholder="場所（任意）"></div>' +
        '<div class="row"><select id="fCal">' + calOptions + "</select></div>" +
        '<button class="submit" data-act="additem">追加する</button>' +
        "</div></div>" +
        "</section>"
      );
    }).join("");
  }

  var currentDay = TRIP.days.some(function (d) { return d.date === todayStr; }) ? todayStr : TRIP.days[0].date;
  var formCal = "共有";

  function renderAll() {
    document.getElementById("title").textContent = TRIP.title;
    document.getElementById("subtitle").textContent = TRIP.subtitle;
    document.getElementById("note").textContent = TRIP.note || "";
    formCal = curCal === "全部" ? "共有" : curCal;
    renderCalTabs();
    renderDayTabs();
    renderDays();
    var u = document.getElementById("subUrl");
    u.textContent = location.origin + location.pathname.replace(/[^/]*$/, "") + "trip.ics";
  }

  // ---------- イベント ----------
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-cal],[data-day],[data-act],[data-del],[data-delcal]");
    if (!t) return;

    if (t.dataset.cal) { curCal = t.dataset.cal; renderAll(); return; }
    if (t.dataset.day) { currentDay = t.dataset.day; renderAll(); return; }

    if (t.dataset.delcal) {
      customCals = customCals.filter(function (c) { return c !== t.dataset.delcal; });
      save(LS_CALS, customCals);
      if (curCal === t.dataset.delcal) curCal = "全部";
      renderAll(); return;
    }

    switch (t.dataset.act) {
      case "newcal": {
        var row = document.getElementById("newcalRow");
        row.dataset.open = row.dataset.open ? "" : "1";
        row.classList.toggle("open", !!row.dataset.open);
        var inp = document.getElementById("newcalName");
        if (row.dataset.open) inp.focus();
        break;
      }
      case "editcals":
        editMode = !editMode;
        renderCalTabs();
        break;
      case "openform": {
        var f = document.getElementById("addForm");
        f.classList.toggle("open");
        if (f.classList.contains("open")) document.getElementById("fStart").focus();
        break;
      }
      case "additem": {
        var start = document.getElementById("fStart").value;
        var title = document.getElementById("fTitle").value.trim();
        if (!start || !title) return;
        var item = {
          id: "l-" + Date.now(),
          start: start,
          end: document.getElementById("fEnd").value || "",
          title: title,
          place: document.getElementById("fPlace").value.trim(),
          cal: document.getElementById("fCal").value,
        };
        (myItems[currentDay] = myItems[currentDay] || []).push(item);
        save(LS_ITEMS, myItems);
        renderAll();
        break;
      }
    }
  });

  document.addEventListener("click", function (e) {
    if (e.target.id === "newcalAdd") {
      var name = document.getElementById("newcalName").value.trim();
      if (name && BASE.indexOf(name) < 0 && customCals.indexOf(name) < 0) {
        customCals.push(name);
        save(LS_CALS, customCals);
        document.getElementById("newcalName").value = "";
        curCal = name;
        renderAll();
      }
    }
  });

  document.addEventListener("click", function (e) {
    if (e.target.classList && e.target.classList.contains("del")) {
      var id = e.target.dataset.del;
      var arr = myItems[currentDay] || [];
      myItems[currentDay] = arr.filter(function (m) { return m.id !== id; });
      save(LS_ITEMS, myItems);
      renderAll();
    }
  });

  renderAll();
})();
