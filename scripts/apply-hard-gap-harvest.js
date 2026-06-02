#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "records.json");
const DATA_JS_PATH = path.join(ROOT, "data", "records.js");
const REPORT_DIR = path.join(ROOT, "reports");
const CSV_PATH = path.join(REPORT_DIR, "hard-gap-harvest.csv");
const JSON_PATH = path.join(REPORT_DIR, "hard-gap-harvest.json");
const MD_PATH = path.join(REPORT_DIR, "hard-gap-harvest.md");

const MANIFEST_URL = "https://therealjameswilson.github.io/strobe-talbott-foia/manifest.html";
const SOURCE_NOTE_ADDENDUM =
  "Hard-gap Strobe Talbott FOIA manifest lead. Verify PDF image, classification and handling markings, attachments, page span, excisions, and final source-note path before selection.";

const HARVEST_ROWS = [
  {
    harvestId: "strobe-hardgap-june2024-C09000044",
    documentId: "C09000044",
    releaseLabel: "June 2024",
    date: "1996-05-08",
    title: "PAPER FOR MAMEDOV ON CFE",
    pdfUrl: "https://foia.state.gov/DOCUMENTS/FOIA_L_June2024/FL-2017-13804/DOC_0C09000044/C09000044.pdf",
    gapIds: ["cfe"],
    chapter: { number: 2, name: "NATO-Russia and Partnership" },
    countries: ["United States", "Russia"],
    people: ["Bill Clinton", "Strobe Talbott", "Georgiy Mamedov"],
    topics: ["CFE", "NATO-Russia", "European Security Architecture"],
    excerpt:
      "The manifest says the text begins with a non-paper for DFM Mamedov on the CFE flank issue and agreed elements.",
    action: "Read PDF and extract the non-paper, agreed elements, markings, addressees, and page span."
  },
  {
    harvestId: "strobe-hardgap-oct2024-C09000035",
    documentId: "C09000035",
    releaseLabel: "October 2024",
    date: "1996-06-10",
    title: "The CFE Review Conference: A Retrospective w/Attachment(s)",
    pdfUrl: "https://foia.state.gov/DOCUMENTS/FOIA_L_Oct2024/FL-2017-13804/DOC_0C09000035/C09000035.pdf",
    gapIds: ["cfe"],
    chapter: { number: 3, name: "European Security Architecture" },
    countries: ["United States"],
    people: ["Bill Clinton", "Strobe Talbott"],
    topics: ["CFE", "European Security Architecture", "Arms Control"],
    excerpt:
      "The manifest identifies this as a CFE Review Conference retrospective with attachments and handling language.",
    action: "Inspect attachments and promote any dated retrospective or negotiating-summary document with source pages."
  },
  {
    harvestId: "strobe-hardgap-feb2024-C09000026",
    documentId: "C09000026",
    releaseLabel: "February 2024",
    date: "1997-04-09",
    title: "CFE TREATY",
    pdfUrl: "https://foia.state.gov/DOCUMENTS/FOIA_L_Feb2024/FL-2017-13804/DOC_0C09000026/C09000026.pdf",
    gapIds: ["cfe"],
    chapter: { number: 3, name: "European Security Architecture" },
    countries: ["United States", "Ukraine", "Russia"],
    people: ["Bill Clinton", "Strobe Talbott"],
    topics: ["CFE", "European Security Architecture", "Arms Control"],
    excerpt:
      "The manifest identifies a Kyiv telegram for Strobe Talbott, with TAGS MARR/PARM/CFE and a CFE Treaty subject.",
    action: "Extract telegram metadata, TAGS, addressees, classification, and whether this is direct CFE policy evidence."
  },
  {
    harvestId: "strobe-hardgap-july2024-C09000044",
    documentId: "C09000044",
    releaseLabel: "July 2024",
    date: "1997-04-10",
    title: "Checklist For GEM 4/10/97",
    pdfUrl: "https://foia.state.gov/DOCUMENTS/FOIA_L_July2024/FL-2017-13804/DOC_0C09000044/C09000044.pdf",
    gapIds: ["cfe"],
    chapter: { number: 2, name: "NATO-Russia and Partnership" },
    countries: ["United States", "Russia"],
    people: ["Bill Clinton", "Strobe Talbott", "Georgiy Mamedov"],
    topics: ["CFE", "NATO-Russia", "European Security Architecture"],
    excerpt: "The manifest excerpt begins, \"CFE - Need Russian Counterproposal\" in a GEM checklist.",
    action: "Use as a CFE/Mamedov checklist lead; verify whether it belongs as document evidence or annotation support."
  },
  {
    harvestId: "strobe-hardgap-july2024-C09000039",
    documentId: "C09000039",
    releaseLabel: "July 2024",
    date: "1997-01-01",
    datePending: true,
    title: "Additional Elements on CFE for NATO-Russia Document w/Attachment(s)",
    pdfUrl: "https://foia.state.gov/DOCUMENTS/FOIA_L_July2024/FL-2017-13804/DOC_0C09000039/C09000039.pdf",
    gapIds: ["cfe", "nato_russia"],
    chapter: { number: 2, name: "NATO-Russia and Partnership" },
    countries: ["United States", "Russia"],
    people: ["Bill Clinton", "Strobe Talbott"],
    topics: ["CFE", "NATO-Russia", "European Security Architecture"],
    excerpt:
      "The manifest identifies additional CFE elements for the NATO-Russia document and transparency conditions.",
    action: "Verify date and attachment structure; promote if it shows CFE language in the NATO-Russia document."
  },
  {
    harvestId: "strobe-hardgap-july2024-C09000043",
    documentId: "C09000043",
    releaseLabel: "July 2024",
    date: "1997-01-01",
    datePending: true,
    title: "Precis of Russian-CFE Counter-Proposal",
    pdfUrl: "https://foia.state.gov/DOCUMENTS/FOIA_L_July2024/FL-2017-13804/DOC_0C09000043/C09000043.pdf",
    gapIds: ["cfe", "nato_russia"],
    chapter: { number: 2, name: "NATO-Russia and Partnership" },
    countries: ["United States", "Russia"],
    people: ["Bill Clinton", "Strobe Talbott"],
    topics: ["CFE", "NATO-Russia", "European Security Architecture"],
    excerpt:
      "The manifest identifies a precis of a Russian CFE counter-proposal for a draft framework agreement to adapt CFE.",
    action: "Verify date, author, and attachment pages; use as a priority CFE adaptation lead."
  },
  {
    harvestId: "strobe-hardgap-july2022-C09000060",
    documentId: "C09000060",
    releaseLabel: "July 2022",
    date: "1998-09-28",
    title: "DEPUTY SECRETARY TALBOTT BRIEFING TOTHE NAC ON MOSCOW SUMMIT, THE WAY AHEAD WITH RUSIA",
    pdfUrl: "https://foia.state.gov/DOCUMENTS/FOIA_L_July2022/FL-2017-13804/DOC_0C09000060/C09000060.pdf",
    gapIds: ["usnato_nac", "nato_russia"],
    chapter: { number: 2, name: "NATO-Russia and Partnership" },
    countries: ["United States", "Russia"],
    people: ["Bill Clinton", "Strobe Talbott"],
    topics: ["NAC/USNATO", "NATO-Russia", "European Security Architecture"],
    excerpt:
      "The manifest excerpt says USNATO printed a release-in-part briefing to the NAC on the Moscow summit and the way ahead with Russia.",
    action: "Extract cable header, USNATO number, release-in-part excisions, and NAC briefing summary."
  },
  {
    harvestId: "strobe-hardgap-june2024-C09000017",
    documentId: "C09000017",
    releaseLabel: "June 2024",
    date: "1999-04-29",
    title: "NAC INTERVENTION 4/29/99",
    pdfUrl: "https://foia.state.gov/DOCUMENTS/FOIA_L_June2024/FL-2017-13804/DOC_0C09000017/C09000017.pdf",
    gapIds: ["usnato_nac"],
    chapter: { number: 4, name: "Crisis Security Files" },
    countries: ["United States", "Russia", "Kosovo"],
    people: ["Bill Clinton", "Strobe Talbott"],
    topics: ["NAC/USNATO", "Kosovo", "NATO-Russia"],
    excerpt: "The manifest identifies this as a NAC intervention on April 29, 1999.",
    action: "Extract intervention text and decide whether it is direct NAC decision evidence or Kosovo context."
  },
  {
    harvestId: "strobe-hardgap-july2022-C09000063",
    documentId: "C09000063",
    releaseLabel: "July 2022",
    date: "2000-06-08",
    title: "DEPUTY SECRETARY BRIEFS THE NAC ON MOSCOW SUMMIT",
    pdfUrl: "https://foia.state.gov/DOCUMENTS/FOIA_L_July2022/FL-2017-13804/DOC_0C09000063/C09000063.pdf",
    gapIds: ["usnato_nac", "nato_russia"],
    chapter: { number: 2, name: "NATO-Russia and Partnership" },
    countries: ["United States", "Russia"],
    people: ["Bill Clinton", "Strobe Talbott"],
    topics: ["NAC/USNATO", "NATO-Russia", "European Security Architecture"],
    excerpt:
      "The manifest excerpt says USNATO 1314, EXDIS, release in part, briefing the NAC on the Moscow summit.",
    action: "Extract cable metadata, release-in-part declassification, and the NAC briefing substance."
  },
  {
    harvestId: "strobe-hardgap-july2024-C09000038",
    documentId: "C09000038",
    releaseLabel: "July 2024",
    date: "1997-01-01",
    datePending: true,
    title: "On Course for Madrid",
    pdfUrl: "https://foia.state.gov/DOCUMENTS/FOIA_L_July2024/FL-2017-13804/DOC_0C09000038/C09000038.pdf",
    gapIds: ["usnato_nac", "enlargement", "nato_russia"],
    chapter: { number: 1, name: "NATO Strategy and Enlargement" },
    countries: ["United States", "Russia"],
    people: ["Bill Clinton", "Strobe Talbott"],
    topics: ["NAC/USNATO", "NATO enlargement", "NATO-Russia"],
    excerpt:
      "The manifest excerpt lays out an on-course-for-Madrid schedule with NATO-Russia, NAC, summit, ministerial, and military-committee milestones.",
    action: "Verify the date and use as a Madrid/NAC planning lead, not a final chronology item until the PDF is inspected."
  },
  {
    harvestId: "strobe-hardgap-feb2024-C09000122",
    documentId: "C09000122",
    releaseLabel: "February 2024",
    date: "1997-01-01",
    datePending: true,
    title: "ST notes on Kissinger piece",
    pdfUrl: "https://foia.state.gov/DOCUMENTS/FOIA_L_Feb2024/FL-2017-13804/DOC_0C09000122/C09000122.pdf",
    gapIds: ["usnato_nac", "nato_russia"],
    chapter: { number: 2, name: "NATO-Russia and Partnership" },
    countries: ["United States", "Russia"],
    people: ["Bill Clinton", "Strobe Talbott"],
    topics: ["NAC/USNATO", "NATO-Russia"],
    excerpt:
      "The manifest excerpt says NATO remains NATO, the NAC remains NAC, and Russia will be in neither.",
    action: "Use as an annotation/source-control lead unless PDF review shows direct policy-drafting value."
  },
  {
    harvestId: "strobe-hardgap-sep2022-C09000027",
    documentId: "C09000027",
    releaseLabel: "September 2022",
    date: "1999-01-01",
    datePending: true,
    title: "CFE Rollout Meeting",
    pdfUrl: "https://foia.state.gov/DOCUMENTS/FOIA_L_Sep2022/FL-2017-13804/DOC_0C09000027/C09000027.pdf",
    gapIds: ["cfe"],
    chapter: { number: 3, name: "European Security Architecture" },
    countries: ["United States"],
    people: ["Bill Clinton", "Strobe Talbott"],
    topics: ["CFE", "European Security Architecture", "Arms Control"],
    excerpt:
      "The manifest identifies a CFE rollout meeting and says CFE is important as the next step in Euro-security.",
    action: "Verify date and attendees; promote if it explains CFE rollout decisions or interagency assignments."
  },
  {
    harvestId: "strobe-hardgap-mar2023-C09000060",
    documentId: "C09000060",
    releaseLabel: "March 2023",
    date: "1997-01-01",
    datePending: true,
    title: "DRAFT LETTER FROM THE SECRETARY TO CENTRAL EUROPEAN COUNTERPARTS w/Attached Facsimile Transmission",
    pdfUrl: "https://foia.state.gov/DOCUMENTS/FOIA_L_Mar2023/FL-2017-13804/DOC_0C09000060/C09000060.pdf",
    gapIds: ["cfe", "enlargement"],
    chapter: { number: 1, name: "NATO Strategy and Enlargement" },
    countries: ["United States"],
    people: ["Bill Clinton", "Strobe Talbott"],
    topics: ["CFE", "NATO enlargement", "European Security Architecture"],
    excerpt:
      "The manifest excerpt discusses modernizing the CFE Treaty and serious Russian engagement in Vienna.",
    action: "Verify addressees and draft status; use to link CFE modernization with enlargement diplomacy."
  },
  {
    harvestId: "strobe-hardgap-apr2023-C09000073",
    documentId: "C09000073",
    releaseLabel: "April 2023",
    date: "1997-01-01",
    datePending: true,
    title: "Note from Strobe to Chris",
    pdfUrl: "https://foia.state.gov/DOCUMENTS/FOIA_L_Apr2023/FL-2017-13804/DOC_0C09000073/C09000073.pdf",
    gapIds: ["cfe"],
    chapter: { number: 3, name: "European Security Architecture" },
    countries: ["United States", "Russia"],
    people: ["Bill Clinton", "Strobe Talbott", "Warren Christopher"],
    topics: ["CFE", "European Security Architecture", "Arms Control"],
    excerpt:
      "The manifest excerpt says Talbott wanted to brief Christopher on where they stood on CFE and ABM/TMD.",
    action: "Use as a CFE status lead; promote only after PDF review establishes date, context, and substance."
  }
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ].join("\n");
}

