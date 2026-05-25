#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "records.json");
const REPORT_DIR = path.join(ROOT, "reports");
const JSON_PATH = path.join(REPORT_DIR, "source-note-style-audit.json");
const MD_PATH = path.join(REPORT_DIR, "source-note-style-audit.md");

const FRUS_MODEL = [
  {
    label: "FRUS 1989-1992, Volume XXXI, Document 1",
    url: "https://history.state.gov/historicaldocuments/frus1989-92v31/d1",
    pattern:
      "Source path; classification and handling markings; drafting, marginalia, attachment, or copy-context detail."
  },
  {
    label: "FRUS 1989-1992, Volume XXXI, Document 10",
    url: "https://history.state.gov/historicaldocuments/frus1989-92v31/d10",
    pattern: "Source path; classification."
  },
  {
    label: "FRUS 1989-1992, Volume XXXI, Document 50",
    url: "https://history.state.gov/historicaldocuments/frus1989-92v31/d50",
    pattern: "Source path; classification; meeting-location context."
  }
];

const CLASSIFICATION_PATTERN =
  /\b(Top Secret|Secret|Confidential|Sensitive|Eyes Only|Nodis|No Foreign|Limited Official Use|Unclassified|No classification marking|P\d\/b\(\d\)|E\.O\.)\b/i;
const PRODUCTION_PATTERN =
  /\b(Compiler should|verify|pending|replace|sample only|not yet audited|page audit|page count audit|dedup\/exclusion|strobe foia review|not counted again|duplicate source copy|No .* text was found|excluded)\b/i;
const URL_PATTERN = /https?:\/\//i;
const NO_RELEASED_TEXT_PATTERN = /\bNo released\b|\bnot located\b|\bno .*pages located\b/i;

