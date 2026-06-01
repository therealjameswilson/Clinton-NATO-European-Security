#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "records.json");
const REPORT_DIR = path.join(ROOT, "reports");
const JSON_PATH = path.join(REPORT_DIR, "declassified-document-chronology.json");
const MD_PATH = path.join(REPORT_DIR, "declassified-document-chronology.md");
const CSV_PATH = path.join(REPORT_DIR, "declassified-document-chronology.csv");

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function textOf(record) {
  return [
    record.type,
    record.releaseStatus,
    record.declassificationStatus,
    record.originalClassification,
    record.source?.name,
    record.source?.collection,
    record.sourceNote
  ]
    .filter(Boolean)
    .join(" ");
}

function isDeclassifiedChronologyRecord(record) {
  if (["Scout Lead", "Source Lead"].includes(record.type)) return false;

  const statusText = textOf(record);
  if (record.type === "Context" && /Government Publishing Office|Public Papers|Not applicable/i.test(statusText)) {
    return false;
  }

  return (
    ["Memcon", "Telcon", "Release Packet"].includes(record.type) ||
    /\b(FOIA|MDR|released|declassified|unclassified|excisions?|Presidential Daily Diary)\b/i.test(statusText)
  );
}

function byChronology(a, b) {
  return (
    (a.sortDate || a.date || "9999-12-31").localeCompare(b.sortDate || b.date || "9999-12-31") ||
    (a.washingtonTime || "").localeCompare(b.washingtonTime || "") ||
    (a.title || "").localeCompare(b.title || "")
  );
}

function sourcePathParts(record) {
  const source = record.source || {};
  const explicitPath = list(source.path);
  if (explicitPath.length) return [source.name, ...explicitPath].filter(Boolean);
  return [
    source.name,
    source.collection,
    source.series,
    source.subseries,
    source.fileUnit,
    source.box ? `Box ${source.box}` : "",
    source.folder ? `Folder ${source.folder}` : "",
    source.itemTitle,
    source.documentId ? `Document ${source.documentId}` : "",
    source.caseNumber ? `Case ${source.caseNumber}` : "",
    record.naid ? `NAID ${record.naid}` : ""
  ].filter(Boolean);
}

function sourceMarkings(record) {
  return [
    record.originalClassification || record.classification,
    ...list(record.documentMarkings),
    record.telegramPrecedence || record.communication?.precedence,
    ...list(record.handlingMarkings)
  ]
    .filter(Boolean)
    .join("; ");
}

function productionIssues(record) {
  if (Array.isArray(record.productionIssues)) return record.productionIssues;
  const issues = [];
  const decision = record.selectionDecision || record.compilerDecision;
  if (!decision || decision === "Pending") issues.push("needs-selection");
  if (!record.sourceNote && sourcePathParts(record).length < 2) issues.push("needs-source");
  if (!record.sortDate || !record.dateLine || ((record.type === "Memcon" || record.type === "Telcon") && !record.washingtonTime)) {
    issues.push("needs-chronology");
  }
  if (
    (!record.declassificationStatus && (!record.releaseStatus || record.releaseStatus === "Unknown")) ||
    (/partial|mixed|withheld/i.test(record.releaseStatus || "") && !record.withheldMaterial)
  ) {
    issues.push("needs-declass");
  }
  return issues;
}

function nextAction(record) {
  const note = [record.sourceNoteAddendum, record.compilerNote, ...(record.compilerNotes || [])].filter(Boolean).join(" ");
  const issues = productionIssues(record);

  if (/Presidential Daily Diary context record/i.test(note)) {
    return "Use as a chronology lead; chase the substantive memcon, telcon, briefing book, trip file, or summit file before selection.";
  }
  if (record.type === "Release Packet") {
    return "Extract document-level items, actual dates, page spans, markings, and excision status from the packet.";
  }
  if (issues.includes("needs-chronology")) {
    return "Verify Washington time and final chronological placement against the source image or PDF.";
  }
  if (/pending review|verify|requires|not yet audited/i.test([record.declassificationStatus, record.releaseStatus, record.sourceNoteAddendum].join(" "))) {
    return "Verify markings, page span, declassification status, excisions, attachments, and clearance details.";
  }
  if (issues.includes("needs-selection")) {
    return "Make the include/context/exclude decision and add annotation links.";
  }
  return "Review for final selection, annotation, and index treatment.";
}