function mdEscape(value) {
  return String(Array.isArray(value) ? value.join("; ") : value ?? "")
    .replaceAll("|", "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

function markdownTable(rows) {
  const columns = [
    ["Order", "harvest_order"],
    ["Gap", "gap_ids"],
    ["Date", "date"],
    ["Record", "source_document"],
    ["Title", "title"],
    ["Action", "compiler_action"]
  ];
  return [
    `| ${columns.map(([header]) => header).join(" | ")} |`,
    `| ${columns.map(([, key]) => (key === "harvest_order" ? "---:" : "---")).join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map(([, key]) => mdEscape(row[key])).join(" | ")} |`)
  ].join("\n");
}

function sourceNote(row) {
  return [
    "Source: Department of State, FOIA Virtual Reading Room",
    "Strobe Talbott FOIA release",
    `Release ${row.releaseLabel}`,
    `Document ${row.documentId}`
  ].join(", ") + ".";
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return value !== null && typeof value !== "undefined" && String(value).trim() !== "";
}

function preserveIfPresent(target, existing, keys) {
  if (!existing) return target;
  for (const key of keys) {
    if (hasValue(existing[key])) target[key] = existing[key];
  }
  return target;
}

function appendUniqueText(values) {
  const seen = new Set();
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(hasValue)
    .filter((value) => {
      const key = String(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function mergeSourceNoteAddendum(base, existing) {
  if (!existing?.sourceNoteAddendum) return base.sourceNoteAddendum;
  if (existing.sourceNoteAddendum.includes(base.sourceNoteAddendum)) return existing.sourceNoteAddendum;
  return `${base.sourceNoteAddendum} ${existing.sourceNoteAddendum}`.replace(/\s+/g, " ").trim();
}

function mergeHarvestRecord(base, existing) {
  if (!existing) return base;

  const merged = {
    ...base,
    compilerNotes: appendUniqueText([base.compilerNotes, existing.compilerNotes]),
    relatedReleaseIds: appendUniqueText([base.relatedReleaseIds, existing.relatedReleaseIds]),
    sourceNoteAddendum: mergeSourceNoteAddendum(base, existing)
  };

  preserveIfPresent(merged, existing, [
    "date",
    "sortDate",
    "dateLine",
    "washingtonTime",
    "placementNote",
    "sourceNote",
    "sourceNoteStatus",
    "sourcePages",
    "sourcePdfPages",
    "pageCount",
    "digitalObjects",
    "originalClassification",
    "documentMarkings",
    "handlingMarkings",
    "distribution",
    "draftingInfo",
    "clearance",
    "communication",
    "readBy",
    "declassificationStatus",
    "withheldMaterial",
    "annotationStatus",
    "annotation",
    "extractionStatus"
  ]);

  return merged;
}

function sourcePath(row) {
  return ["State Department FOIA Library", "Strobe Talbott FOIA", `Release ${row.releaseLabel}`, `Document ${row.documentId}`];
}

function recordFor(row) {
  const dateLine = row.datePending
    ? "Date pending in Strobe Talbott FOIA manifest; verify from the source PDF before chronology use."
    : row.date;
  return {
    id: row.harvestId,
    date: row.date,
    sortDate: row.date,
    type: "Source Lead",
    title: row.title,
    documentTitle: row.title,
    participants: unique(row.people),
    countries: unique(row.countries),
    chapter: row.chapter,
    releaseStatus: "FOIA/MDR Lead",
    selectionDecision: "Include candidate",
    naid: row.harvestId,
    catalogUrl: row.pdfUrl,
    pdfUrl: row.pdfUrl,
    pageCount: null,
    digitalObjects: null,
    dateLine,
    washingtonTime: "",
    placementNote: "Source lead only; verify final date and chronological placement from the PDF before selection.",
    subjectLine: row.excerpt,
    sourceNote: sourceNote(row),
    sourceNoteStatus: "Draft",
    sourceNoteAddendum: SOURCE_NOTE_ADDENDUM,
    sourcePages: "",
    originalClassification: "",
    documentMarkings: [],
    handlingMarkings: [],
    distribution: "",
    draftingInfo: "",
    clearance: {},
    communication: {},
    readBy: [],
    declassificationStatus: "Pending review",
    withheldMaterial: { status: "Not yet audited" },
    annotationStatus: "Pending",
    annotation: { firstFootnote: "", relatedDocuments: [], publicStatements: [], memoirs: [] },
    extractionStatus: "Hard-gap source lead harvested from the Strobe Talbott FOIA manifest; document-level extraction pending.",
    source: {
      name: "Department of State, FOIA Virtual Reading Room",
      url: row.pdfUrl,
      pdfUrl: row.pdfUrl,
      collection: "Strobe Talbott FOIA release",
      documentId: `${row.documentId} (${row.releaseLabel})`,
      path: sourcePath(row)
    },
    frusVolume: {
      id: "frus1993-00v17",
      title:
        "Foreign Relations of the United States, 1993-2000, Volume XVII, North Atlantic Treaty Organization; European Security",
      url: "https://history.state.gov/historicaldocuments/frus1993-00v17",
      status: "Planned"
    },
    frusTopics: unique(row.topics),
    topics: unique(row.topics),
    indexTerms: unique([...row.topics, ...row.countries.filter((country) => country !== "United States")]),
    persons: unique(row.people),
    compilerNotes: unique([
      "Supplemental hard-gap lead added to improve NAC/USNATO and CFE source coverage.",
      row.action,
      row.excerpt
    ]),
    relatedReleaseIds: unique([row.documentId, row.releaseLabel, row.harvestId])
  };
}

function harvestReportRow(row, index) {
  return {
    harvest_order: index + 1,
    gap_ids: row.gapIds,
    record_id: row.harvestId,
    date: row.datePending ? "date pending" : row.date,
    source_document: `${row.documentId} (${row.releaseLabel})`,
    title: row.title,
    release_label: row.releaseLabel,
    pdf_url: row.pdfUrl,
    manifest_excerpt: row.excerpt,
    compiler_action: row.action,
    promoted_record_id: "",
    source_note_verified: "",
    selection_decision: "",
    notes: ""
  };
}

function countBy(rows, getter) {
  return rows.reduce((counts, row) => {
    const key = getter(row) || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const records = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const harvestIds = new Set(HARVEST_ROWS.map((row) => row.harvestId));
  const existingHarvestRecords = new Map(records.filter((record) => harvestIds.has(record.id)).map((record) => [record.id, record]));
  const cleanedRecords = records.filter((record) => !harvestIds.has(record.id));
  const existingPdfUrls = new Set(cleanedRecords.map((record) => record.pdfUrl).filter(Boolean));
  const newRecords = HARVEST_ROWS.filter((row) => !existingPdfUrls.has(row.pdfUrl)).map((row) =>
    mergeHarvestRecord(recordFor(row), existingHarvestRecords.get(row.harvestId))
  );
  const nextRecords = [...cleanedRecords, ...newRecords].sort(
    (a, b) =>
      a.chapter.number - b.chapter.number ||
      (a.sortDate || a.date || "").localeCompare(b.sortDate || b.date || "") ||
      (a.title || "").localeCompare(b.title || "")
  );

  const reportRows = HARVEST_ROWS.map(harvestReportRow);
  const gapCounts = countBy(HARVEST_ROWS.flatMap((row) => row.gapIds).map((gap) => ({ gap })), (row) => row.gap);
  const releaseCounts = countBy(HARVEST_ROWS, (row) => row.releaseLabel);
  const report = {
    generatedAt: new Date().toISOString(),
    manifestUrl: MANIFEST_URL,
    basis:
      "Supplemental hard-gap harvest from the live Strobe Talbott FOIA manifest for source leads that improve NAC/USNATO and CFE coverage.",
    harvestCount: HARVEST_ROWS.length,
    addedRecords: newRecords.length,
    skippedExistingPdfRecords: HARVEST_ROWS.length - newRecords.length,
    gapCounts,
    releaseCounts,
    rows: reportRows
  };

  const columns = [
    "harvest_order",
    "gap_ids",
    "record_id",
    "date",
    "source_document",
    "title",
    "release_label",
    "pdf_url",
    "manifest_excerpt",
    "compiler_action",
    "promoted_record_id",
    "source_note_verified",
    "selection_decision",
    "notes"
  ];

  const md = [
    "# Hard-Gap Harvest",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Manifest: ${MANIFEST_URL}`,
    "",
    `Harvested source leads: ${HARVEST_ROWS.length}. Added or refreshed records: ${newRecords.length}.`,
    "",
    "These rows are source leads, not final FRUS documents. They identify release-qualified Strobe Talbott FOIA PDFs that directly address NAC/USNATO and CFE gaps and need PDF inspection before selection.",
    "",
    "## Gap Counts",
    "",
    ...Object.entries(gapCounts).map(([gap, count]) => `- ${gap}: ${count}`),
    "",
    "## Harvest Rows",
    "",
    markdownTable(reportRows),
    ""
  ].join("\n");

  fs.writeFileSync(DATA_PATH, `${JSON.stringify(nextRecords, null, 2)}\n`);
  fs.writeFileSync(DATA_JS_PATH, `window.COMPILER_RECORDS = ${JSON.stringify(nextRecords, null, 2)};\n`);
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(CSV_PATH, `${toCsv(reportRows, columns)}\n`);
  fs.writeFileSync(MD_PATH, `${md}\n`);
  console.log(`Applied ${newRecords.length} hard-gap source leads; wrote ${path.relative(ROOT, JSON_PATH)}, ${path.relative(ROOT, CSV_PATH)}, and ${path.relative(ROOT, MD_PATH)}.`);
}

main();
