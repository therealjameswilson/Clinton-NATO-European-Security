#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "records.json");
const REPORT_DIR = path.join(ROOT, "reports");
const CSV_PATH = path.join(REPORT_DIR, "hard-gap-pdf-triage.csv");
const JSON_PATH = path.join(REPORT_DIR, "hard-gap-pdf-triage.json");
const MD_PATH = path.join(REPORT_DIR, "hard-gap-pdf-triage.md");

const TRIAGE = {
  "strobe-hardgap-july2024-C09000039": {
    order: 1,
    lane: "Promote first",
    gapCredit: "CFE direct; NATO-Russia drafting",
    decision: "Include candidate",
    evidence: "Additional CFE elements for the NATO-Russia document; useful for tracing adapted-CFE language in the Founding Act track.",
    blocker: "Verify actual document date and attachment structure before final chronology.",
    action: "Promote as a document-level CFE/NATO-Russia drafting record; capture author/date from the PDF image."
  },
  "strobe-hardgap-july2024-C09000043": {
    order: 2,
    lane: "Promote first",
    gapCredit: "CFE direct; Russian counter-proposal",
    decision: "Include candidate",
    evidence: "Precis of Russian counter-proposal for adapting CFE; directly addresses CFE negotiation substance.",
    blocker: "Verify date, author, and whether the precis is an attachment or standalone paper.",
    action: "Promote as a priority CFE adaptation lead; connect to NATO-Russia framework drafting."
  },
  "strobe-hardgap-oct2024-C09000035": {
    order: 3,
    lane: "Promote first",
    gapCredit: "CFE direct; Secretary-level retrospective",
    decision: "Include candidate",
    evidence: "Confidential memorandum on the CFE Review Conference with attachments and retrospective negotiation analysis.",
    blocker: "Confirm whether the attachment or covering memo is the selectable document.",
    action: "Promote the strongest dated CFE retrospective/summary item and preserve attachment accounting."
  },
  "strobe-hardgap-feb2024-C09000026": {
    order: 4,
    lane: "Promote first",
    gapCredit: "CFE direct; Kyiv/Ukraine cable",
    decision: "Include candidate",
    evidence: "Telegram subject is CFE Treaty, with CFE/TAGS and Ukraine-Russia troop-presence implications.",
    blocker: "Extract cable metadata, addressees, and full date line.",
    action: "Promote as CFE Treaty direct evidence if the full cable confirms policy discussion rather than only reporting."
  },
  "strobe-hardgap-july2022-C09000060": {
    order: 5,
    lane: "Promote first",
    gapCredit: "NAC/USNATO direct; NATO-Russia",
    decision: "Include candidate",
    evidence: "USNATO cable records Talbott briefing the NAC after the Moscow summit and discusses Russia, Kosovo, Latvia, CFE, and NATO-Russia partnership.",
    blocker: "Extract cable number, release-in-part excisions, MRN, addressees, and date-time line.",
    action: "Promote as direct NAC/USNATO evidence; use in the NATO-Russia institutional lane."
  },
  "strobe-hardgap-july2022-C09000063": {
    order: 6,
    lane: "Promote first",
    gapCredit: "NAC/USNATO direct; Moscow summit",
    decision: "Include candidate",
    evidence: "USNATO 1314/EXDIS cable records Talbott briefing the NAC on the Moscow summit, ABM/NMD, NATO-Russia, and CFE.",
    blocker: "Record EXDIS/release-in-part details and declassification accounting.",
    action: "Promote as direct NAC/USNATO evidence; pair with Moscow summit memcons and strategic-stability files."
  },
  "strobe-hardgap-june2024-C09000017": {
    order: 7,
    lane: "Promote first",
    gapCredit: "NAC direct; Kosovo/Russia",
    decision: "Include candidate",
    evidence: "NAC intervention dated April 29, 1999, during Kosovo campaign diplomacy and Russia consultations.",
    blocker: "Verify whether the intervention was delivered text, talking points, or meeting note.",
    action: "Promote if delivered to/for NAC; otherwise retain as high-value Kosovo/NAC annotation support."
  },
  "strobe-hardgap-mar2023-C09000060": {
    order: 8,
    lane: "Promote after date/source check",
    gapCredit: "CFE support; enlargement diplomacy",
    decision: "Include candidate",
    evidence: "Draft Secretary letter to Central European counterparts links CFE modernization, NATO-Russia document, and Madrid enlargement diplomacy.",
    blocker: "Verify addressees, draft status, and actual date from source image.",
    action: "Promote after confirming whether the draft was sent or should be cited as a draft policy text."
  },
  "strobe-hardgap-july2024-C09000044": {
    order: 9,
    lane: "Promote after date/source check",
    gapCredit: "CFE support; Mamedov/GEM checklist",
    decision: "Include candidate",
    evidence: "Checklist notes need for Russian CFE counter-proposal before the April 10, 1997 GEM contact.",
    blocker: "Determine author, meeting context, and whether notes are selectable or annotation support.",
    action: "Use as a CFE/Mamedov chronology lead; promote only if source context is clear."
  },
  "strobe-hardgap-apr2023-C09000073": {
    order: 10,
    lane: "Promote after date/source check",
    gapCredit: "CFE support; Christopher/Yeltsin prep",
    decision: "Include candidate",
    evidence: "Talbott note to Christopher flags CFE and ABM/TMD before Yeltsin/Primakov-related preparations.",
    blocker: "Verify actual date, addressee, and placement in the Christopher/Yeltsin briefing sequence.",
    action: "Promote if the note frames CFE policy for Secretary-level discussion; otherwise use as annotation support."
  },
  "strobe-hardgap-sep2022-C09000027": {
    order: 11,
    lane: "Promote after date/source check",
    gapCredit: "CFE support; rollout planning",
    decision: "Include candidate",
    evidence: "One-page CFE rollout meeting note says CFE is a key next step in Euro-security.",
    blocker: "Verify date, attendees, and meeting ownership.",
    action: "Promote if meeting context can be established; otherwise use as a lead to interagency rollout files."
  },
  "strobe-hardgap-july2024-C09000038": {
    order: 12,
    lane: "Annotation/context",
    gapCredit: "NAC/Madrid chronology support",
    decision: "Context candidate",
    evidence: "Two-page Madrid timeline chart maps MC/CS, NATO-Russia summit, NAC ministerial, NAC/D, and NATO summit milestones.",
    blocker: "Date remains inferred from release/manifest rather than a document date.",
    action: "Use for Madrid chronology/annotation unless a source image or companion file proves authorship and date."
  },
  "strobe-hardgap-feb2024-C09000122": {
    order: 13,
    lane: "Annotation/context",
    gapCredit: "NAC/NATO-Russia interpretation",
    decision: "Context candidate",
    evidence: "Talbott notes on a Kissinger piece explain that NATO remains NATO, the NAC remains NAC, and Russia is not in either.",
    blocker: "Likely analytical/commentary support rather than a decision document.",
    action: "Use for annotation or narrative context unless provenance shows direct policy-drafting value."
  }
};