function countBy(records, keyFn) {
  return records.reduce((counts, record) => {
    const key = keyFn(record);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function hasSourcePath(note) {
  return /^Source:\s+\S.+,\s+\S/.test(note || "");
}

function sourceIdentifier(record) {
  return [
    record.naid ? `NAID ${record.naid}` : "",
    record.source?.documentId ? `Document ${record.source.documentId}` : "",
    record.source?.caseNumber ? `Case ${record.source.caseNumber}` : ""
  ].filter(Boolean);
}

function markingText(record) {
  return [
    record.sourceNote,
    record.originalClassification,
    ...(record.documentMarkings || []),
    ...(record.handlingMarkings || [])
  ]
    .filter(Boolean)
    .join(" ");
}

function needsDocumentLevelMarkings(record) {
  if (record.type === "Context") return false;
  if (NO_RELEASED_TEXT_PATTERN.test(record.sourcePages || "")) return false;
  if (/finding-aid summary/i.test(record.sourceNote || "") && !record.sourcePages && !record.pageCount) return false;
  if (record.type === "Scout Lead" && !record.pageCount && !record.sourcePages) return false;
  return true;
}

function issueList(record) {
  const note = record.sourceNote || "";
  const reviewNote = record.sourceNoteAddendum || "";
  const issues = [];
  if (!/^Source:\s+/.test(note)) issues.push("missing-source-prefix");
  if (!hasSourcePath(note)) issues.push("thin-source-path");
  if (/^Source: National Archives Catalog,/.test(note)) issues.push("unnormalized-nara-repository");
  if (/^Source: Department of State FOIA Virtual Reading Room,/.test(note)) issues.push("unnormalized-state-repository");
  if (/, (release|item|document) [^,.]+\./.test(note)) issues.push("lowercase-release-item-document");
  if (URL_PATTERN.test(note)) issues.push("raw-url-in-source-note");
  if (PRODUCTION_PATTERN.test(note)) issues.push("production-language-in-source-note");
  if (needsDocumentLevelMarkings(record) && !CLASSIFICATION_PATTERN.test(markingText(record))) issues.push("needs-markings");
  if (!sourceIdentifier(record).length && !/Item\s+\d+|Document\s+\S+|NAID\s+\d+|PPP-\d{4}/i.test(note)) issues.push("missing-item-identifier");
  return issues;
}

function sample(records, issue, limit = 10) {
  return records
    .filter((record) => issueList(record).includes(issue))
    .slice(0, limit)
    .map((record) => ({
      id: record.id,
      type: record.type,
      title: record.title,
      sourceNote: record.sourceNote,
      sourceNoteAddendum: record.sourceNoteAddendum || ""
    }));
}

function main() {
  const records = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const recordIssues = records.map((record) => ({ record, issues: issueList(record) }));
  const issueCounts = recordIssues.reduce((counts, item) => {
    for (const issue of item.issues) counts[issue] = (counts[issue] || 0) + 1;
    return counts;
  }, {});

  const counts = {
    total: records.length,
    bySource: countBy(records, (record) => record.source?.name || "Unknown"),
    byType: countBy(records, (record) => record.type),
    startsWithSource: records.filter((record) => /^Source:\s+/.test(record.sourceNote || "")).length,
    sourcePathPresent: records.filter((record) => hasSourcePath(record.sourceNote)).length,
    sourceNotesWithRawUrls: issueCounts["raw-url-in-source-note"] || 0,
    sourceNotesWithProductionLanguage: issueCounts["production-language-in-source-note"] || 0,
    reviewNotesWithProductionLanguage: records.filter((record) => PRODUCTION_PATTERN.test(record.sourceNoteAddendum || "")).length,
    notesNeedingMarkings: issueCounts["needs-markings"] || 0,
    scoutLeadsAwaitingDocumentSelection: records.filter((record) => record.type === "Scout Lead" && !record.pageCount && !record.sourcePages).length
  };

  const report = {
    generatedAt: new Date().toISOString(),
    model: FRUS_MODEL,
    styleRule:
      "Keep the displayed first footnote as a Source sentence only: repository and collection path first, exact folder/item identifier next, then classification/handling and document-context details when verified. Keep compiler warnings outside the Source sentence.",
    counts,
    issueCounts,
    samples: {
      needsMarkings: sample(records, "needs-markings"),
      scoutLeadsAwaitingDocumentSelection: records
        .filter((record) => record.type === "Scout Lead" && !record.pageCount && !record.sourcePages)
        .slice(0, 10)
        .map((record) => ({
          id: record.id,
          type: record.type,
          title: record.title,
          sourceNote: record.sourceNote,
          sourceNoteAddendum: record.sourceNoteAddendum || ""
        })),
      rawUrlInSourceNote: sample(records, "raw-url-in-source-note")
    },
    actions: [
      "Do not append compiler verification language to the displayed Source note.",
      "Normalize repository names: National Archives and Records Administration, National Archives Catalog; Department of State, FOIA Virtual Reading Room; William J. Clinton Presidential Library or FRUS-style Clinton Library shorthand.",
      "Capitalize Release, Item, and Document identifiers inside source notes.",
      "Replace raw source URLs in displayed Source notes with stable item, document, release, case, or NAID identifiers.",
      "Before treating an Include candidate as FRUS-ready, verify classification, handling markings, page span, drafting/clearance, marginalia, attachments, and excisions from the original image or PDF.",
      "Promote Scout Leads to document-level records only after digital-object inspection identifies a specific item for selection."
    ]
  };

  const md = [
    "# Source Note Style Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## FRUS Model",
    "",
    ...FRUS_MODEL.map((item) => `- [${item.label}](${item.url}): ${item.pattern}`),
    "",
    "## Rule Applied",
    "",
    report.styleRule,
    "",
    "## Counts",
    "",
    `- Records audited: ${counts.total}`,
    `- Notes beginning with \`Source:\`: ${counts.startsWithSource}`,
    `- Notes with a repository/path shape: ${counts.sourcePathPresent}`,
    `- Raw URLs inside displayed Source note: ${counts.sourceNotesWithRawUrls}`,
    `- Production language inside displayed Source note: ${counts.sourceNotesWithProductionLanguage}`,
    `- Production review notes kept outside Source note: ${counts.reviewNotesWithProductionLanguage}`,
    `- Notes still needing verified classification/handling/context details: ${counts.notesNeedingMarkings}`,
    `- Scout Leads retained as research backlog, not source-note style issues: ${counts.scoutLeadsAwaitingDocumentSelection}`,
    "",
    "## Issue Counts",
    "",
    "```json",
    JSON.stringify(issueCounts, null, 2),
    "```",
    "",
    "## Actions",
    "",
    ...report.actions.map((action, index) => `${index + 1}. ${action}`),
    ""
  ].join("\n");

  fs.writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_PATH, `${md}\n`);
  console.log(`Wrote ${path.relative(ROOT, JSON_PATH)} and ${path.relative(ROOT, MD_PATH)}.`);
}

main();
