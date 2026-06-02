#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "records.json");
const REPORT_DIR = path.join(ROOT, "reports");
const CSV_PATH = path.join(REPORT_DIR, "coverage-matrix.csv");
const JSON_PATH = path.join(REPORT_DIR, "coverage-matrix.json");
const MD_PATH = path.join(REPORT_DIR, "coverage-matrix.md");

const DOCUMENT_TYPES = new Set(["Memcon", "Telcon", "Release Packet"]);
const CONVERSATION_TYPES = new Set(["Memcon", "Telcon"]);

const DIMENSIONS = [
  {
    category: "Institution",
    id: "nato_core",
    label: "NATO and Atlantic Alliance core",
    pattern: /\bNATO\b|North Atlantic Treaty|Atlantic Alliance/i,
    minimum: 150,
    directMinimum: 70,
    action: "Maintain as the baseline; separate direct decision records from public/context records before final selection."
  },
  {
    category: "Institution",
    id: "usnato_nac",
    label: "USNATO, NAC, and North Atlantic Council traffic",
    pattern: /\bUSNATO\b|\bNAC\b|North Atlantic Council|NATO Mission/i,
    minimum: 25,
    directMinimum: 10,
    action: "Run targeted USNATO, North Atlantic Council, S/S-S, EUR/RPM, NATO Mission, and cable-traffic searches."
  },
  {
    category: "Institution",
    id: "eu_weu",
    label: "EU, NATO-EU, ESDI, and WEU",
    pattern: /\bNATO-EU\b|\bESDI\b|European Union|\bEU\b|European Community|\bWEU\b|Western European Union/i,
    minimum: 35,
    directMinimum: 12,
    action: "Target archival policy files that show NATO-EU/ESDI decisions rather than public framing only."
  },
  {
    category: "Institution",
    id: "osce_csce",
    label: "OSCE and CSCE",
    pattern: /\bOSCE\b|\bCSCE\b|Budapest Summit|Istanbul Summit/i,
    minimum: 35,
    directMinimum: 12,
    action: "Run an OSCE/CSCE architecture pass and distinguish summit decision records from crisis references."
  },
  {
    category: "Treaty",
    id: "cfe",
    label: "CFE and conventional forces",
    pattern: /\bCFE\b|Conventional Armed Forces|Conventional Forces/i,
    minimum: 20,
    directMinimum: 8,
    action: "Search CFE Treaty, adapted CFE, Istanbul, arms-control, and EUR/RPM files before relying on the architecture lane."
  },
  {
    category: "Topic",
    id: "enlargement",
    label: "NATO enlargement, Madrid, accession, and ratification",
    pattern: /\b(enlargement|expansion|Madrid|accession|ratification|Poland|Polish|Czech|Havel|Hungary|Hungarian)\b/i,
    minimum: 80,
    directMinimum: 35,
    action: "Keep extracting direct Madrid, accession, Senate ratification, and new-member consultation records."
  },
  {
    category: "Topic",
    id: "pfp",
    label: "Partnership for Peace and partnership policy",
    pattern: /\bPartnership for Peace\b|\bPFP\b|partnership policy/i,
    minimum: 30,
    directMinimum: 12,
    action: "Chase policy memoranda and alliance consultations where PFP is the main subject rather than background."
  },
  {
    category: "State",
    id: "russia",
    label: "Russia and NATO-Russia negotiations",
    pattern: /\bRussia\b|\bRussian\b|Yeltsin|Putin|Kozyrev|Primakov|Mamedov|Chernomyrdin|NATO-Russia|NATO\/Russia|Founding Act|\bPJC\b/i,
    minimum: 90,
    directMinimum: 35,
    action: "Prioritize direct NATO-Russia negotiating records, Founding Act material, PJC files, and Clinton-Yeltsin/Putin conversations."
  },
  {
    category: "State",
    id: "poland",
    label: "Poland",
    pattern: /\bPoland\b|\bPolish\b|Walesa|Kwasniewski|Kwaśniewski/i,
    minimum: 18,
    directMinimum: 8,
    action: "Verify accession-state representation with direct Polish leader contacts and enlargement policy files."
  },
  {
    category: "State",
    id: "czech_republic",
    label: "Czech Republic",
    pattern: /\bCzech\b|Czech Republic|Havel/i,
    minimum: 18,
    directMinimum: 8,
    action: "Verify accession-state representation with direct Czech leader contacts and enlargement policy files."
  },
  {
    category: "State",
    id: "hungary",
    label: "Hungary",
    pattern: /\bHungary\b|\bHungarian\b|Goncz|Göncz|Horn/i,
    minimum: 18,
    directMinimum: 8,
    action: "Find direct Hungarian accession consultations; the current corpus risks treating Hungary as a secondary accession case."
  },
  {
    category: "Ally",
    id: "germany",
    label: "Germany",
    pattern: /\bGermany\b|\bGerman\b|Kohl|Schroeder|Schröder|Genscher|Kinkel/i,
    minimum: 25,
    directMinimum: 10,
    action: "Use German leader contacts and NATO policy files to test enlargement and NATO-Russia decision context."
  },
  {
    category: "Ally",
    id: "france",
    label: "France",
    pattern: /\bFrance\b|\bFrench\b|Chirac|Mitterrand|Juppe|Juppé/i,
    minimum: 20,
    directMinimum: 8,
    action: "Use French contacts to balance alliance politics, NATO command debates, Kosovo, and NATO-Russia policy."
  },
  {
    category: "Ally",
    id: "united_kingdom",
    label: "United Kingdom",
    pattern: /\bUnited Kingdom\b|\bBritain\b|\bBritish\b|Major|Blair|Hurd|Straw/i,
    minimum: 20,
    directMinimum: 8,
    action: "Use UK contacts to balance enlargement, Bosnia/Kosovo, and alliance strategy decisions."
  },
  {
    category: "Institution",
    id: "nato_secretary_general",
    label: "NATO Secretary General and alliance leadership",
    pattern: /Solana|Willy Claes|Manfred Woerner|Wörner|NATO Secretary General/i,
    minimum: 25,
    directMinimum: 10,
    action: "Chase Solana/Claes/Secretary General meetings, calls, and NATO 50th anniversary material."
  },
  {
    category: "Crisis Balance",
    id: "bosnia_ifor_sfor",
    label: "Bosnia, Dayton, IFOR, and SFOR",
    pattern: /\bBosnia\b|Herzegovina|Dayton|\bIFOR\b|\bSFOR\b/i,
    minimum: 40,
    directMinimum: 20,
    maximum: 160,
    action: "Split direct NATO decision records from implementation/context records so Bosnia does not crowd out the volume's architecture subjects."
  },
  {
    category: "Crisis Balance",
    id: "kosovo_kfor",
    label: "Kosovo, KFOR, and NATO air campaign diplomacy",
    pattern: /\bKosovo\b|\bKosova\b|\bKFOR\b|air campaign|air strikes|Rambouillet/i,
    minimum: 35,
    directMinimum: 20,
    maximum: 140,
    action: "Separate direct NATO decision records, public statements, and operational context before final selection."
  }
];

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
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

