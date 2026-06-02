#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const MATRIX_PATH = path.join(ROOT, "reports", "coverage-matrix.json");
const REPORT_DIR = path.join(ROOT, "reports");
const CSV_PATH = path.join(REPORT_DIR, "search-playbook.csv");
const JSON_PATH = path.join(REPORT_DIR, "search-playbook.json");
const MD_PATH = path.join(REPORT_DIR, "search-playbook.md");

const GAP_ORDER = [
  "usnato_nac",
  "cfe",
  "osce_csce",
  "enlargement",
  "pfp",
  "germany",
  "united_kingdom",
  "poland",
  "eu_weu",
  "nato_secretary_general"
];

const SOURCE_ORDER = [
  "NARA Catalog",
  "NARA Scout",
  "State FOIA",
  "Clinton Library",
  "Clinton Digital Library",
  "Strobe Talbott FOIA",
  "GovInfo Public Papers"
];

const SOURCE_LABELS = {
  catalog: "NARA Catalog",
  scout: "NARA Scout",
  state: "State FOIA",
  clinton: "Clinton Library",
  clintonDigital: "Clinton Digital Library",
  strobe: "Strobe Talbott FOIA",
  govinfo: "GovInfo Public Papers"
};

function naraCatalogUrl(query) {
  return `https://catalog.archives.gov/search?q=${encodeURIComponent(query)}&collectionIdentifier=WJC*`;
}

function stateFoiaUrl(query) {
  return `https://foia.state.gov/Search/Results.aspx?searchText=${encodeURIComponent(query)}`;
}

function govInfoUrl(query) {
  return `https://www.govinfo.gov/app/search/%7B%22query%22%3A%22${encodeURIComponent(query)}%22%2C%22offset%22%3A0%2C%22pageSize%22%3A25%2C%22collection%22%3A%22PPP%22%7D`;
}

function clintonDigitalUrl(query) {
  return `https://clinton.presidentiallibraries.us/items/browse?search=${encodeURIComponent(query)}`;
}

function task(sourceKey, query, expectedRecordType, targetEvidence, extractionAction, relation = "") {
  const source = SOURCE_LABELS[sourceKey];
  const searchUrl =
    {
      catalog: naraCatalogUrl(query),
      scout: "https://therealjameswilson.github.io/nara-scout/",
      state: stateFoiaUrl(query),
      clinton: "https://www.clintonlibrary.gov/research",
      clintonDigital: clintonDigitalUrl(query),
      strobe: "https://therealjameswilson.github.io/strobe-talbott-foia/manifest.html",
      govinfo: govInfoUrl(query)
    }[sourceKey] || "";

  return {
    search_source: source,
    query,
    search_url: searchUrl,
    expected_record_type: expectedRecordType,
    target_evidence: targetEvidence,
    extraction_action: extractionAction,
    promotion_queue_relation: relation
  };
}

