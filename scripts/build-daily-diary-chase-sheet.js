#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT, "reports", "presidential-daily-diary-search.json");
const CSV_PATH = path.join(ROOT, "reports", "presidential-daily-diary-chase-sheet.csv");

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function eventText(reference) {
  return [reference.title, reference.summary, reference.compilerUse, ...list(reference.topics)].filter(Boolean).join(" ");
}

function eventType(reference) {
  const title = reference.title || "";
  if (/conference call|secure voice|telcon|\bcall/i.test(title)) return "Call or telcon lead";
  if (/summit|trip|visit|dinner|luncheon|bilateral/i.test(title)) return "Summit or trip lead";
  if (/signing|treaty|ceremony|ratification/i.test(title)) return "Treaty or public-action lead";
  if (/briefing|prep|preparation/i.test(title)) return "Briefing lead";
  if (/meeting|session/i.test(title)) return "Meeting lead";

  const text = eventText(reference);
  if (/conference call|secure voice|telcon|\bcall/i.test(text)) return "Call or telcon lead";
  if (/summit|trip|visit|dinner|luncheon|bilateral/i.test(text)) return "Summit or trip lead";
  if (/briefing|prep|preparation/i.test(text)) return "Briefing lead";
  if (/signing|treaty|ceremony|ratification/i.test(text)) return "Treaty or public-action lead";
  if (/meeting|session/i.test(text)) return "Meeting lead";
  return "Diary chronology lead";
}

function priority(reference) {
  const text = eventText(reference);
  if (/High-priority|CFE|OSCE|Madrid|Washington NATO Summit|Military Technical Agreement|NATO Secretary General|NATO 50th|Founding Act/i.test(text)) {
    return "High";
  }
  if (/NATO-Russia|enlargement|Kosovo|Bosnia|Dayton|Yeltsin|Putin|Solana|KFOR/i.test(text)) return "Medium-high";
  return "Medium";
}

function chaseTarget(reference) {
  const text = eventText(reference);
  if (/conference call|secure voice|telcon|\bcall/i.test(text)) {
    return "Chase telcon text, call sheet, NSC prep notes, and same-day follow-up memoranda.";
  }
  if (/summit|trip|visit|bilateral|dinner|luncheon/i.test(text)) {
    return "Chase summit memcons, trip book tabs, briefing materials, and delegation follow-up files.";
  }
  if (/briefing|prep|preparation/i.test(text)) {
    return "Chase briefing papers, decision memoranda, staff notes, and meeting readouts.";
  }
  if (/signing|treaty|ceremony|ratification/i.test(text)) {
    return "Chase treaty/signing files, public papers, NSC legal-policy files, and speech drafts.";
  }
  return "Chase substantive memcon, briefing book, source image, and NSC follow-up files.";
}

function sourceControl(reference) {
  if (/2010-0083-F/i.test(reference.release || "")) {
    return "User-supplied 2010-0083-F release; verify diary page image and any withdrawal sheets before citing.";
  }
  return "Broader PDD release; verify page image, date range, and OCR hit before citing.";
}

function flatten(report) {
  return report.selectedReferences
    .slice()
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.title || "").localeCompare(b.title || ""))
    .map((reference, index) => ({
      chaseOrder: String(index + 1).padStart(2, "0"),
      priority: priority(reference),
      eventType: eventType(reference),
      chaseTarget: chaseTarget(reference),
      sourceControl: sourceControl(reference),
      ...reference
    }));
}

function toCsv(rows) {
  const columns = [
    ["chase_order", (row) => row.chaseOrder],
    ["priority", (row) => row.priority],
    ["event_type", (row) => row.eventType],
    ["date", (row) => row.date],
    ["diary_reference", (row) => row.title],
    ["source_pages", (row) => row.sourcePages],
    ["naid", (row) => row.naid],
    ["release", (row) => row.release],
    ["catalog_title", (row) => row.catalogTitle],
    ["participants", (row) => list(row.participants).join("; ")],
    ["countries", (row) => list(row.countries).join("; ")],
    ["topics", (row) => list(row.topics).join("; ")],
    ["summary", (row) => row.summary],
    ["compiler_use", (row) => row.compilerUse],
    ["chase_target", (row) => row.chaseTarget],
    ["source_control", (row) => row.sourceControl],
    ["search_terms_hit", (row) => list(row.searchTermsHit).join("; ")],
    ["catalog_url", (row) => row.catalogUrl],
    ["pdf_url", (row) => row.pdfUrl],
    ["pdf_filename", (row) => row.pdfFilename],
    ["substantive_record_found", () => ""],
    ["memcon_telcon_or_trip_file", () => ""],
    ["source_note_verified", () => ""],
    ["final_selection_decision", () => ""],
    ["compiler_notes", () => ""]
  ];

  return [
    columns.map(([name]) => name).join(","),
    ...rows.map((row) => columns.map(([, getter]) => csvEscape(getter(row))).join(","))
  ].join("\n");
}

function main() {
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
  const rows = flatten(report);
  fs.writeFileSync(CSV_PATH, `${toCsv(rows)}\n`);
  console.log(`Wrote ${path.relative(ROOT, CSV_PATH)} (${rows.length} diary chase rows)`);
}

main();
