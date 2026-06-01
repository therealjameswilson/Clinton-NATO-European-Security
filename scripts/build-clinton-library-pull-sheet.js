#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PLAN_PATH = path.join(ROOT, "reports", "clinton-library-research-plan.json");
const CSV_PATH = path.join(ROOT, "reports", "clinton-library-pull-sheet.csv");

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function requestTiming(priority) {
  if (/first pull if available/i.test(priority)) return "Pre-request with first pull if staff limits allow";
  if (/first pull/i.test(priority)) return "Pre-request before visit";
  if (/second pull/i.test(priority)) return "Request after policy-core review";
  if (/third pull/i.test(priority)) return "Request selectively after gap review";
  if (/control pull/i.test(priority)) return "Request after policy-file review";
  return "Request as onsite time allows";
}

function onsiteAction(batch, item) {
  if (/gap/i.test(batch.id)) {
    return "Close undercovered NAC, CFE, OSCE, PfP, legal-authority, or NATO institutional gap with document-level records.";
  }

  if (/trip|pc-dc/i.test(batch.id)) {
    return "Use for chronology, briefing-book provenance, meeting sequence, and same-day source-control checks.";
  }

  if (/crisis/i.test(batch.id)) {
    return "Extract only document-level crisis records that add decision evidence or institutional NATO coverage.";
  }

  if (/public|framing/i.test(batch.id)) {
    return "Compare public language against internal policy files and keep as control evidence unless it reveals drafting history.";
  }

  if (/Madrid|NATO-Russia|ESDI|Strategic Concept|Working Group/i.test(item.folder || "")) {
    return "Read early in the visit and promote dated policy memoranda, options papers, or cleared staff records.";
  }

  return "Read for document-level candidates with date, participants, markings, page span, release status, and source-note path.";
}

function flattenPlan(plan) {
  return plan.pullBatches.flatMap((batch, batchIndex) => {
    return batch.items.map((item, itemIndex) => {
      const sortOrder = `${String(batchIndex + 1).padStart(2, "0")}.${String(itemIndex + 1).padStart(2, "0")}`;
      return {
        sortOrder,
        batchId: batch.id,
        batchPriority: batch.priority,
        batchTitle: batch.title,
        requestTiming: requestTiming(batch.priority),
        oaId: item.oaId,
        folder: item.folder,
        office: item.office,
        findingAidPart: item.findingAidPart,
        researchValue: item.researchValue,
        batchRationale: batch.rationale,
        onsiteAction: onsiteAction(batch, item)
      };
    });
  });
}

function toCsv(rows) {
  const columns = [
    ["pull_order", (row) => row.sortOrder],
    ["request_timing", (row) => row.requestTiming],
    ["batch_priority", (row) => row.batchPriority],
    ["batch_title", (row) => row.batchTitle],
    ["oa_id", (row) => row.oaId],
    ["folder_title", (row) => row.folder],
    ["office_or_staff_file", (row) => row.office],
    ["finding_aid_part", (row) => row.findingAidPart],
    ["research_value", (row) => row.researchValue],
    ["onsite_action", (row) => row.onsiteAction],
    ["batch_rationale", (row) => row.batchRationale],
    ["request_status", () => ""],
    ["box_or_container", () => ""],
    ["withdrawal_or_redaction_notes", () => ""],
    ["candidate_document_count", () => ""],
    ["pages_scanned_or_photographed", () => ""],
    ["documents_promoted_to_volume", () => ""],
    ["source_note_path_verified", () => ""],
    ["same_day_decision", () => ""],
    ["compiler_notes", () => ""]
  ];

  return [
    columns.map(([name]) => name).join(","),
    ...rows.map((row) => columns.map(([, getter]) => csvEscape(getter(row))).join(","))
  ].join("\n");
}

function main() {
  const plan = JSON.parse(fs.readFileSync(PLAN_PATH, "utf8"));
  const rows = flattenPlan(plan);
  fs.writeFileSync(CSV_PATH, `${toCsv(rows)}\n`);
  console.log(`Wrote ${path.relative(ROOT, CSV_PATH)} (${rows.length} pull-sheet rows)`);
}

main();