const SEARCH_SETS = {
  usnato_nac: [
    task(
      "catalog",
      '"USNATO" OR "North Atlantic Council" OR "NAC"',
      "Cable traffic; briefing memoranda; NATO Mission file units",
      "Direct NATO institutional decision-making, not public or crisis-context mentions.",
      "Open digital objects or PDFs; promote only dated documents with sender/recipient, page span, markings, and cable/file path.",
      "Use before promoting generic NATO Scout Leads."
    ),
    task(
      "catalog",
      '"NATO Mission" OR "US Mission to NATO" OR "North Atlantic Council"',
      "Mission file units and diplomatic reporting",
      "USNATO reporting on enlargement, Russia, Kosovo, Bosnia, and alliance strategy.",
      "Extract document-level cables and note whether the document is action, information, or scene-setter traffic."
    ),
    task(
      "state",
      '"USNATO" "NATO enlargement"',
      "Released State Department cables or memoranda",
      "Alliance consultations around Madrid, accession, and ratification.",
      "Read released PDF; capture TAGS, subject, date, classification, addressees, and page span."
    ),
    task(
      "state",
      '"North Atlantic Council" "Kosovo"',
      "Released State Department cables or memoranda",
      "NAC deliberations on Kosovo that can separate decision material from implementation context.",
      "Promote direct decision records; mark operational context as context-only unless it carries policy direction."
    ),
    task(
      "clinton",
      '"North Atlantic Council" "S/S-S" "EUR/RPM"',
      "Clinton Library staff/office files",
      "Executive Secretariat and EUR/RPM routing for NAC, alliance strategy, and NATO Mission material.",
      "Use as onsite pull language; record OA/ID, folder title, page span, withdrawal sheet, and exact source path."
    ),
    task(
      "scout",
      '"USNATO" "North Atlantic Council" "NAC"',
      "NARA Scout candidate file units",
      "Additional WJC file-unit leads that may not surface in broad catalog queries.",
      "Copy promising NAIDs into the promotion queue only after catalog object inspection."
    )
  ],
  cfe: [
    task(
      "catalog",
      '"CFE" OR "Conventional Armed Forces in Europe" OR "Adapted CFE"',
      "Arms-control file units; treaty records; summit files",
      "CFE Treaty and adapted CFE decision records, especially Istanbul 1999.",
      "Extract treaty/signing documents, policy memoranda, and meeting records with actual dates, page spans, markings, and declass status.",
      "Use before broad European Security Architecture selections."
    ),
    task(
      "state",
      '"Conventional Armed Forces in Europe"',
      "Released State Department cables or memoranda",
      "Negotiating instructions, allied consultations, and arms-control summaries.",
      "Capture subject, TAGS, classification, addressees, distribution, and source-note details."
    ),
    task(
      "state",
      '"Adapted CFE" OR "CFE Treaty" "Istanbul"',
      "Released State Department cables or memoranda",
      "Istanbul summit CFE package and U.S.-Russian treaty handling.",
      "Separate CFE substance from OSCE summit logistics and promote only direct CFE records."
    ),
    task(
      "strobe",
      '"CFE" OR "Conventional Armed Forces" OR "Adapted CFE"',
      "Strobe Talbott FOIA released letters, notes, and memoranda",
      "Talbott-channel CFE leads tied to Mamedov, Primakov, Yeltsin, or NATO-Russia architecture.",
      "Open the manifest/PDF entry; record date, sender, recipient, page span, markings if visible, and whether CFE is the main subject."
    ),
    task(
      "catalog",
      '"CFE" "Mamedov" OR "CFE" "Primakov" OR "CFE" "Yeltsin"',
      "Meeting memoranda; policy papers; correspondence",
      "Russian negotiation channel around CFE and NATO-Russia architecture.",
      "Cross-link to NATO-Russia records and note whether CFE is the main subject or contextual."
    ),
    task(
      "clinton",
      '"CFE" "Istanbul" "OSCE"',
      "Clinton Library trip books and NSC/State staff files",
      "Onsite leads for Istanbul summit briefing books, signing chronology, and withdrawal sheets.",
      "Use onsite pull sheet fields; verify actual document page span before promotion."
    ),
    task(
      "govinfo",
      '"CFE Treaty" "Istanbul"',
      "Public Papers context records",
      "Public chronology and Presidential remarks around CFE signing.",
      "Use as annotation/context only; chase internal record before selection."
    )
  ],
  osce_csce: [
    task(
      "catalog",
      '"OSCE" OR "CSCE" OR "Budapest Summit" OR "Istanbul Summit"',
      "Summit files; briefing books; policy memoranda",
      "Architecture records that stand apart from Bosnia/Kosovo crisis implementation.",
      "Promote summit decision records with direct OSCE/CSCE substance and exact source paths."
    ),
    task(
      "state",
      '"OSCE" "European security architecture"',
      "Released State Department memoranda or cables",
      "U.S. policy framing of OSCE relative to NATO and EU/WEU.",
      "Extract direct policy records and mark crisis-only hits as context."
    ),
    task(
      "clinton",
      '"CSCE" "Budapest" "OSCE"',
      "Clinton Library trip books and staff files",
      "Budapest and Istanbul summit chronology, briefing material, and meeting files.",
      "Record folder path, document title, date, markings, and whether the item supports a volume annotation or selection."
    )
  ],
  enlargement: [
    task(
      "catalog",
      '"NATO enlargement" OR "Madrid Summit" OR "accession" OR "ratification"',
      "NSC/State file units; briefing books; policy memoranda",
      "Direct decision records around Madrid, accession invitations, and Senate ratification.",
      "Extract policy options and decision memoranda first; use public statements only for annotation."
    ),
    task(
      "state",
      '"NATO enlargement" "Madrid"',
      "Released cables or memoranda",
      "State Department working record on Madrid summit alliance bargaining.",
      "Capture source-note fields and cross-reference accession-state leader contacts."
    ),
    task(
      "clintonDigital",
      '"NATO expansion" OR "NATO enlargement"',
      "Clinton Digital Library finding aids and released items",
      "Digital surrogates or folder-level leads for enlargement policy.",
      "Promote only actual documents; keep folder titles in the pull sheet until inspected."
    ),
    task(
      "strobe",
      '"NATO enlargement" OR "NATO expansion" OR "Madrid"',
      "Strobe Talbott FOIA released notes, letters, and memoranda",
      "Talbott-channel enlargement and NATO-Russia balancing records around Madrid and accession.",
      "Promote only direct documentary evidence; use public or handwritten notes as annotation leads unless the record carries policy substance."
    ),
    task(
      "govinfo",
      '"NATO enlargement" "Madrid"',
      "Public Papers context records",
      "Public chronology for speeches, messages to Congress, and summit framing.",
      "Use to annotate internal records and verify public timeline, not as substitute evidence."
    )
  ],
  pfp: [
    task(
      "catalog",
      '"Partnership for Peace" OR "PFP" "NATO"',
      "Policy memoranda; alliance consultation files",
      "Partnership policy as the main subject, not merely a background phrase.",
      "Promote direct PfP policy records with dates, page spans, and source path."
    ),
    task(
      "state",
      '"Partnership for Peace" "Russia"',
      "Released cables or memoranda",
      "PfP linkages to NATO-Russia, Ukraine, accession-state diplomacy, and alliance reassurance.",
      "Extract main-subject records and mark incidental mentions for annotation only."
    ),
    task(
      "strobe",
      '"Partnership for Peace" OR "PFP"',
      "Strobe Talbott FOIA released notes, letters, and memoranda",
      "PfP evidence where partnership policy intersects with Russia, Ukraine, accession, or reassurance.",
      "Record whether PfP is the main subject and cross-reference NATO-Russia or enlargement records before promotion."
    ),
    task(
      "clinton",
      '"Partnership for Peace" "open door"',
      "NSC/State staff folders",
      "Onsite policy and briefing files for PfP, MAP, and open-door decisions.",
      "Log OA/ID and folder; promote only dated item-level documents."
    )
  ],
  germany: [
    task(
      "catalog",
      '"Kohl" "NATO enlargement" OR "Germany" "NATO-Russia"',
      "Leader-contact files; policy memoranda; trip files",
      "German allied views on enlargement and NATO-Russia balancing.",
      "Promote direct German consultations with date, participants, source path, and declassification status."
    ),
    task(
      "state",
      '"Germany" "NATO enlargement" "Russia"',
      "Released State Department cables or memoranda",
      "Allied negotiations where Germany tests the U.S. position on enlargement, Russia, or Kosovo.",
      "Extract direct policy records and connect to existing Kohl/Schroeder chronology entries."
    )
  ],
  united_kingdom: [
    task(
      "catalog",
      '"Major" "NATO enlargement" OR "Blair" "Kosovo" "NATO"',
      "Leader-contact files; briefing books; policy memoranda",
      "UK allied views on enlargement, Bosnia/Kosovo, and alliance strategy.",
      "Promote direct UK consultations and avoid adding generic crisis implementation records."
    ),
    task(
      "state",
      '"United Kingdom" "NATO enlargement" OR "Blair" "NATO"',
      "Released State Department cables or memoranda",
      "State reporting on UK alliance strategy and NATO policy.",
      "Capture cables with direct decision value, source-note markings, and addressee/distribution data."
    )
  ],
  poland: [
    task(
      "catalog",
      '"Poland" "NATO accession" OR "Kwasniewski" "NATO"',
      "Leader-contact files; accession policy files",
      "Polish accession-state representation and direct bilateral consultations.",
      "Promote direct Polish records and cross-check against Madrid and ratification chronology."
    ),
    task(
      "state",
      '"Poland" "NATO enlargement" "accession"',
      "Released State Department cables or memoranda",
      "State Department handling of Polish accession, assurance, and allied reactions.",
      "Extract direct accession records and preserve source-note details."
    )
  ],
  eu_weu: [
    task(
      "catalog",
      '"ESDI" OR "WEU" OR "NATO-EU"',
      "Architecture policy files",
      "European Security and Defense Identity, WEU, and NATO-EU architecture decisions.",
      "Separate architecture substance from public framing and crisis-only references."
    ),
    task(
      "state",
      '"ESDI" "NATO" OR "Western European Union"',
      "Released State Department cables or memoranda",
      "State Department record on NATO-EU/WEU institutional alignment.",
      "Promote direct policy documents and add public statements only as annotation."
    )
  ],
  nato_secretary_general: [
    task(
      "catalog",
      '"Javier Solana" OR "Willy Claes" OR "NATO Secretary General"',
      "Meeting memoranda; leader-contact files; summit files",
      "Alliance leadership contacts beyond crisis implementation.",
      "Promote Solana/Claes records with agenda, participants, and FRUS-style source path."
    ),
    task(
      "state",
      '"Solana" "NATO" "enlargement"',
      "Released State Department cables or memoranda",
      "State reporting around Secretary General consultations on enlargement, Russia, and Kosovo.",
      "Extract direct consultations and source-note fields."
    )
  ]
};

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
    ["Order", "task_order"],
    ["Priority", "priority"],
    ["Gap", "gap_label"],
    ["Source", "search_source"],
    ["Query", "query"],
    ["Action", "extraction_action"]
  ];
  return [
    `| ${columns.map(([header]) => header).join(" | ")} |`,
    `| ${columns.map(([, key]) => (/order/i.test(key) ? "---:" : "---")).join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map(([, key]) => mdEscape(row[key])).join(" | ")} |`)
  ].join("\n");
}