function hasSourceCitation(record) {
  const note = [record.sourceNote, record.sourceNoteAddendum].filter(Boolean).join(" ");
  const noteLooksComplete = /^Source:\s+\S/i.test(note) && !/pending|sample only|replace|\[[^\]]+\]/i.test(note);
  const pathLooksComplete = sourcePathParts(record).length >= 2;
  const hasMarkings = Boolean(noteLooksComplete || sourceMarkings(record));
  return (noteLooksComplete || pathLooksComplete) && hasMarkings;
}

function productionIssues(record) {
  const issues = [];
  const decision = record.selectionDecision || record.compilerDecision;
  if (!decision || decision === "Pending") issues.push("needs-selection");
  if (!hasSourceCitation(record)) issues.push("needs-source");
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

function countBy(records, getter) {
  return records.reduce((counts, record) => {
    const key = getter(record) || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function topCounts(counts, limit = 4) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => `${label}: ${count}`)
    .join("; ");
}

function yearsCovered(records) {
  return [...new Set(records.map((record) => (record.sortDate || record.date || "").slice(0, 4)).filter((year) => /^\d{4}$/.test(year)))]
    .sort()
    .join("; ");
}

function dateRange(records) {
  const dates = records.map((record) => record.sortDate || record.date || "").filter(Boolean).sort();
  return {
    first: dates[0] || "",
    last: dates[dates.length - 1] || ""
  };
}

function rankForSample(record) {
  const decision = record.selectionDecision || record.compilerDecision || "";
  return (
    (decision === "Include candidate" ? 0 : decision === "Context candidate" ? 10 : 20) +
    (DOCUMENT_TYPES.has(record.type) ? 0 : record.type === "Context" ? 5 : 12)
  );
}

function sampleRecords(records, limit = 5) {
  return [...records]
    .sort((a, b) => rankForSample(a) - rankForSample(b) || (a.sortDate || a.date || "").localeCompare(b.sortDate || b.date || ""))
    .slice(0, limit)
    .map((record) => `${record.sortDate || record.date || "undated"} ${record.type}: ${record.documentTitle || record.title}`)
    .join(" | ");
}

function statusFor(dimension, counts) {
  if (dimension.maximum && counts.total_records > dimension.maximum) return "overweight";
  if (counts.total_records < dimension.minimum) return "gap";
  if (counts.document_records < dimension.directMinimum) return "direct-document gap";
  if (counts.include_candidates === 0) return "selection watch";
  return "covered for triage";
}

function nextActionFor(dimension, status) {
  if (status === "covered for triage") return "Verify selection, source notes, declassification accounting, and chronological placement.";
  return dimension.action;
}

function matrixRow(dimension, records) {
  const matches = records.filter((record) => dimension.pattern.test(textOf(record)));
  const issues = matches.flatMap((record) => productionIssues(record));
  const issueCounts = countBy(issues.map((issue) => ({ issue })), (record) => record.issue);
  const byType = countBy(matches, (record) => record.type);
  const range = dateRange(matches);
  const counts = {
    total_records: matches.length,
    document_records: matches.filter((record) => DOCUMENT_TYPES.has(record.type)).length,
    conversation_records: matches.filter((record) => CONVERSATION_TYPES.has(record.type)).length,
    release_packets: byType["Release Packet"] || 0,
    context_records: byType.Context || 0,
    scout_leads: byType["Scout Lead"] || 0,
    source_leads: byType["Source Lead"] || 0,
    include_candidates: matches.filter((record) => (record.selectionDecision || record.compilerDecision) === "Include candidate").length,
    context_candidates: matches.filter((record) => (record.selectionDecision || record.compilerDecision) === "Context candidate").length,
    pending_selection: matches.filter((record) => !(record.selectionDecision || record.compilerDecision) || (record.selectionDecision || record.compilerDecision) === "Pending").length,
    needs_source: issueCounts["needs-source"] || 0,
    needs_chronology: issueCounts["needs-chronology"] || 0,
    needs_declass: issueCounts["needs-declass"] || 0,
    crisis_lane: matches.filter((record) => record.chapter?.name === "Crisis Security Files").length
  };
  counts.non_crisis_lane = counts.total_records - counts.crisis_lane;
  const status = statusFor(dimension, counts);

  return {
    category: dimension.category,
    id: dimension.id,
    label: dimension.label,
    minimum_records: dimension.minimum,
    direct_document_minimum: dimension.directMinimum,
    maximum_records: dimension.maximum || "",
    ...counts,
    status,
    first_date: range.first,
    last_date: range.last,
    years_covered: yearsCovered(matches),
    chapter_mix: topCounts(countBy(matches, (record) => record.chapter?.name || "Unknown")),
    type_mix: topCounts(byType),
    top_sources: topCounts(countBy(matches, (record) => record.source?.name || "Unknown")),
    next_action: nextActionFor(dimension, status),
    sample_records: sampleRecords(matches),
    search_pattern: dimension.pattern.source
  };
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
    ["Coverage Dimension", "label"],
    ["Total", "total_records"],
    ["Direct Docs", "document_records"],
    ["Include", "include_candidates"],
    ["Scout", "scout_leads"],
    ["Crisis", "crisis_lane"],
    ["Status", "status"],
    ["Next Action", "next_action"]
  ];
  return [
    `| ${columns.map(([header]) => header).join(" | ")} |`,
    `| ${columns.map(([, key]) => (/_records|candidates|leads|lane|total/.test(key) ? "---:" : "---")).join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map(([, key]) => mdEscape(row[key])).join(" | ")} |`)
  ].join("\n");
}