const COLUMNS = [
  "triage_order",
  "record_id",
  "promotion_lane",
  "direct_gap_credit",
  "recommended_decision",
  "date",
  "date_status",
  "type",
  "title",
  "chapter",
  "classification",
  "source_pages",
  "page_count",
  "source_ready",
  "evidence_summary",
  "blocking_issue",
  "next_compiler_action",
  "source_note",
  "pdf_url"
];

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows) {
  return [COLUMNS.join(","), ...rows.map((row) => COLUMNS.map((column) => csvEscape(row[column])).join(","))].join("\n");
}

function mdCell(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

function markdownTable(rows) {
  const columns = [
    ["Order", "triage_order"],
    ["Lane", "promotion_lane"],
    ["Gap Credit", "direct_gap_credit"],
    ["Date", "date"],
    ["Title", "title"],
    ["Next Action", "next_compiler_action"]
  ];
  return [
    `| ${columns.map(([header]) => header).join(" | ")} |`,
    `| ${columns.map(([, key]) => (key === "triage_order" ? "---:" : "---")).join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map(([, key]) => mdCell(row[key])).join(" | ")} |`)
  ].join("\n");
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    counts[row[key]] = (counts[row[key]] || 0) + 1;
    return counts;
  }, {});
}

function sourceReady(record) {
  const parts = [];
  if (record.sourceNote?.startsWith("Source:")) parts.push("Source note");
  if (record.originalClassification) parts.push("Marking");
  if (record.pageCount && record.sourcePages) parts.push("Page count");
  return parts.join("; ");
}