function compactSource(record) {
  return [
    record.source?.name,
    record.source?.caseNumber,
    record.source?.documentId || record.naid,
    record.sourcePages
  ]
    .filter(Boolean)
    .join("; ");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(records) {
  const columns = [
    ["date", (record) => record.sortDate || record.date || ""],
    ["washington_time", (record) => record.washingtonTime || ""],
    ["type", (record) => record.type || ""],
    ["title", (record) => record.documentTitle || record.title || ""],
    ["participants", (record) => list(record.participants).join("; ")],
    ["countries", (record) => list(record.countries).join("; ")],
    ["chapter", (record) => record.chapter?.name || ""],
    ["selection_decision", (record) => record.selectionDecision || record.compilerDecision || ""],
    ["declassification", (record) => record.declassificationStatus || record.releaseStatus || ""],
    ["source_id", compactSource],
    ["markings", sourceMarkings],
    ["source_pages", (record) => record.sourcePages || record.sourcePdfPages || ""],
    ["catalog_url", (record) => record.catalogUrl || ""],
    ["pdf_url", (record) => record.pdfUrl || ""],
    ["source_note", (record) => record.sourceNote || ""],
    ["next_action", nextAction]
  ];

  return [
    columns.map(([name]) => name).join(","),
    ...records.map((record) => columns.map(([, getter]) => csvEscape(getter(record))).join(","))
  ].join("\n");
}

function mdLink(record) {
  const url = record.catalogUrl || record.pdfUrl || "";
  return url ? `[open](${url})` : "";
}

function mdCell(value) {
  return String(value || "")
    .replace(/\|/g, "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

function toMarkdown(records, report) {
  const lines = [
    "# Declassified Document Chronology",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Scope",
    "",
    "- Date-sorted export of records that are already document-level or released/declassified context.",
    "- Includes memcons, telcons, release packets, and Presidential Daily Diary context records.",
    "- Excludes Scout Leads, Source Leads, and public-statement context until they are promoted into document-level evidence.",
    "",
    "## Counts",
    "",
    `- Chronology records: ${records.length}`,
    ...Object.entries(report.counts.byType).map(([type, count]) => `- ${type}: ${count}`),
    "",
    "## Compiler Use",
    "",
    "Use this file as the working sequence for reading, source-note review, onsite pulls, and selection decisions. The CSV version preserves fuller source-note and action fields for sorting in a spreadsheet.",
    ""
  ];

  const years = [...new Set(records.map((record) => (record.sortDate || record.date || "pending").slice(0, 4)))];
  for (const year of years) {
    const yearRecords = records.filter((record) => (record.sortDate || record.date || "pending").slice(0, 4) === year);
    lines.push(`## ${/^\d{4}$/.test(year) ? year : "Date Pending"}`, "");
    lines.push("Date | Type | Record | Source | Next action | Link");
    lines.push("--- | --- | --- | --- | --- | ---");
    for (const record of yearRecords) {
      lines.push(
        [
          record.sortDate || record.date || "",
          record.type || "",
          record.documentTitle || record.title || "",
          compactSource(record),
          nextAction(record),
          mdLink(record)
        ]
          .map(mdCell)
          .join(" | ")
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

function main() {
  const records = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")).filter(isDeclassifiedChronologyRecord).sort(byChronology);
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    source: "data/records.json",
    method:
      "Filtered out Scout Leads, Source Leads, and public-statement context; sorted remaining declassified/released document records by sortDate/date, Washington time, and title.",
    counts: {
      total: records.length,
      byType: records.reduce((counts, record) => {
        counts[record.type] = (counts[record.type] || 0) + 1;
        return counts;
      }, {}),
      byYear: records.reduce((counts, record) => {
        const year = (record.sortDate || record.date || "pending").slice(0, 4);
        counts[year] = (counts[year] || 0) + 1;
        return counts;
      }, {})
    },
    records: records.map((record) => ({
      id: record.id,
      date: record.sortDate || record.date || "",
      washingtonTime: record.washingtonTime || "",
      type: record.type,
      title: record.documentTitle || record.title,
      participants: list(record.participants),
      countries: list(record.countries),
      chapter: record.chapter?.name || "",
      selectionDecision: record.selectionDecision || record.compilerDecision || "",
      declassification: record.declassificationStatus || record.releaseStatus || "",
      sourceId: compactSource(record),
      sourcePages: record.sourcePages || record.sourcePdfPages || "",
      catalogUrl: record.catalogUrl || "",
      pdfUrl: record.pdfUrl || "",
      sourceNote: record.sourceNote || "",
      nextAction: nextAction(record)
    }))
  };

  fs.writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_PATH, `${toMarkdown(records, report)}\n`);
  fs.writeFileSync(CSV_PATH, `${toCsv(records)}\n`);

  console.log(`Wrote ${path.relative(ROOT, MD_PATH)}, ${path.relative(ROOT, CSV_PATH)}, and ${path.relative(ROOT, JSON_PATH)}.`);
  console.log(JSON.stringify(report.counts, null, 2));
}

main();