function main() {
  const records = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const rows = DIMENSIONS.map((dimension) => matrixRow(dimension, records)).sort((a, b) => {
    const statusOrder = { gap: 0, "direct-document gap": 1, overweight: 2, "selection watch": 3, "covered for triage": 4 };
    return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) || a.category.localeCompare(b.category) || a.label.localeCompare(b.label);
  });

  const statusCounts = countBy(rows, (row) => row.status);
  const urgentRows = rows.filter((row) => ["gap", "direct-document gap", "overweight"].includes(row.status));
  const report = {
    generatedAt: new Date().toISOString(),
    recordCount: records.length,
    basis: "Coverage matrix generated from data/records.json to answer the compiler-gap audit call for an allies-and-institutions matrix.",
    definitions: {
      document_records: "Memcon, Telcon, or Release Packet rows.",
      direct_document_minimum: "Minimum document-level rows expected before a dimension should be treated as selection-ready.",
      overweight: "Coverage is abundant enough that the compiler should split direct decision records from context before final selection."
    },
    statusCounts,
    rows
  };

  const columns = [
    "category",
    "id",
    "label",
    "minimum_records",
    "direct_document_minimum",
    "maximum_records",
    "total_records",
    "document_records",
    "conversation_records",
    "release_packets",
    "context_records",
    "scout_leads",
    "source_leads",
    "include_candidates",
    "context_candidates",
    "pending_selection",
    "needs_source",
    "needs_chronology",
    "needs_declass",
    "crisis_lane",
    "non_crisis_lane",
    "status",
    "first_date",
    "last_date",
    "years_covered",
    "chapter_mix",
    "type_mix",
    "top_sources",
    "next_action",
    "sample_records",
    "search_pattern"
  ];

  fs.writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(CSV_PATH, `${toCsv(rows, columns)}\n`);

  const md = [
    "# Coverage Matrix",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Record count: ${records.length}.`,
    "",
    "This matrix turns the gap-audit instruction into a working selection-control sheet for allies, institutions, treaty topics, and crisis-balance rows. It separates raw hits from document-level records so a compiler can see where a high count still lacks usable FRUS documents.",
    "",
    "## Status Summary",
    "",
    ...Object.entries(statusCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([status, count]) => `- ${status}: ${count}`),
    "",
    "## Highest-Priority Rows",
    "",
    ...urgentRows.map((row) => `- **${row.status}: ${row.label}.** ${row.total_records} total records; ${row.document_records} document records. ${row.next_action}`),
    "",
    "## Matrix",
    "",
    markdownTable(rows),
    "",
    "## Definitions",
    "",
    "- **Direct Docs** means Memcon, Telcon, or Release Packet rows.",
    "- **Scout** rows are file-unit leads; promote only after inspecting source images and recording actual date, page span, markings, and source path.",
    "- **Overweight** means the row is abundant enough that direct decision records must be separated from public/context and implementation material.",
    ""
  ].join("\n");
  fs.writeFileSync(MD_PATH, md);

  console.log(`Wrote ${path.relative(ROOT, CSV_PATH)}, ${path.relative(ROOT, JSON_PATH)}, and ${path.relative(ROOT, MD_PATH)}.`);
  console.log(
    JSON.stringify(
      {
        records: records.length,
        rows: rows.length,
        statusCounts
      },
      null,
      2
    )
  );
}

main();