function main() {
  const records = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const hardGapRecords = records.filter((record) => /^strobe-hardgap-/.test(record.id || ""));
  const missing = Object.keys(TRIAGE).filter((id) => !hardGapRecords.some((record) => record.id === id));
  if (missing.length) throw new Error(`Missing hard-gap records: ${missing.join(", ")}`);

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const rows = hardGapRecords
    .map((record) => {
      const triage = TRIAGE[record.id];
      if (!triage) throw new Error(`Missing triage config for ${record.id}`);
      return {
        triage_order: triage.order,
        record_id: record.id,
        promotion_lane: triage.lane,
        direct_gap_credit: triage.gapCredit,
        recommended_decision: triage.decision,
        date: record.date || "",
        date_status: /date pending/i.test(record.dateLine || "") ? "date pending" : "date verified from record",
        type: record.type || "",
        title: record.title || "",
        chapter: record.chapter?.name || "",
        classification: record.originalClassification || "",
        source_pages: record.sourcePages || "",
        page_count: record.pageCount || "",
        source_ready: sourceReady(record),
        evidence_summary: triage.evidence,
        blocking_issue: triage.blocker,
        next_compiler_action: triage.action,
        source_note: record.sourceNote || "",
        pdf_url: record.pdfUrl || record.catalogUrl || ""
      };
    })
    .sort((a, b) => a.triage_order - b.triage_order);

  const report = {
    generatedAt: new Date().toISOString(),
    basis:
      "Compiler triage of release-qualified Strobe Talbott FOIA hard-gap PDFs after source markings and PDF page counts were extracted.",
    counts: {
      total: rows.length,
      byPromotionLane: countBy(rows, "promotion_lane"),
      byGapCredit: countBy(rows, "direct_gap_credit"),
      sourceReady: rows.filter((row) => /Source note/.test(row.source_ready) && /Marking/.test(row.source_ready) && /Page count/.test(row.source_ready)).length
    },
    rows
  };

  const md = [
    "# Hard-Gap PDF Triage",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "This report turns the release-qualified Strobe Talbott FOIA hard-gap PDFs into a promotion worksheet. It does not make final FRUS selections; it tells the compiler which PDFs should be promoted first, which need date/source-context checks, and which are better used as annotation or chronology support.",
    "",
    "## Counts",
    "",
    `- Total hard-gap PDFs triaged: ${report.counts.total}`,
    `- Promote first: ${report.counts.byPromotionLane["Promote first"] || 0}`,
    `- Promote after date/source check: ${report.counts.byPromotionLane["Promote after date/source check"] || 0}`,
    `- Annotation/context: ${report.counts.byPromotionLane["Annotation/context"] || 0}`,
    `- Source-note, marking, and page-count ready: ${report.counts.sourceReady}`,
    "",
    "## Triage Rows",
    "",
    markdownTable(rows),
    ""
  ].join("\n");

  fs.writeFileSync(CSV_PATH, `${toCsv(rows)}\n`);
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_PATH, `${md}\n`);
  console.log(`Wrote ${path.relative(ROOT, CSV_PATH)}, ${path.relative(ROOT, JSON_PATH)}, and ${path.relative(ROOT, MD_PATH)}.`);
  console.log(JSON.stringify(report.counts, null, 2));
}

main();
