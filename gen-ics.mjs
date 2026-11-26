// data.js から trip.ics を生成するスクリプト
// 使い方: node gen-ics.mjs
import fs from "node:fs";
import vm from "node:vm";

const src = fs.readFileSync("data.js", "utf8");
const sandbox = {};
const TRIP = vm.runInNewContext(src + "\nTRIP", sandbox);

function pad(n) { return String(n).padStart(2, "0"); }

function toUTC(date, hhmm) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  // JST(+9) を UTC に変換
  const dt = new Date(Date.UTC(y, m - 1, d, h - 9, min));
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`;
}

function plusMinutes(date, hhmm, addMin) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + addMin;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${pad(hh)}:${pad(mm)}`;
}

const esc = (s) => String(s ?? "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

let out = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//tokyo-trip-2026//schedule//JP",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  "X-WR-CALNAME:東京観光 2026/12/11-16",
  "X-WR-TIMEZONE:Asia/Tokyo",
];

for (const day of TRIP.days) {
  for (const it of day.items) {
    const start = it.start;
    const end = it.end || plusMinutes(day.date, start, 60);
    const cal = it.cal || "共有";
    const desc = [
      `カレンダー: ${cal}`,
      it.place ? `場所: ${it.place}` : "",
      it.fixed ? "Macカレンダーの確定予定" : "",
    ].filter(Boolean).join(" / ");
    out.push(
      "BEGIN:VEVENT",
      `UID:${day.date}-${start}-${Math.abs([...(day.date + start + it.title)].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7))}@tokyo-trip-2026`,
      `DTSTAMP:20261126T000000Z`,
      `DTSTART:${toUTC(day.date, start)}`,
      `DTEND:${toUTC(day.date, end)}`,
      `SUMMARY:${esc(it.title)}`,
      desc ? `DESCRIPTION:${esc(desc)}` : null,
      it.place ? `LOCATION:${esc(it.place)}` : null,
      "END:VEVENT",
    );
  }
}
out.push("END:VCALENDAR");

fs.writeFileSync("trip.ics", out.filter(Boolean).join("\r\n") + "\r\n");
console.log(`trip.ics written: ${out.filter(Boolean).length - 2} lines`);
