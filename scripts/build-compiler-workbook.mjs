#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPORT_DIR = path.join(ROOT, "reports");
const OUTPUT_DIR = path.join(ROOT, "outputs", "frus-v17-compiler-workbook");
const WORKBOOK_PATH = path.join(REPORT_DIR, "frus-v17-compiler-workbook.xlsx");
const OUTPUT_WORKBOOK_PATH = path.join(OUTPUT_DIR, "frus-v17-compiler-workbook.xlsx");
const ACTION_QUEUE_CSV_PATH = path.join(REPORT_DIR, "frus-v17-compiler-action-queue.csv");
const CITATION_DESK_CSV_PATH = path.join(REPORT_DIR, "frus-v17-citation-desk.csv");

const COVERAGE_SIGNALS = [
  { label: "CFE gap", bonus: 36, pattern: /\bCFE\b|Conventional Forces/i },
  { label: "NAC/USNATO gap", bonus: 36, pattern: /\bNAC\b|USNATO|North Atlantic Council|NATO Mission/i },
  { label: "OSCE/CSCE architecture", bonus: 22, pattern: /\bOSCE\b|\bCSCE\b|Istanbul|Budapest/i },
  { label: "NATO-EU/ESDI architecture", bonus: 18, pattern: /NATO-EU|\bESDI\b|European Union|\bEU\b/i },
  { label: "Madrid/accession thread", bonus: 18, pattern: /Madrid|accession|ratification|enlargement|Poland|Hungary|Czech/i },
  { label: "NATO-Russia thread", bonus: 18, pattern: /NATO-Russia|Founding Act|Yeltsin|Putin|Kozyrev|Primakov|Mamedov|Chernomyrdin/i }
];

const QUEUE_GROUP_ORDER = [
  "Rebalance Coverage",
  "Promote Leads",
  "Chase Diary Leads",
  "Fix Source and Declass",
  "Selection Triage",
  "Final Review"
];

const ACTION_QUEUE_COLUMNS = [
  { key: "rank", header: "Rank", type: "number", width: 70 },
  { key: "category", header: "Category", width: 180 },
  { key: "priority_score", header: "Priority Score", type: "number", width: 110 },
  { key: "date", header: "Date", type: "date", width: 95 },
  { key: "type", header: "Type", width: 110 },
  { key: "title", header: "Title", width: 340 },
  { key: "chapter", header: "Chapter", width: 220 },
  { key: "selection_decision", header: "Selection Decision", width: 150 },
  { key: "production_issues", header: "Production Issues", width: 190 },
  { key: "coverage_signals", header: "Coverage Signals", width: 260 },
  { key: "next_action", header: "Next Action", width: 360 },
  { key: "catalog_url", header: "Catalog URL", width: 260 },
  { key: "pdf_url", header: "PDF URL", width: 260 },
  { key: "source_note", header: "Source Note", width: 420 }
];

const CITATION_DESK_COLUMNS = [
  { key: "rank", header: "Rank", type: "number", width: 70 },
  { key: "citation_group", header: "Citation Group", width: 190 },
  { key: "priority_score", header: "Priority Score", type: "number", width: 110 },
  { key: "status", header: "Status", width: 210 },
  { key: "date", header: "Date", type: "date", width: 95 },
  { key: "type", header: "Type", width: 110 },
  { key: "title", header: "Title", width: 340 },
  { key: "chapter", header: "Chapter", width: 220 },
  { key: "next_action", header: "Next Action", width: 360 },
  { key: "source_note_draft", header: "Source Note Draft", width: 440 },
  { key: "catalog_url", header: "Catalog URL", width: 260 },
  { key: "pdf_url", header: "PDF URL", width: 260 }
];

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function join(value) {
  return list(value).join("; ");
}

function csvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((item) => item.some((value) => value !== ""));
}

function parseCsv(text) {
  const rows = csvRows(text);
  const headers = rows.shift() || [];
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.map((column) => column.key).join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column.key])).join(","))
  ].join("\n");
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(ROOT, relativePath), "utf8"));
}

async function readCsv(relativePath) {
  return parseCsv(await fs.readFile(path.join(ROOT, relativePath), "utf8"));
}

