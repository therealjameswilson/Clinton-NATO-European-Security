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
  /\b(Top Secret|Secret|Confidential|Sensitive|Eyes Only|Nodis|No Foreign|Limited Official Use|Unclassified|P\d\/b\(\d\)|E\.O\.)\b/i;
const PRODUCTION_PATTERN =
  /\b(Compiler should|verify|pending|replace|sample only|not yet audited|page audit|page count audit|dedup\/exclusion|strobe foia review|not counted again|duplicate source copy|No .* text was found|excluded)\b/i;
const URL_PATTERN = /https?:\/\//i;

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
  if (!CLASSIFICATION_PATTERN.test(note) && !CLASSIFICATION_PATTERN.test(reviewNote)) issues.push("needs-markings");
  if (record.type === "Scout Lead" && !record.pageCount && !record.sourcePages) issues.push("file-unit-not-document-level");
  if (!sourceIdentifier(record).length && !/Item\s+\d+|Document\s+\S+|NAID\s+\d+|PPP-\d{4}/i.test(note)) issues.push("missing-item-identifier");
  if (reviewNote && PRODUCTION_PATTERN.test(reviewNote)) issues.push("review-note-not-source-note");
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
    reviewNotesWithProductionLanguage: issueCounts["review-note-not-source-note"] || 0,
    notesNeedingMarkings: issueCounts["needs-markings"] || 0,
    fileUnitNotDocumentLevel: issueCounts["file-unit-not-document-level"] || 0
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
      fileUnitNotDocumentLevel: sample(records, "file-unit-not-document-level"),
      rawUrlInSourceNote: sample(records, "raw-url-in-source-note"),
      reviewNoteNotSourceNote: sample(records, "review-note-not-source-note")
    },
    actions: [
      "Do not append compiler verification language to the displayed Source note.",
      "Normalize repository names: National Archives and Records Administration, National Archives Catalog; Department of State, FOIA Virtual Reading Room; William J. Clinton Presidential Library or FRUS-style Clinton Library shorthand.",
      "Capitalize Release, Item, and Document identifiers inside source notes.",
      "Replace raw source URLs in displayed Source notes with stable item, document, release, case, or NAID identifiers.",
      "Before treating an Include candidate as FRUS-ready, verify classification, handling markings, page span, drafting/clearance, marginalia, attachments, and excisions from the original image or PDF.",
      "Convert Scout Leads from file-unit source notes to document-level source notes only after onsite or digital-object inspection."
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
    `- File-unit Scout Leads still needing document-level source notes: ${counts.fileUnitNotDocumentLevel}`,
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
