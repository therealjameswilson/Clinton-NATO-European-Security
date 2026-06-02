#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "records.json");
const MATRIX_PATH = path.join(ROOT, "reports", "coverage-matrix.json");
const HARD_GAP_TRIAGE_PATH = path.join(ROOT, "reports", "hard-gap-pdf-triage.json");
const REPORT_DIR = path.join(ROOT, "reports");
const CSV_PATH = path.join(REPORT_DIR, "promotion-queue.csv");
const JSON_PATH = path.join(REPORT_DIR, "promotion-queue.json");
const MD_PATH = path.join(REPORT_DIR, "promotion-queue.md");

const STATUS_BONUS = {
  gap: 80,
  "direct-document gap": 55,
  overweight: 30,
  "selection watch": 24,
  "covered for triage": 10
};

const PRIORITY_BATCH_ORDER = [
  "First 40 Scout/Catalog extractions",
  "First 40 released-source triage",
  "Coverage-gap backlog",
  "Crisis split backlog",
  "Promotion backlog"
];

const HARD_GAP_LANE_ORDER = {
  "Promote first": 1,
  "Promote after date/source check": 2,
  "Annotation/context": 3
};

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function readHardGapTriage() {
  if (!fs.existsSync(HARD_GAP_TRIAGE_PATH)) return new Map();
  const report = JSON.parse(fs.readFileSync(HARD_GAP_TRIAGE_PATH, "utf8"));
  return new Map((report.rows || []).map((row) => [row.record_id, row]));
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

function textOf(record) {
  return [
    record.title,
    record.documentTitle,
    record.subjectLine,
    record.dateLine,
    record.sourceNote,
    record.sourceNoteAddendum,
    record.source?.name,
    record.source?.collection,
    record.source?.series,
    record.source?.fileUnit,
    record.source?.folder,
    record.source?.itemTitle,
    ...list(record.frusTopics),
    ...list(record.topics),
    ...list(record.indexTerms),
    ...list(record.participants),
    ...list(record.persons),
    ...list(record.countries),
    ...sourcePathParts(record)
  ]
    .filter(Boolean)
    .join(" ");
}

function promotionTextOf(record) {
  return [
    record.title,
    record.documentTitle,
    record.subjectLine,
    record.dateLine,
    record.sourceNote,
    record.sourceNoteAddendum,
    record.source?.name,
    record.source?.collection,
    record.source?.series,
    record.source?.fileUnit,
    record.source?.folder,
    record.source?.itemTitle,
    ...sourcePathParts(record)
  ]
    .filter(Boolean)
    .join(" ");
}

function compileMatrixPatterns(rows) {
  return rows
    .map((row) => {
      try {
        return { ...row, pattern: new RegExp(row.search_pattern, "i") };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function matchingTargets(record, matrixRows) {
  const text = promotionTextOf(record);
  return matrixRows.filter((row) => row.pattern.test(text));
}

function targetSummary(targets) {
  return targets.map((target) => `${target.label} (${target.status})`).join("; ");
}

function targetIds(targets) {
  return targets.map((target) => target.id).join("; ");
}

function highestTargetStatus(targets) {
  const order = ["gap", "direct-document gap", "overweight", "selection watch", "covered for triage"];
  return order.find((status) => targets.some((target) => target.status === status)) || "";
}

function scoreRecord(record, targets, hardGapTriage) {
  const targetBonus = targets.reduce((max, target) => Math.max(max, STATUS_BONUS[target.status] || 0), 0);
  const decision = record.selectionDecision || record.compilerDecision || "";
  const year = Number((record.sortDate || record.date || "").slice(0, 4));
  const sourceName = record.source?.name || "";
  const sourceText = sourcePathParts(record).join(" ");
  const hardGapBonus =
    hardGapTriage?.promotion_lane === "Promote first"
      ? 180
      : hardGapTriage?.promotion_lane === "Promote after date/source check"
        ? 120
        : hardGapTriage?.promotion_lane === "Annotation/context"
          ? 40
          : 0;

  return (
    (record.type === "Source Lead" ? 52 : 44) +
    hardGapBonus +
    targetBonus +
    Math.min(targets.length * 4, 16) +
    (/National Archives|NARA|Catalog/i.test(sourceName) ? 14 : 0) +
    (/National Archives|NARA|Catalog/i.test(sourceText) ? 8 : 0) +
    (record.pdfUrl || record.source?.pdfUrl ? 12 : 0) +
    (record.catalogUrl || record.source?.url ? 7 : 0) +
    (record.digitalObjects ? 5 : 0) +
    (decision === "Include candidate" ? 20 : decision === "Context candidate" ? 12 : decision === "Pending" ? 4 : 0) +
    (record.chapter?.name && record.chapter.name !== "Crisis Security Files" ? 16 : 0) +
    (Number.isFinite(year) && year >= 1997 ? 8 : 0) +
    (record.type === "Scout Lead" && /-01-01$/.test(record.sortDate || record.date || "") ? 8 : 0)
  );
}

function promotionAction(record, highestStatus, hardGapTriage) {
  if (hardGapTriage?.next_compiler_action) return hardGapTriage.next_compiler_action;
  if (record.type === "Source Lead") {
    return "Open released PDF, decide include/context/exclude, capture page span, markings, declassification status, and final source note.";
  }
  if (highestStatus === "gap" || highestStatus === "direct-document gap") {
    return "Open catalog PDF first; extract document-level item(s) that directly address the coverage gap with actual date, page span, markings, and source path.";
  }
  if (highestStatus === "overweight") {
    return "Open catalog PDF only to separate direct NATO decision material from crisis context or implementation background.";
  }
  return "Inspect digital object and promote only specific document-level items with dates, page spans, markings, and source path.";
}

function promotionGate(record, hardGapTriage) {
  if (hardGapTriage?.promotion_lane === "Promote first") return "hard-gap PDF promotion";
  if (hardGapTriage?.promotion_lane === "Promote after date/source check") return "hard-gap date/source check";
  if (hardGapTriage?.promotion_lane === "Annotation/context") return "hard-gap annotation/context";
  if (record.type === "Source Lead") return "released-source triage";
  return "file-unit extraction";
}

function rowFor(record, targets, score, hardGapTriage) {
  const highestStatus = highestTargetStatus(targets);
  return {
    record_id: record.id || "",
    score,
    source_type: record.type || "",
    sort_date: record.sortDate || record.date || "",
    title: record.documentTitle || record.title || "",
    chapter: record.chapter?.name || "",
    selection_decision: record.selectionDecision || record.compilerDecision || "",
    source_name: record.source?.name || "",
    source_path: sourcePathParts(record).join(" / "),
    coverage_status: highestStatus,
    coverage_targets: targetSummary(targets),
    coverage_target_ids: targetIds(targets),
    hard_gap_triage_order: hardGapTriage?.triage_order || "",
    hard_gap_promotion_lane: hardGapTriage?.promotion_lane || "",
    hard_gap_direct_credit: hardGapTriage?.direct_gap_credit || "",
    hard_gap_decision: hardGapTriage?.recommended_decision || "",
    hard_gap_blocking_issue: hardGapTriage?.blocking_issue || "",
    source_ready: hardGapTriage?.source_ready || "",
    promotion_gate: promotionGate(record, hardGapTriage),
    next_action: promotionAction(record, highestStatus, hardGapTriage),
    catalog_url: record.catalogUrl || record.source?.url || "",
    pdf_url: record.pdfUrl || record.source?.pdfUrl || "",
    source_note_draft: record.sourceNote || "",
    inspection_status: "",
    actual_document_date: "",
    document_page_span: "",
    markings_verified: "",
    source_note_verified: "",
    promoted_record_id: "",
    compiler_decision: "",
    compiler_notes: ""
  };
}

function byCandidatePriority(a, b) {
  return (
    b.score - a.score ||
    (a.sort_date || "").localeCompare(b.sort_date || "") ||
    (a.title || "").localeCompare(b.title || "")
  );
}

function hardGapLaneRank(row) {
  if (!row.hard_gap_promotion_lane) return 99;
  return HARD_GAP_LANE_ORDER[row.hard_gap_promotion_lane] || 90;
}

function bySourcePriority(a, b) {
  const hardGapDelta = hardGapLaneRank(a) - hardGapLaneRank(b);
  if (hardGapDelta) return hardGapDelta;
  const orderA = Number(a.hard_gap_triage_order) || 999;
  const orderB = Number(b.hard_gap_triage_order) || 999;
  return orderA - orderB || byCandidatePriority(a, b);
}

function batchRank(row) {
  if (row.priority_batch === "First 40 Scout/Catalog extractions") return Number(row.scout_top_40_rank) || 9999;
  if (row.priority_batch === "First 40 released-source triage") return Number(row.source_triage_rank) || 9999;
  return 9999;
}

function assignRanks(rows) {
  const scoutRows = rows.filter((row) => row.source_type === "Scout Lead").sort(byCandidatePriority);
  const sourceRows = rows.filter((row) => row.source_type === "Source Lead").sort(bySourcePriority);
  const scoutRank = new Map(scoutRows.map((row, index) => [row.record_id, index + 1]));
  const sourceRank = new Map(sourceRows.map((row, index) => [row.record_id, index + 1]));

  const ranked = rows.map((row) => {
    const scout_top_40_rank = scoutRank.get(row.record_id) || "";
    const source_triage_rank = sourceRank.get(row.record_id) || "";
    const priority_batch =
      scout_top_40_rank && scout_top_40_rank <= 40
        ? "First 40 Scout/Catalog extractions"
        : source_triage_rank && source_triage_rank <= 40
          ? "First 40 released-source triage"
          : ["gap", "direct-document gap"].includes(row.coverage_status)
            ? "Coverage-gap backlog"
            : row.coverage_status === "overweight"
              ? "Crisis split backlog"
            : "Promotion backlog";

    return {
      ...row,
      scout_top_40_rank,
      source_triage_rank,
      priority_batch
    };
  });

  return ranked
    .sort((a, b) => {
      const batchDelta = PRIORITY_BATCH_ORDER.indexOf(a.priority_batch) - PRIORITY_BATCH_ORDER.indexOf(b.priority_batch);
      return batchDelta || batchRank(a) - batchRank(b) || byCandidatePriority(a, b);
    })
    .map((row, index) => ({ promotion_order: index + 1, ...row }));
}

function countBy(rows, getter) {
  return rows.reduce((counts, row) => {
    const key = getter(row) || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ].join("\n");
}

function mdEscape(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function markdownTable(rows) {
  const columns = [
    ["Order", "promotion_order"],
    ["Scout 40", "scout_top_40_rank"],
    ["Source 40", "source_triage_rank"],
    ["Hard Gap", "hard_gap_promotion_lane"],
    ["Triage", "hard_gap_triage_order"],
    ["Status", "coverage_status"],
    ["Date", "sort_date"],
    ["Type", "source_type"],
    ["Title", "title"],
    ["Next Action", "next_action"]
  ];
  return [
    `| ${columns.map(([header]) => header).join(" | ")} |`,
    `| ${columns.map(([, key]) => (/(order|rank)$/i.test(key) ? "---:" : "---")).join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map(([, key]) => mdEscape(row[key])).join(" | ")} |`)
  ].join("\n");
}

function main() {
  const records = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, "utf8"));
  const hardGapTriageById = readHardGapTriage();
  const matrixRows = compileMatrixPatterns(matrix.rows || []);
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const candidates = records
    .filter((record) => record.type === "Scout Lead" || record.type === "Source Lead")
    .map((record) => {
      const targets = matchingTargets(record, matrixRows);
      const hardGapTriage = hardGapTriageById.get(record.id);
      return rowFor(record, targets, scoreRecord(record, targets, hardGapTriage), hardGapTriage);
    });
  const rows = assignRanks(candidates);
  const statusCounts = countBy(rows, (row) => row.coverage_status || "no matrix target");
  const batchCounts = countBy(rows, (row) => row.priority_batch);

  const columns = [
    "promotion_order",
    "priority_batch",
    "scout_top_40_rank",
    "source_triage_rank",
    "record_id",
    "score",
    "source_type",
    "sort_date",
    "title",
    "chapter",
    "selection_decision",
    "source_name",
    "source_path",
    "coverage_status",
    "coverage_targets",
    "coverage_target_ids",
    "hard_gap_triage_order",
    "hard_gap_promotion_lane",
    "hard_gap_direct_credit",
    "hard_gap_decision",
    "hard_gap_blocking_issue",
    "source_ready",
    "promotion_gate",
    "next_action",
    "catalog_url",
    "pdf_url",
    "source_note_draft",
    "inspection_status",
    "actual_document_date",
    "document_page_span",
    "markings_verified",
    "source_note_verified",
    "promoted_record_id",
    "compiler_decision",
    "compiler_notes"
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    recordCount: records.length,
    candidateCount: rows.length,
    scoutLeadCount: rows.filter((row) => row.source_type === "Scout Lead").length,
    sourceLeadCount: rows.filter((row) => row.source_type === "Source Lead").length,
    statusCounts,
    batchCounts,
    hardGapTriageCounts: countBy(rows.filter((row) => row.hard_gap_promotion_lane), (row) => row.hard_gap_promotion_lane),
    basis: "Promotion queue generated from data/records.json, reports/coverage-matrix.json, and reports/hard-gap-pdf-triage.json to operationalize Scout/Catalog extraction and released-source promotion.",
    rows
  };

  fs.writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(CSV_PATH, `${toCsv(rows, columns)}\n`);

  const topScout = rows.filter((row) => row.scout_top_40_rank && row.scout_top_40_rank <= 40);
  const topSources = rows.filter((row) => row.source_triage_rank && row.source_triage_rank <= 40);
  const md = [
    "# Promotion Queue",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Candidate count: ${rows.length} (${report.scoutLeadCount} Scout Leads; ${report.sourceLeadCount} Source Leads).`,
    "",
    "This queue turns file-unit and released-source leads into a worksheet for promotion into document-level FRUS evidence. The first batch is the top 40 Scout/Catalog extractions; the second batch is the top 40 released-source triage targets, ordered first by the hard-gap PDF triage lanes. The CSV/workbook expose hard-gap lane, direct gap credit, blocking issue, source readiness, inspection status, actual document date, page span, markings, source-note verification, promoted record ID, and final compiler decision.",
    "",
    "## Batch Counts",
    "",
    ...Object.entries(batchCounts).map(([batch, count]) => `- ${batch}: ${count}`),
    "",
    "## Coverage Status Counts",
    "",
    ...Object.entries(statusCounts).map(([status, count]) => `- ${status}: ${count}`),
    "",
    "## Hard-Gap PDF Triage In Queue",
    "",
    ...Object.entries(report.hardGapTriageCounts).map(([lane, count]) => `- ${lane}: ${count}`),
    "",
    "## First 40 Scout/Catalog Extractions",
    "",
    markdownTable(topScout),
    "",
    "## First 40 Released-Source Triage Targets",
    "",
    markdownTable(topSources),
    ""
  ].join("\n");
  fs.writeFileSync(MD_PATH, md);

  console.log(`Wrote ${path.relative(ROOT, CSV_PATH)}, ${path.relative(ROOT, JSON_PATH)}, and ${path.relative(ROOT, MD_PATH)}.`);
  console.log(
    JSON.stringify(
      {
        records: records.length,
        candidates: rows.length,
        scoutLeads: report.scoutLeadCount,
        sourceLeads: report.sourceLeadCount,
        batchCounts,
        statusCounts
      },
      null,
      2
    )
  );
}

main();