function sourcePathParts(record) {
  const source = record.source || {};
  const explicit = list(source.path);
  if (explicit.length) return [source.name, ...explicit].filter(Boolean);
  return [
    source.name,
    source.collection,
    source.series,
    source.subseries,
    source.lotFile,
    source.fileUnit,
    source.box ? `Box ${source.box}` : "",
    source.folder ? `Folder ${source.folder}` : "",
    source.itemTitle,
    source.documentId ? `Document ${source.documentId}` : "",
    source.caseNumber ? `Case ${source.caseNumber}` : "",
    record.naid && !/^sample$/i.test(record.naid) ? `NAID ${record.naid}` : ""
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
  if (Array.isArray(record.productionIssues) && record.productionIssues.length) return record.productionIssues;
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

function formatIssue(issue) {
  return (
    {
      "needs-selection": "selection",
      "needs-source": "source note",
      "needs-chronology": "chronology",
      "needs-declass": "declassification",
      "needs-annotation": "annotation",
      "needs-index": "index terms"
    }[issue] || issue
  );
}

function coverageText(record) {
  return [
    record.title,
    record.documentTitle,
    record.subjectLine,
    record.dateLine,
    record.sourceNote,
    record.source?.collection,
    record.source?.series,
    record.source?.fileUnit,
    record.source?.folder,
    record.source?.itemTitle,
    ...list(record.persons),
    ...list(record.participants),
    ...list(record.countries),
    ...sourcePathParts(record)
  ]
    .filter(Boolean)
    .join(" ");
}

function recordYear(record) {
  const value = (record.sortDate || record.date || "").slice(0, 4);
  return /^\d{4}$/.test(value) ? Number(value) : null;
}

function isDailyDiaryRecord(record) {
  return (
    /^pdd-/i.test(record.id || "") ||
    /Presidential Daily Diary|2010-0083-F/i.test([record.sourceNote, record.sourceNoteAddendum, record.source?.collection].join(" "))
  );
}

function coverageSignals(record) {
  const text = coverageText(record);
  const signals = COVERAGE_SIGNALS.filter((signal) => signal.pattern.test(text)).map((signal) => signal.label);
  const year = recordYear(record);
  if (year && year >= 1997) signals.push("late-volume coverage");
  if (record.chapter?.name && record.chapter.name !== "Crisis Security Files") signals.push("non-crisis lane");
  return [...new Set(signals)];
}

function coverageBonus(record) {
  const text = coverageText(record);
  const patternBonus = COVERAGE_SIGNALS.reduce((sum, signal) => (signal.pattern.test(text) ? sum + signal.bonus : sum), 0);
  const year = recordYear(record);
  return (
    patternBonus +
    (year && year >= 1997 ? 10 : 0) +
    (record.chapter?.name && record.chapter.name !== "Crisis Security Files" ? 16 : 0)
  );
}

function actionQueueScore(record) {
  let score = 0;
  if (record.type === "Scout Lead") score += 42;
  if (record.type === "Source Lead") score += 34;
  if (record.type === "Release Packet") score += 28;
  if (record.selectionDecision === "Include candidate") score += 16;
  if (record.selectionDecision === "Context candidate") score += 10;
  if (record.pdfUrl) score += 6;
  if (record.catalogUrl) score += 5;
  score += coverageBonus(record);

  for (const issue of productionIssues(record)) {
    score +=
      {
        "needs-source": 20,
        "needs-chronology": 18,
        "needs-declass": 16,
        "needs-selection": 12,
        "needs-annotation": 7,
        "needs-index": 5
      }[issue] || 0;
  }

  if (isDailyDiaryRecord(record)) score += 14;
  return score;
}

function actionQueueCategory(record, issues, signals) {
  if (isDailyDiaryRecord(record)) return "Chase Diary Leads";
  if (signals.some((signal) => /gap|architecture|late-volume|non-crisis/i.test(signal))) return "Rebalance Coverage";
  if (record.type === "Scout Lead" || record.type === "Release Packet") return "Promote Leads";
  if (issues.some((issue) => ["needs-source", "needs-chronology", "needs-declass"].includes(issue))) return "Fix Source and Declass";
  if (issues.includes("needs-selection") || record.type === "Source Lead") return "Selection Triage";
  return "Final Review";
}

function actionQueueNextStep(record, issues) {
  if (isDailyDiaryRecord(record)) return "Chase substantive memcon, telcon, briefing book, trip file, or summit file.";
  if (record.type === "Scout Lead") return "Extract document-level candidates with actual dates, page spans, markings, and source path.";
  if (record.type === "Release Packet") return "Split packet into document-level records with page spans, markings, and excision status.";
  if (record.type === "Source Lead") return "Read released PDF, decide include/context/exclude, and extract source note fields.";
  if (issues.includes("needs-source")) return "Repair first source note from repository path through markings and page span.";
  if (issues.includes("needs-chronology")) return "Verify Washington time and chronological placement.";
  if (issues.includes("needs-declass")) return "Verify release status, excisions, and withdrawal sheets.";
  if (issues.includes("needs-selection")) return "Make include, context, duplicate/source-control, or exclude decision.";
  return "Review for final selection, annotation, and index treatment.";
}

function buildActionQueue(records) {
  return records
    .map((record) => {
      const issues = productionIssues(record);
      const signals = coverageSignals(record);
      return {
        record,
        issues,
        signals,
        score: actionQueueScore(record),
        category: actionQueueCategory(record, issues, signals),
        nextAction: actionQueueNextStep(record, issues)
      };
    })
    .filter((item) => {
      return (
        item.score >= 58 ||
        item.issues.some((issue) => ["needs-source", "needs-chronology", "needs-declass"].includes(issue)) ||
        item.signals.some((signal) => /gap/i.test(signal)) ||
        isDailyDiaryRecord(item.record)
      );
    })
    .sort((a, b) => {
      return (
        b.score - a.score ||
        QUEUE_GROUP_ORDER.indexOf(a.category) - QUEUE_GROUP_ORDER.indexOf(b.category) ||
        (a.record.sortDate || a.record.date || "").localeCompare(b.record.sortDate || b.record.date || "") ||
        (a.record.title || "").localeCompare(b.record.title || "")
      );
    })
    .map((item, index) => ({
      rank: index + 1,
      category: item.category,
      priority_score: item.score,
      date: item.record.sortDate || item.record.date || "",
      type: item.record.type || "",
      title: item.record.documentTitle || item.record.title || "",
      chapter: item.record.chapter?.name || "",
      selection_decision: item.record.selectionDecision || item.record.compilerDecision || "",
      production_issues: item.issues.map(formatIssue).join("; "),
      coverage_signals: item.signals.join("; "),
      next_action: item.nextAction,
      catalog_url: item.record.catalogUrl || item.record.source?.url || "",
      pdf_url: item.record.pdfUrl || item.record.source?.pdfUrl || "",
      source_note: createSourceNoteDraft(item.record)
    }));
}

function createSourceNoteDraft(record) {
  if (record.sourceNote) return record.sourceNote;
  const parts = sourcePathParts(record);
  const details = [
    parts.length ? parts.join(", ") : "",
    sourceMarkings(record),
    record.sourcePages || record.sourcePdfPages ? `Source pages: ${record.sourcePages || record.sourcePdfPages}` : "",
    record.sourceNoteAddendum || ""
  ].filter(Boolean);
  return details.length ? `Source: ${details.join(". ")}.` : "";
}

function citationGroup(record, issues) {
  if (issues.includes("needs-source")) return "Repair First Note";
  if (issues.includes("needs-chronology")) return "Verify Time and Placement";
  if (issues.includes("needs-declass")) return "Verify Declassification";
  return "Copy-Ready Drafts";
}

function citationNextAction(record, issues) {
  if (issues.includes("needs-source")) return "Build first source note from source image, collection path, markings, and page span.";
  if (issues.includes("needs-chronology")) return "Verify Washington time/date line before copying citation into document sequence.";
  if (issues.includes("needs-declass")) return "Verify declassification status, excisions, and withdrawal sheets.";
  if (/Presidential Daily Diary/i.test(record.sourceNoteAddendum || "")) return "Use as context citation only; chase substantive record before selection.";
  return "Copy working source note, then verify markings, attachments, marginalia, and final placement.";
}

function buildCitationDesk(records) {
  return records
    .map((record) => {
      const issues = productionIssues(record);
      const note = createSourceNoteDraft(record);
      const priority =
        (issues.includes("needs-source") ? 35 : 0) +
        (issues.includes("needs-chronology") ? 25 : 0) +
        (issues.includes("needs-declass") ? 20 : 0) +
        (note ? 8 : 0) +
        (record.selectionDecision === "Include candidate" ? 12 : 0);
      return {
        record,
        issues,
        note,
        priority,
        group: citationGroup(record, issues),
        nextAction: citationNextAction(record, issues)
      };
    })
    .filter((item) => item.note || item.issues.length)
    .sort((a, b) => b.priority - a.priority || (a.record.sortDate || a.record.date || "").localeCompare(b.record.sortDate || b.record.date || ""))
    .map((item, index) => ({
      rank: index + 1,
      citation_group: item.group,
      priority_score: item.priority,
      status: item.issues.length ? item.issues.map(formatIssue).join("; ") : "working draft ready",
      date: item.record.sortDate || item.record.date || "",
      type: item.record.type || "",
      title: item.record.documentTitle || item.record.title || "",
      chapter: item.record.chapter?.name || "",
      next_action: item.nextAction,
      source_note_draft: item.note,
      catalog_url: item.record.catalogUrl || item.record.source?.url || "",
      pdf_url: item.record.pdfUrl || item.record.source?.pdfUrl || ""
    }));
}

function recordsIndex(records) {
  return records.map((record) => {
    const issues = productionIssues(record);
    return {
      id: record.id || "",
      date: record.sortDate || record.date || "",
      type: record.type || "",
      title: record.documentTitle || record.title || "",
      chapter: record.chapter?.name || "",
      selection_decision: record.selectionDecision || record.compilerDecision || "",
      release_status: record.releaseStatus || "",
      declassification_status: record.declassificationStatus || "",
      production_issues: issues.map(formatIssue).join("; "),
      source_name: record.source?.name || "",
      source_case: record.source?.caseNumber || record.source?.documentId || record.naid || "",
      source_pages: record.sourcePages || record.sourcePdfPages || "",
      catalog_url: record.catalogUrl || record.source?.url || "",
      pdf_url: record.pdfUrl || record.source?.pdfUrl || "",
      next_action: actionQueueNextStep(record, issues)
    };
  });
}

function gapRows(gapReport) {
  const risks = gapReport.risks.map((risk) => ({
    section: "Risk",
    id: risk.id,
    status: risk.severity,
    label: risk.finding,
    count: "",
    threshold: "",
    evidence: risk.evidence,
    action: risk.action
  }));
  const topics = gapReport.topicCoverage.map((topic) => ({
    section: "Topic Coverage",
    id: topic.id,
    status: topic.status,
    label: topic.label,
    count: topic.count,
    threshold: topic.minimum,
    evidence: topic.caveat,
    action: topic.status === "gap" ? "Target additional document-level sources before selection." : "Verify direct decision-record quality."
  }));
  return [...risks, ...topics];
}

function sourceAuditRows(audit) {
  const countRows = Object.entries(audit.counts || {}).map(([key, value]) => ({
    section: "Count",
    label: key,
    value: typeof value === "object" ? JSON.stringify(value) : value,
    detail: ""
  }));
  const actionRows = (audit.actions || []).map((action, index) => ({
    section: "Action",
    label: `Action ${index + 1}`,
    value: "",
    detail: action
  }));
  const sampleRows = Object.entries(audit.samples || {}).flatMap(([key, values]) =>
    list(values)
      .slice(0, 25)
      .map((value) => ({
        section: "Sample",
        label: key,
        value: value.id || value.title || value.sourceNote || "",
        detail: JSON.stringify(value).slice(0, 900)
      }))
  );
  return [...countRows, ...actionRows, ...sampleRows];
}

function colName(index) {
  let value = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    current = Math.floor((current - remainder - 1) / 26);
  }
  return value;
}

function matrix(rows, columns) {
  return [columns.map((column) => column.header), ...rows.map((row) => columns.map((column) => coerceValue(row[column.key], column)))];
}

function coerceValue(value, column) {
  if (column.type === "number") {
    if (value === "" || value === null || typeof value === "undefined") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  if (column.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return new Date(`${value}T00:00:00Z`);
  }
  return value ?? "";
}

function styleDataSheet(sheet, sheetName, rows, columns, subtitle) {
  const lastCol = colName(columns.length - 1);
  const lastRow = rows.length + 4;
  sheet.getRange(`A1:${lastCol}1`).values = [[sheetName, ...Array(columns.length - 1).fill("")]];
  sheet.getRange(`A2:${lastCol}2`).values = [[subtitle, ...Array(columns.length - 1).fill("")]];
  sheet.getRange(`A4:${lastCol}${lastRow}`).values = matrix(rows, columns);

  sheet.getRange(`A1:${lastCol}1`).format.fill = "accent1";
  sheet.getRange(`A1:${lastCol}1`).format.font = { color: "lt1", bold: true, size: 16 };
  sheet.getRange(`A2:${lastCol}2`).format.fill = "lt2";
  sheet.getRange(`A2:${lastCol}2`).format.font = { color: "dk1", italic: true };
  sheet.getRange(`A4:${lastCol}4`).format.fill = "accent2";
  sheet.getRange(`A4:${lastCol}4`).format.font = { color: "lt1", bold: true };
  sheet.getRange(`A4:${lastCol}4`).format.wrapText = true;
  sheet.getRange(`A5:${lastCol}${lastRow}`).format.wrapText = true;
  sheet.getRange(`A5:${lastCol}${lastRow}`).format.rowHeightPx = 38;
  sheet.getRange(`A4:${lastCol}4`).format.rowHeightPx = 34;
  sheet.freezePanes.freezeRows(4);

  columns.forEach((column, index) => {
    const letter = colName(index);
    sheet.getRange(`${letter}:${letter}`).format.columnWidthPx = column.width || 120;
    if (column.type === "date") sheet.getRange(`${letter}5:${letter}${lastRow}`).format.numberFormat = "yyyy-mm-dd";
    if (column.type === "number") sheet.getRange(`${letter}5:${letter}${lastRow}`).format.numberFormat = "0";
  });

}

function addDataSheet(workbook, sheetName, subtitle, rows, columns) {
  const sheet = workbook.worksheets.add(sheetName);
  styleDataSheet(sheet, sheetName, rows, columns, subtitle);
  return sheet;
}

function countsBy(records, getter) {
  return records.reduce((counts, record) => {
    const key = getter(record) || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function addDashboard(workbook, data) {
  const sheet = workbook.worksheets.getOrAdd("Start Here", { renameFirstIfOnlyNewSpreadsheet: true });
  const generated = new Date();
  const metricRows = [
    ["Metric", "Value", "Use"],
    ["Total records", "", "Full source index"],
    ["Chronology records", "", "Date-sorted declassified reading order"],
    ["Action queue rows", "", "Ranked next compiler work"],
    ["Citation desk rows", "", "Source-note and declassification repair"],
    ["Clinton Library pull rows", "", "Onsite request worksheet"],
    ["Daily Diary chase rows", "", "Chronology leads to chase into substance"],
    ["Coverage matrix rows", "", "Ally, institution, treaty, and crisis-balance controls"],
    ["Gap/risk rows", "", "Coverage-balancing review"]
  ];

  sheet.getRange("A1:H1").values = [["FRUS Volume XVII Compiler Workbook", "", "", "", "", "", "", ""]];
  sheet.getRange("A3:B6").values = [
    ["Generated", generated],
    ["Live site", "https://therealjameswilson.github.io/Clinton-NATO-European-Security/"],
    ["Volume", "FRUS 1993-2000, Volume XVII, North Atlantic Treaty Organization; European Security"],
    ["Working rule", "Use diary/folder/title leads only to chase substantive records with dates, page spans, markings, and source-note paths."]
  ];
  sheet.getRange("A8:C16").values = metricRows;
  sheet.getRange("B9:B16").formulas = [
    [`=COUNTA('Records Index'!A5:A${data.recordsIndex.length + 4})`],
    [`=COUNTA(Chronology!A5:A${data.chronology.length + 4})`],
    [`=COUNTA('Action Queue'!A5:A${data.actionQueue.length + 4})`],
    [`=COUNTA('Citation Desk'!A5:A${data.citationDesk.length + 4})`],
    [`=COUNTA('Clinton Pulls'!A5:A${data.clintonPulls.length + 4})`],
    [`=COUNTA('Diary Chases'!A5:A${data.diaryChases.length + 4})`],
    [`=COUNTA('Coverage Matrix'!A5:A${data.coverageMatrix.length + 4})`],
    [`=COUNTA('Gap Risks'!A5:A${data.gapRows.length + 4})`]
  ];

  const typeCounts = Object.entries(countsBy(data.records, (record) => record.type)).sort((a, b) => b[1] - a[1]);
  const yearCounts = Object.entries(countsBy(data.chronology, (row) => String(row.date || "").slice(0, 4))).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  sheet.getRange(`E8:F${8 + typeCounts.length}`).values = [["Record Type", "Count"], ...typeCounts];
  sheet.getRange(`E18:F${18 + yearCounts.length}`).values = [["Chronology Year", "Count"], ...yearCounts];

  sheet.getRange("A1:H1").format.fill = "accent1";
  sheet.getRange("A1:H1").format.font = { color: "lt1", bold: true, size: 18 };
  sheet.getRange("A3:B6").format.fill = "lt2";
  sheet.getRange("A8:C8").format.fill = "accent2";
  sheet.getRange("A8:C8").format.font = { color: "lt1", bold: true };
  sheet.getRange("E8:F8").format.fill = "accent2";
  sheet.getRange("E18:F18").format.fill = "accent2";
  sheet.getRange("E8:F8").format.font = { color: "lt1", bold: true };
  sheet.getRange("E18:F18").format.font = { color: "lt1", bold: true };
  sheet.getRange("A:H").format.columnWidthPx = 170;
  sheet.getRange("C:C").format.columnWidthPx = 360;
  sheet.getRange("A3:H30").format.wrapText = true;
  sheet.getRange("B3").format.numberFormat = "yyyy-mm-dd hh:mm";
  sheet.freezePanes.freezeRows(2);

  sheet.charts.add("bar", {
    title: "Records by Type",
    categories: typeCounts.map(([label]) => label),
    series: [{ name: "Records", values: typeCounts.map(([, count]) => count) }],
    barOptions: { direction: "column", grouping: "clustered", gapWidth: 95 },
    dataLabels: { showValue: true, position: "outEnd" },
    from: { row: 7, col: 7 },
    extent: { widthPx: 440, heightPx: 250 }
  });

  sheet.charts.add("bar", {
    title: "Chronology by Year",
    categories: yearCounts.map(([label]) => label),
    series: [{ name: "Chronology records", values: yearCounts.map(([, count]) => count) }],
    barOptions: { direction: "column", grouping: "clustered", gapWidth: 90 },
    dataLabels: { showValue: true, position: "outEnd" },
    from: { row: 20, col: 7 },
    extent: { widthPx: 440, heightPx: 250 }
  });
}

async function main() {
  const records = await readJson("data/records.json");
  const chronology = await readCsv("reports/declassified-document-chronology.csv");
  const clintonPulls = await readCsv("reports/clinton-library-pull-sheet.csv");
  const diaryChases = await readCsv("reports/presidential-daily-diary-chase-sheet.csv");
  const coverageMatrix = await readCsv("reports/coverage-matrix.csv");
  const gapReport = await readJson("reports/compiler-gap-analysis.json");
  const sourceAudit = await readJson("reports/source-note-style-audit.json");
  const actionQueue = buildActionQueue(records);
  const citationDesk = buildCitationDesk(records);
  const indexRows = recordsIndex(records);
  const gaps = gapRows(gapReport);
  const auditRows = sourceAuditRows(sourceAudit);

  const workbook = Workbook.create();
  workbook.setColorScheme({
    name: "FRUS Compiler",
    themeColors: {
      accent1: "#25364F",
      accent2: "#2F675F",
      accent3: "#B84A3A",
      accent4: "#D3A93B",
      accent5: "#7F8FA6",
      accent6: "#6C6A61",
      lt1: "#FFFFFF",
      lt2: "#EEF2F6",
      dk1: "#182236",
      dk2: "#364050",
      hlink: "#1D4F91",
      folHlink: "#6B4E8A"
    }
  });

  addDataSheet(workbook, "Chronology", "Date-sorted declassified reading order; start here for sequence and source review.", chronology, [
    { key: "date", header: "Date", type: "date", width: 95 },
    { key: "washington_time", header: "Washington Time", width: 110 },
    { key: "type", header: "Type", width: 110 },
    { key: "title", header: "Title", width: 330 },
    { key: "participants", header: "Participants", width: 240 },
    { key: "countries", header: "Countries", width: 220 },
    { key: "chapter", header: "Chapter", width: 220 },
    { key: "selection_decision", header: "Selection Decision", width: 160 },
    { key: "declassification", header: "Declassification", width: 180 },
    { key: "source_id", header: "Source ID", width: 260 },
    { key: "source_pages", header: "Source Pages", width: 120 },
    { key: "next_action", header: "Next Action", width: 360 },
    { key: "catalog_url", header: "Catalog URL", width: 260 },
    { key: "pdf_url", header: "PDF URL", width: 260 },
    { key: "source_note", header: "Source Note", width: 420 }
  ]);

  addDataSheet(
    workbook,
    "Action Queue",
    "Ranked work queue for promotion, source repair, diary chase, and coverage balancing.",
    actionQueue,
    ACTION_QUEUE_COLUMNS
  );

  addDataSheet(
    workbook,
    "Citation Desk",
    "Working first-note drafts and source-note repair targets.",
    citationDesk,
    CITATION_DESK_COLUMNS
  );

  addDataSheet(workbook, "Clinton Pulls", "Onsite Clinton Library request and same-day decision log.", clintonPulls, [
    { key: "pull_order", header: "Pull Order", width: 90 },
    { key: "request_timing", header: "Request Timing", width: 220 },
    { key: "batch_priority", header: "Batch Priority", width: 150 },
    { key: "batch_title", header: "Batch Title", width: 270 },
    { key: "oa_id", header: "OA/ID", width: 100 },
    { key: "folder_title", header: "Folder Title", width: 360 },
    { key: "office_or_staff_file", header: "Office or Staff File", width: 260 },
    { key: "finding_aid_part", header: "Finding Aid Part", width: 120 },
    { key: "research_value", header: "Research Value", width: 260 },
    { key: "onsite_action", header: "Onsite Action", width: 360 },
    { key: "request_status", header: "Request Status", width: 150 },
    { key: "withdrawal_or_redaction_notes", header: "Withdrawal or Redaction Notes", width: 260 },
    { key: "documents_promoted_to_volume", header: "Documents Promoted", width: 180 },
    { key: "same_day_decision", header: "Same-Day Decision", width: 180 },
    { key: "compiler_notes", header: "Compiler Notes", width: 280 }
  ]);

  addDataSheet(workbook, "Diary Chases", "Presidential Daily Diary chronology leads to chase into substantive records.", diaryChases, [
    { key: "chase_order", header: "Chase Order", width: 90 },
    { key: "priority", header: "Priority", width: 120 },
    { key: "event_type", header: "Event Type", width: 180 },
    { key: "date", header: "Date", type: "date", width: 95 },
    { key: "diary_reference", header: "Diary Reference", width: 340 },
    { key: "source_pages", header: "Source Pages", width: 130 },
    { key: "naid", header: "NAID", width: 120 },
    { key: "release", header: "Release", width: 150 },
    { key: "participants", header: "Participants", width: 280 },
    { key: "topics", header: "Topics", width: 250 },
    { key: "compiler_use", header: "Compiler Use", width: 350 },
    { key: "chase_target", header: "Chase Target", width: 360 },
    { key: "source_control", header: "Source Control", width: 330 },
    { key: "catalog_url", header: "Catalog URL", width: 260 },
    { key: "pdf_url", header: "PDF URL", width: 260 },
    { key: "substantive_record_found", header: "Substantive Record Found", width: 180 },
    { key: "memcon_telcon_or_trip_file", header: "Memcon/Telcon/Trip File", width: 220 },
    { key: "source_note_verified", header: "Source Note Verified", width: 180 },
    { key: "final_selection_decision", header: "Final Selection Decision", width: 190 },
    { key: "compiler_notes", header: "Compiler Notes", width: 280 }
  ]);

  addDataSheet(workbook, "Gap Risks", "Coverage gaps, risk findings, and topic-coverage warnings.", gaps, [
    { key: "section", header: "Section", width: 130 },
    { key: "id", header: "ID", width: 180 },
    { key: "status", header: "Status", width: 150 },
    { key: "label", header: "Finding or Topic", width: 330 },
    { key: "count", header: "Count", type: "number", width: 90 },
    { key: "threshold", header: "Threshold", type: "number", width: 100 },
    { key: "evidence", header: "Evidence or Caveat", width: 420 },
    { key: "action", header: "Action", width: 420 }
  ]);

  addDataSheet(workbook, "Coverage Matrix", "Ally, institution, treaty, and crisis-balance coverage controls.", coverageMatrix, [
    { key: "category", header: "Category", width: 130 },
    { key: "id", header: "ID", width: 170 },
    { key: "label", header: "Coverage Dimension", width: 320 },
    { key: "status", header: "Status", width: 160 },
    { key: "minimum_records", header: "Minimum", type: "number", width: 90 },
    { key: "direct_document_minimum", header: "Direct Minimum", type: "number", width: 120 },
    { key: "maximum_records", header: "Maximum", type: "number", width: 95 },
    { key: "total_records", header: "Total Records", type: "number", width: 105 },
    { key: "document_records", header: "Direct Docs", type: "number", width: 100 },
    { key: "conversation_records", header: "Memcons/Telcons", type: "number", width: 150 },
    { key: "release_packets", header: "Release Packets", type: "number", width: 135 },
    { key: "context_records", header: "Context", type: "number", width: 90 },
    { key: "scout_leads", header: "Scout Leads", type: "number", width: 100 },
    { key: "source_leads", header: "Source Leads", type: "number", width: 100 },
    { key: "include_candidates", header: "Include Candidates", type: "number", width: 130 },
    { key: "context_candidates", header: "Context Candidates", type: "number", width: 130 },
    { key: "pending_selection", header: "Pending Selection", type: "number", width: 125 },
    { key: "needs_source", header: "Needs Source", type: "number", width: 105 },
    { key: "needs_chronology", header: "Needs Chronology", type: "number", width: 130 },
    { key: "needs_declass", header: "Needs Declass", type: "number", width: 110 },
    { key: "crisis_lane", header: "Crisis Lane", type: "number", width: 100 },
    { key: "non_crisis_lane", header: "Non-Crisis Lane", type: "number", width: 125 },
    { key: "first_date", header: "First Date", type: "date", width: 95 },
    { key: "last_date", header: "Last Date", type: "date", width: 95 },
    { key: "years_covered", header: "Years Covered", width: 210 },
    { key: "chapter_mix", header: "Chapter Mix", width: 340 },
    { key: "type_mix", header: "Type Mix", width: 300 },
    { key: "top_sources", header: "Top Sources", width: 340 },
    { key: "next_action", header: "Next Action", width: 420 },
    { key: "sample_records", header: "Sample Records", width: 520 },
    { key: "search_pattern", header: "Search Pattern", width: 260 }
  ]);

  addDataSheet(workbook, "Source Audit", "Source-note model checks, counts, and repair actions.", auditRows, [
    { key: "section", header: "Section", width: 120 },
    { key: "label", header: "Label", width: 260 },
    { key: "value", header: "Value", width: 220 },
    { key: "detail", header: "Detail", width: 520 }
  ]);

  addDataSheet(workbook, "Records Index", "Full source index with compact production status and links.", indexRows, [
    { key: "id", header: "ID", width: 190 },
    { key: "date", header: "Date", type: "date", width: 95 },
    { key: "type", header: "Type", width: 110 },
    { key: "title", header: "Title", width: 340 },
    { key: "chapter", header: "Chapter", width: 220 },
    { key: "selection_decision", header: "Selection Decision", width: 160 },
    { key: "release_status", header: "Release Status", width: 150 },
    { key: "declassification_status", header: "Declass Status", width: 170 },
    { key: "production_issues", header: "Production Issues", width: 200 },
    { key: "source_name", header: "Source Name", width: 280 },
    { key: "source_case", header: "Source Case", width: 180 },
    { key: "source_pages", header: "Source Pages", width: 130 },
    { key: "catalog_url", header: "Catalog URL", width: 260 },
    { key: "pdf_url", header: "PDF URL", width: 260 },
    { key: "next_action", header: "Next Action", width: 360 }
  ]);

  addDashboard(workbook, {
    records,
    chronology,
    actionQueue,
    citationDesk,
    clintonPulls,
    diaryChases,
    coverageMatrix,
    recordsIndex: indexRows,
    gapRows: gaps
  });

  workbook.recalculate();
  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await fs.writeFile(ACTION_QUEUE_CSV_PATH, `${toCsv(actionQueue, ACTION_QUEUE_COLUMNS)}\n`);
  await fs.writeFile(CITATION_DESK_CSV_PATH, `${toCsv(citationDesk, CITATION_DESK_COLUMNS)}\n`);
  await output.save(WORKBOOK_PATH);
  await output.save(OUTPUT_WORKBOOK_PATH);
  console.log(
    `Wrote ${path.relative(ROOT, WORKBOOK_PATH)}, ${path.relative(ROOT, ACTION_QUEUE_CSV_PATH)}, ${path.relative(
      ROOT,
      CITATION_DESK_CSV_PATH
    )}, and ${path.relative(ROOT, OUTPUT_WORKBOOK_PATH)}.`
  );
  console.log(
    JSON.stringify(
      {
        records: records.length,
        chronology: chronology.length,
        actionQueue: actionQueue.length,
        citationDesk: citationDesk.length,
        clintonPulls: clintonPulls.length,
        diaryChases: diaryChases.length,
        coverageMatrix: coverageMatrix.length,
        gapRows: gaps.length,
        sourceAuditRows: auditRows.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