function countBy(rows, getter) {
  return rows.reduce((counts, row) => {
    const key = getter(row) || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function priorityFor(status) {
  if (status === "gap") return "Hard gap";
  if (status === "direct-document gap") return "Direct-document gap";
  if (status === "overweight") return "Crisis-balance check";
  return "Selection watch";
}

function taskScore(status, source) {
  return (
    { gap: 100, "direct-document gap": 72, overweight: 42, "covered for triage": 28 }[status] || 20
  ) + (SOURCE_ORDER.length - SOURCE_ORDER.indexOf(source));
}

function readMatrixRows() {
  const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, "utf8"));
  return matrix.rows || [];
}

function buildRows(matrixRows) {
  const rowsById = new Map(matrixRows.map((row) => [row.id, row]));

  return GAP_ORDER.flatMap((gapId) => {
    const matrix = rowsById.get(gapId);
    if (!matrix) return [];
    const searches = SEARCH_SETS[gapId] || [];
    return searches.map((search, index) => ({
      gap_id: gapId,
      gap_label: matrix.label,
      coverage_status: matrix.status,
      current_total_records: matrix.total_records,
      current_document_records: matrix.document_records,
      direct_document_minimum: matrix.direct_document_minimum,
      priority: priorityFor(matrix.status),
      task_rank_within_gap: index + 1,
      score: taskScore(matrix.status, search.search_source),
      ...search,
      searched_on: "",
      result_count: "",
      promising_hits: "",
      promoted_record_ids: "",
      notes: ""
    }));
  })
    .sort((a, b) => b.score - a.score || GAP_ORDER.indexOf(a.gap_id) - GAP_ORDER.indexOf(b.gap_id) || a.task_rank_within_gap - b.task_rank_within_gap)
    .map((row, index) => ({ task_order: index + 1, ...row }));
}

function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const matrixRows = readMatrixRows();
  const rows = buildRows(matrixRows);
  const statusCounts = countBy(rows, (row) => row.coverage_status);
  const sourceCounts = countBy(rows, (row) => row.search_source);
  const hardGapRows = rows.filter((row) => row.coverage_status === "gap");

  const columns = [
    "task_order",
    "priority",
    "gap_id",
    "gap_label",
    "coverage_status",
    "current_total_records",
    "current_document_records",
    "direct_document_minimum",
    "search_source",
    "query",
    "search_url",
    "expected_record_type",
    "target_evidence",
    "extraction_action",
    "promotion_queue_relation",
    "searched_on",
    "result_count",
    "promising_hits",
    "promoted_record_ids",
    "notes"
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    taskCount: rows.length,
    hardGapTaskCount: hardGapRows.length,
    statusCounts,
    sourceCounts,
    basis: "Search playbook generated from reports/coverage-matrix.json. It operationalizes hard gaps and direct-document gaps as source-specific search tasks; blank result fields are for live compiler use after searches are actually run.",
    rows
  };

  const md = [
    "# Search Playbook",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Task count: ${rows.length}. Hard-gap tasks: ${hardGapRows.length}.`,
    "",
    "This playbook turns the coverage matrix into source-specific searches. It does not mark searches complete; use the CSV/workbook fields to record search date, result count, promising hits, promoted record IDs, and notes after live review.",
    "",
    "## Status Counts",
    "",
    ...Object.entries(statusCounts).map(([status, count]) => `- ${status}: ${count}`),
    "",
    "## Source Counts",
    "",
    ...Object.entries(sourceCounts).map(([source, count]) => `- ${source}: ${count}`),
    "",
    "## Hard Gap Searches",
    "",
    markdownTable(hardGapRows),
    "",
    "## Full Search Task List",
    "",
    markdownTable(rows),
    ""
  ].join("\n");

  fs.writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(CSV_PATH, `${toCsv(rows, columns)}\n`);
  fs.writeFileSync(MD_PATH, `${md}\n`);
  console.log(`Wrote ${path.relative(ROOT, CSV_PATH)}, ${path.relative(ROOT, JSON_PATH)}, and ${path.relative(ROOT, MD_PATH)}.`);
  console.log(JSON.stringify({ tasks: rows.length, hardGapTasks: hardGapRows.length, statusCounts, sourceCounts }, null, 2));
}

main();
