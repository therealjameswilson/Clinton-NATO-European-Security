const CHAPTER_ORDER = [
  "NATO Strategy and Enlargement",
  "NATO-Russia and Partnership",
  "European Security Architecture",
  "Crisis Security Files"
];

const recordsRoot = document.querySelector("#records-root");
const chronologyRoot = document.querySelector("#chronology-root");
let queueRoot = document.querySelector("#queue-root");
const citationRoot = document.querySelector("#citation-root");
let chronologyCsvControl = document.querySelector("#download-chronology-csv");
let actionQueueCsvControl = document.querySelector("#download-action-queue-csv");
let citationCsvControl = document.querySelector("#download-citation-csv");
const totalRecords = document.querySelector("#total-records");
const decisionReady = document.querySelector("#decision-ready");
const provenanceGaps = document.querySelector("#provenance-gaps");
const declassWatch = document.querySelector("#declass-watch");
const searchInput = document.querySelector("#record-search");
const filterButtons = [...document.querySelectorAll("[data-record-filter]")];
const issueButtons = [...document.querySelectorAll("[data-issue-filter]")];

let allRecords = [];
let activeFilter = "all";
let activeIssueFilter = "all";

const QUEUE_GROUP_ORDER = [
  "Rebalance Coverage",
  "Promote Leads",
  "Chase Diary Leads",
  "Fix Source and Declass",
  "Selection Triage",
  "Final Review"
];

const COVERAGE_SIGNALS = [
  { label: "CFE gap", bonus: 36, pattern: /\bCFE\b|Conventional Forces/i },
  { label: "NAC/USNATO gap", bonus: 36, pattern: /\bNAC\b|USNATO|North Atlantic Council|NATO Mission/i },
  { label: "OSCE/CSCE architecture", bonus: 22, pattern: /\bOSCE\b|\bCSCE\b|Istanbul|Budapest/i },
  { label: "NATO-EU/ESDI architecture", bonus: 18, pattern: /NATO-EU|\bESDI\b|European Union|\bEU\b/i },
  { label: "Madrid/accession thread", bonus: 18, pattern: /Madrid|accession|ratification|enlargement|Poland|Hungary|Czech/i },
  { label: "NATO-Russia thread", bonus: 18, pattern: /NATO-Russia|Founding Act|Yeltsin|Putin|Kozyrev|Primakov|Mamedov|Chernomyrdin/i }
];

function chapterId(chapterName) {
  return `chapter-${chapterName.toLowerCase().replaceAll(" ", "-")}`;
}

function formatDate(dateString) {
  if (!dateString) return "Date pending";
  const date = new Date(`${dateString}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function byChapterThenDate(a, b) {
  return (
    a.chapter.number - b.chapter.number ||
    (a.sortDate || a.date).localeCompare(b.sortDate || b.date) ||
    a.title.localeCompare(b.title)
  );
}

function byChronology(a, b) {
  return (
    (a.sortDate || a.date || "9999-12-31").localeCompare(b.sortDate || b.date || "9999-12-31") ||
    (a.washingtonTime || "").localeCompare(b.washingtonTime || "") ||
    (a.title || "").localeCompare(b.title || "")
  );
}

function isDeclassifiedChronologyRecord(record) {
  if (["Scout Lead", "Source Lead"].includes(record.type)) return false;

  const statusText = [
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

  if (record.type === "Context" && /Government Publishing Office|Public Papers|Not applicable/i.test(statusText)) {
    return false;
  }

  return (
    ["Memcon", "Telcon", "Release Packet"].includes(record.type) ||
    /\b(FOIA|MDR|released|declassified|unclassified|excisions?|Presidential Daily Diary)\b/i.test(statusText)
  );
}

function chronologyYear(record) {
  const value = (record.sortDate || record.date || "").slice(0, 4);
  return /^\d{4}$/.test(value) ? value : "pending";
}

function hasValue(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function listValues(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function joinValues(value) {
  return listValues(value).join(", ");
}

function sourcePathParts(record) {
  const source = record.source || {};
  const explicitPath = listValues(source.path);

  if (explicitPath.length) {
    return [source.name, ...explicitPath].filter(Boolean);
  }

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
  const markings = [
    record.originalClassification || record.classification,
    ...listValues(record.documentMarkings),
    record.telegramPrecedence || record.communication?.precedence,
    ...listValues(record.handlingMarkings)
  ].filter(Boolean);
  return markings.join("; ");
}

function compactSource(record) {
  return [
    record.source?.name,
    record.source?.caseNumber,
    record.source?.documentId || record.naid,
    record.sourcePages || record.sourcePdfPages
  ]
    .filter(Boolean)
    .join("; ");
}

function sourceTransmission(record) {
  const communication = record.communication || {};
  const notes = [];

  if (communication.sentTo) {
    const precedence = communication.precedence ? `${communication.precedence} ` : "";
    notes.push(`Sent ${precedence}to ${communication.sentTo}`);
  }

  if (hasValue(communication.sentForInfo)) {
    const verb = communication.sentTo ? "Also sent" : "Sent";
    notes.push(`${verb} for information to ${joinValues(communication.sentForInfo)}`);
  }

  if (communication.channel) {
    notes.push(`Sent via the ${communication.channel} channel`);
  }

  const location = record.meetingLocation || record.venue;
  if (location) notes.push(`The meeting took place in ${location}`);

  return notes.map((note) => (note.endsWith(".") ? note : `${note}.`)).join(" ");
}

function sourceClearance(record) {
  const clearance = record.clearance || {};
  const clauses = listValues(record.draftingInfo).map((value) => value.replace(/\.$/, ""));
  if (hasValue(clearance.draftedBy)) clauses.push(`Drafted by ${joinValues(clearance.draftedBy)}`);
  if (hasValue(clearance.clearedBy)) clauses.push(`cleared by ${joinValues(clearance.clearedBy)}`);
  if (hasValue(clearance.approvedBy)) clauses.push(`approved by ${joinValues(clearance.approvedBy)}`);
  return clauses.length ? `${clauses.join("; ")}.` : "";
}

function chronologyNextAction(record) {
  const note = [record.sourceNoteAddendum, record.compilerNote, ...(record.compilerNotes || [])].filter(Boolean).join(" ");
  const issues = getProductionIssues(record);

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

function createSourceNoteDraft(record) {
  if (record.sourceNote) return record.sourceNote;

  const path = sourcePathParts(record);
  if (!path.length) return "Source: Citation pending.";

  const sentences = [`Source: ${path.join(", ")}.`];
  const markings = sourceMarkings(record);
  const transmission = sourceTransmission(record);
  const clearance = sourceClearance(record);

  if (markings) sentences.push(`${markings}.`);
  if (transmission) sentences.push(transmission);
  if (clearance) sentences.push(clearance);
  if (record.sourcePages || record.sourcePdfPages) sentences.push(`Source pages: ${record.sourcePages || record.sourcePdfPages}.`);
  return sentences.join(" ").replace(/\s+/g, " ").trim();
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildChronologyCsv(records) {
  const columns = [
    ["date", (record) => record.sortDate || record.date || ""],
    ["washington_time", (record) => record.washingtonTime || ""],
    ["type", (record) => record.type || ""],
    ["title", (record) => record.documentTitle || record.title || ""],
    ["participants", (record) => listValues(record.participants).join("; ")],
    ["countries", (record) => listValues(record.countries).join("; ")],
    ["chapter", (record) => record.chapter?.name || ""],
    ["selection_decision", (record) => record.selectionDecision || record.compilerDecision || ""],
    ["declassification", (record) => record.declassificationStatus || record.releaseStatus || ""],
    ["source_id", compactSource],
    ["markings", sourceMarkings],
    ["source_pages", (record) => record.sourcePages || record.sourcePdfPages || ""],
    ["catalog_url", (record) => record.catalogUrl || ""],
    ["pdf_url", (record) => record.pdfUrl || ""],
    ["source_note", createSourceNoteDraft],
    ["next_action", chronologyNextAction]
  ];

  return [
    columns.map(([name]) => name).join(","),
    ...records.map((record) => columns.map(([, getter]) => csvEscape(getter(record))).join(","))
  ].join("\n");
}

function hasSourceCitation(record) {
  const note = [record.sourceNote, record.sourceNoteAddendum].filter(Boolean).join(" ");
  const noteLooksComplete = /^Source:\s+\S/i.test(note) && !/pending|sample only|replace|\[[^\]]+\]/i.test(note);
  const pathLooksComplete = sourcePathParts(record).length >= 2;
  const hasMarkings = Boolean(noteLooksComplete || sourceMarkings(record));

  return (noteLooksComplete || pathLooksComplete) && hasMarkings;
}

function getProductionIssues(record) {
  if (Array.isArray(record.productionIssues)) return record.productionIssues;

  const issues = [];
  const selectionDecision = record.selectionDecision || record.compilerDecision;
  const annotation = record.annotation || {};

  if (!selectionDecision || selectionDecision === "Pending") issues.push("needs-selection");

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

  if (!record.annotationStatus && !hasValue(annotation.firstFootnote) && !hasValue(annotation.relatedDocuments)) {
    issues.push("needs-annotation");
  }

  if (!hasValue(record.indexTerms) && !hasValue(record.persons) && !hasValue(record.frusTopics)) {
    issues.push("needs-index");
  }

  return issues;
}

function isReadyForSelection(record) {
  const decision = record.selectionDecision || record.compilerDecision;
  const issues = getProductionIssues(record);
  return (
    ["Include candidate", "Context candidate", "Ready for editor"].includes(decision) &&
    !issues.some((issue) => ["needs-source", "needs-chronology", "needs-declass"].includes(issue))
  );
}

function setChapterCounts(records) {
  totalRecords.textContent = records.length.toString();
  decisionReady.textContent = records.filter(isReadyForSelection).length.toString();
  provenanceGaps.textContent = records.filter((record) => getProductionIssues(record).includes("needs-source")).length.toString();
  declassWatch.textContent = records
    .filter((record) => {
      const status = record.declassificationStatus || record.releaseStatus || "";
      return getProductionIssues(record).includes("needs-declass") || /pending|excised|withheld|partial|mixed/i.test(status);
    })
    .length.toString();

  for (const chapterName of CHAPTER_ORDER) {
    const chapterRecords = records.filter((record) => record.chapter.name === chapterName);
    const countNode = document.querySelector(`[data-chapter-count="${chapterName}"]`);
    const pagesNode = document.querySelector(`[data-chapter-pages="${chapterName}"]`);
    const pageTotal = chapterRecords.reduce((sum, record) => sum + (record.pageCount || 0), 0);

    if (countNode) countNode.textContent = chapterRecords.length.toString();
    if (pagesNode) pagesNode.textContent = pageTotal ? pageTotal.toString() : "source";
  }
}

function createMeta(record) {
  const meta = document.createElement("div");
  meta.className = "record-meta";

  const countries = record.countries?.filter((country) => country !== "United States").join(", ");
  const sourceId = record.naid
    ? record.naid.match(/^\d+$/)
      ? `NAID ${record.naid}`
      : record.naid
    : record.source?.caseNumber;
  const extent = record.pageCount
    ? `${record.pageCount} pages`
    : record.digitalObjects
      ? `${record.digitalObjects} digital objects`
      : "Extent pending";

  for (const value of [
    record.type,
    record.selectionDecision,
    countries,
    extent,
    sourceId,
    record.declassificationStatus || record.releaseStatus
  ]) {
    if (!value) continue;
    const item = document.createElement("span");
    item.textContent = value;
    meta.append(item);
  }

  return meta;
}

function createParagraph(className, text) {
  const paragraph = document.createElement("p");
  paragraph.className = className;
  paragraph.textContent = text;
  return paragraph;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}

function createCopyButton(label, text) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", async () => {
    const original = button.textContent;
    try {
      await copyText(text);
      button.textContent = "Copied";
      button.classList.add("is-copied");
    } catch (error) {
      button.textContent = "Copy failed";
    }
    window.setTimeout(() => {
      button.textContent = original;
      button.classList.remove("is-copied");
    }, 1800);
  });
  return button;
}

function createRecordRow(record) {
  const row = document.createElement("article");
  row.className = "record-row";

  const date = document.createElement("time");
  date.className = "record-date";
  date.dateTime = record.date;
  date.textContent = formatDate(record.date);

  const body = document.createElement("div");
  const title = document.createElement(record.catalogUrl || record.pdfUrl ? "a" : "span");
  title.className = "record-title";
  if (record.catalogUrl || record.pdfUrl) {
    title.href = record.catalogUrl || record.pdfUrl;
    title.rel = "noreferrer";
  }
  title.textContent = record.documentTitle || record.title;

  body.append(
    title,
    createParagraph("record-date-line", record.dateLine || formatDate(record.date)),
    createParagraph("record-subject", record.subjectLine || record.title),
    createMeta(record),
    createParagraph("record-source-note", createSourceNoteDraft(record))
  );

  if (record.sourceNoteAddendum) {
    body.append(createParagraph("record-extraction-note", `Source-note review: ${record.sourceNoteAddendum}`));
  }

  body.append(createProductionBlock(record));

  if (record.extractionStatus) {
    body.append(createParagraph("record-extraction-note", `Extraction: ${record.extractionStatus}`));
  }

  const links = document.createElement("div");
  links.className = "record-links";

  if (record.catalogUrl) {
    const source = document.createElement("a");
    source.href = record.catalogUrl;
    source.rel = "noreferrer";
    source.textContent = record.naid?.match(/^\d+$/) ? "Catalog" : "Source";
    links.append(source);
  }

  if (record.pdfUrl) {
    const pdf = document.createElement("a");
    pdf.href = record.pdfUrl;
    pdf.rel = "noreferrer";
    pdf.target = "_blank";
    pdf.textContent = "Open PDF";
    links.append(pdf);
  }

  if (record.transcriptionUrl) {
    const transcript = document.createElement("a");
    transcript.href = record.transcriptionUrl;
    transcript.rel = "noreferrer";
    transcript.textContent = "Transcript";
    links.append(transcript);
  }

  const sourceNoteDraft = createSourceNoteDraft(record);
  if (sourceNoteDraft && !/Citation pending/i.test(sourceNoteDraft)) {
    links.append(createCopyButton("Copy source note", sourceNoteDraft));
  }

  row.append(date, body, links);
  return row;
}

function createProductionBlock(record) {
  const block = document.createElement("div");
  block.className = "production-block";

  const issues = getProductionIssues(record);
  const gate = document.createElement("div");
  gate.className = issues.length ? "gate-status has-gaps" : "gate-status ready";
  gate.textContent = issues.length
    ? `Production gaps: ${issues.map(formatIssue).join(", ")}`
    : "Production gates ready";
  block.append(gate);

  const items = [
    ["Decision", record.selectionDecision || record.compilerDecision || "Pending"],
    ["Washington time", record.washingtonTime || "Pending"],
    ["Archival path", sourcePathParts(record).join(" / ") || "Pending"],
    ["Document ID", record.source?.documentId || record.source?.caseNumber || record.naid || "Pending"],
    ["Markings", sourceMarkings(record) || "Pending"],
    ["Transmission", sourceTransmission(record) || record.distribution || "Pending"],
    ["Draft/clear/approve", sourceClearance(record) || "Pending"],
    ["Read by", joinValues(record.readBy) || "Pending"],
    ["Declass", record.declassificationStatus || record.releaseStatus || "Pending"],
    ["Index terms", Array.isArray(record.indexTerms) ? record.indexTerms.join(", ") : record.indexTerms || "Pending"]
  ];

  const list = document.createElement("dl");
  list.className = "production-list";
  for (const [term, value] of items) {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    row.append(dt, dd);
    list.append(row);
  }
  block.append(list);

  if (record.withheldMaterial) {
    const note = document.createElement("p");
    note.className = "record-extraction-note";
    const omitted = [
      record.withheldMaterial.omittedPages ? `${record.withheldMaterial.omittedPages} pages` : "",
      record.withheldMaterial.omittedLines ? `${record.withheldMaterial.omittedLines} lines` : ""
    ]
      .filter(Boolean)
      .join(" / ");
    note.textContent = `Withheld material: ${record.withheldMaterial.status || "noted"}${omitted ? `, ${omitted}` : ""}. ${
      record.withheldMaterial.description || ""
    }`;
    block.append(note);
  }

  return block;
}

function formatIssue(issue) {
  return {
    "needs-selection": "selection",
    "needs-source": "source note",
    "needs-chronology": "chronology",
    "needs-declass": "declass",
    "needs-annotation": "annotation",
    "needs-index": "index terms"
  }[issue] || issue;
}

function ensureActionQueueSurface() {
  const nav = document.querySelector("nav");
  if (nav && !nav.querySelector('a[href="#queue"]')) {
    const link = document.createElement("a");
    link.href = "#queue";
    link.textContent = "Action Queue";
    nav.insertBefore(link, nav.querySelector('a[href="#gaps"]') || nav.children[1] || null);
  }

  if (!queueRoot) {
    const chronologySection = document.querySelector("#chronology");
    const section = document.createElement("section");
    section.className = "section queue-section";
    section.id = "queue";
    section.setAttribute("aria-labelledby", "queue-title");
    section.innerHTML = `
      <div class="section-heading">
        <p class="kicker">Today's Work</p>
        <h2 id="queue-title">Compiler Action Queue</h2>
      </div>
      <p class="records-intro">
        This generated queue turns the corpus into a work order: promote the
        highest-value file-unit leads, chase Daily Diary events back to
        substantive records, repair source-note and declassification gaps, and
        rebalance the volume away from crisis-heavy coverage.
      </p>
      <div class="queue-summary" aria-label="Action queue summary">
        <div><span data-queue-metric="promotion">0</span><p>lead-promotion tasks</p></div>
        <div><span data-queue-metric="source">0</span><p>source-note or declass fixes</p></div>
        <div><span data-queue-metric="diary">0</span><p>Daily Diary chase items</p></div>
        <div><span data-queue-metric="coverage">0</span><p>coverage-balancing leads</p></div>
      </div>
      <div class="report-links action-queue-links" aria-label="Action queue exports">
        <a href="#records">Open lane browser</a>
        <button type="button" id="download-action-queue-csv">Download action queue CSV</button>
        <a href="reports/frus-v17-compiler-workbook.xlsx" download>Compiler workbook</a>
        <a href="reports/presidential-daily-diary-chase-sheet.csv" download>Daily Diary chase sheet</a>
        <a href="reports/compiler-gap-analysis.md" rel="noreferrer">Compiler gap report</a>
        <a href="reports/clinton-library-pull-sheet.csv" download>Clinton Library pull sheet</a>
        <a href="reports/clinton-library-research-plan.md" rel="noreferrer">Clinton Library pull queue</a>
      </div>
      <div id="queue-root" class="queue-root" aria-live="polite">
        <p class="loading">Building compiler action queue...</p>
      </div>
    `;

    if (chronologySection?.parentNode) {
      chronologySection.parentNode.insertBefore(section, chronologySection.nextSibling);
    }

    queueRoot = section.querySelector("#queue-root");
    actionQueueCsvControl = section.querySelector("#download-action-queue-csv");
  }

  if (!document.querySelector("#action-queue-fallback-styles")) {
    const style = document.createElement("style");
    style.id = "action-queue-fallback-styles";
    style.textContent = `
      .queue-section{padding-top:56px}.queue-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.queue-summary div{min-height:142px;padding:18px;color:white;background:var(--green);border-radius:8px}.queue-summary div:nth-child(2){background:var(--navy)}.queue-summary div:nth-child(3){background:var(--red)}.queue-summary div:nth-child(4){color:var(--ink);background:var(--gold)}.queue-summary span{display:block;margin-bottom:14px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(2rem,4vw,3rem);font-weight:800;line-height:1}.queue-summary p{margin:0;font-weight:800;line-height:1.45}.queue-root{display:grid;gap:28px;margin-top:24px}.queue-group{display:grid;gap:12px}.queue-group-header{display:flex;align-items:end;justify-content:space-between;gap:18px;padding-bottom:10px;border-bottom:2px solid var(--green)}.queue-group-header h3{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.5rem,3vw,2.1rem)}.queue-group-header p{margin:0;color:var(--muted);font-weight:900}.queue-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.queue-item{display:grid;gap:10px;min-height:auto;padding:16px}.queue-item-top{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:10px;align-items:start}.queue-rank,.queue-score{display:inline-flex;min-height:30px;align-items:center;justify-content:center;padding:0 9px;font-size:.76rem;font-weight:900;line-height:1;border-radius:6px}.queue-rank{color:white;background:var(--navy)}.queue-score{color:var(--navy);background:rgba(37,54,79,.08);white-space:nowrap}.queue-item h4{margin:2px 0 0;color:var(--ink);font-family:Georgia,"Times New Roman",serif;font-size:1.02rem;line-height:1.35;overflow-wrap:anywhere}.queue-meta,.queue-reason,.queue-action{margin:0;font-size:.9rem;font-weight:800;line-height:1.48;overflow-wrap:anywhere}.queue-meta{color:var(--navy)}.queue-action{padding:10px 12px;color:var(--ink);background:rgba(47,103,95,.09);border-left:3px solid var(--green);border-radius:6px}.report-links button{display:inline-flex;min-height:40px;align-items:center;padding:0 12px;color:var(--navy);font:inherit;font-size:.84rem;font-weight:900;text-decoration:none;background:rgba(37,54,79,.08);border:1px solid rgba(37,54,79,.14);border-radius:6px;cursor:pointer}@media(max-width:980px){.queue-summary,.queue-list{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:680px){.queue-summary,.queue-list{grid-template-columns:1fr}.queue-group-header{align-items:flex-start;flex-direction:column}.queue-item-top{grid-template-columns:40px minmax(0,1fr)}.queue-score{width:fit-content;grid-column:2}}
    `;
    document.head.append(style);
  }
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
    ...(record.persons || []),
    ...(record.participants || []),
    ...(record.countries || []),
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
  const signals = COVERAGE_SIGNALS.filter((signal) => signal.pattern.test(text)).map(({ label }) => label);
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

function actionQueueCategory(record, issues, signals) {
  if (isDailyDiaryRecord(record)) return "Chase Diary Leads";
  if (signals.some((signal) => /gap|architecture|late-volume|non-crisis/i.test(signal))) return "Rebalance Coverage";
  if (record.type === "Scout Lead" || record.type === "Release Packet") return "Promote Leads";
  if (issues.some((issue) => ["needs-source", "needs-chronology", "needs-declass"].includes(issue))) {
    return "Fix Source and Declass";
  }
  if (issues.includes("needs-selection") || record.type === "Source Lead") return "Selection Triage";
  return "Final Review";
}

function actionQueueNextStep(record, issues) {
  if (isDailyDiaryRecord(record)) {
    return "Use the diary entry as a time-and-participants lead, then chase the substantive memcon, telcon, briefing book, trip file, or summit file.";
  }

  if (record.type === "Scout Lead") {
    return "Open the catalog PDF or digital object; extract only document-level items with actual dates, page spans, markings, and a FRUS-style source path.";
  }

  if (record.type === "Release Packet") {
    return "Split the packet into document-level records and record the source page span, markings, excisions, and selection decision for each item.";
  }

  if (record.type === "Source Lead") {
    return "Read the released PDF, decide include/context/exclude, and extract the title, date, page span, markings, source note, and annotation leads.";
  }

  if (issues.includes("needs-source")) {
    return "Repair the first source note: repository path, collection or file, item identifier, markings, channel, clearance, page span, and excision note.";
  }

  if (issues.includes("needs-chronology")) {
    return "Verify Washington time and chronological placement from the source image, diary, trip book, or call log.";
  }

  if (issues.includes("needs-declass")) {
    return "Check the source image for release status, withheld pages or lines, excisions, and any withdrawal sheets.";
  }

  if (issues.includes("needs-selection")) {
    return "Make the include, context, duplicate/source-control, or exclude decision before further annotation work.";
  }

  return chronologyNextAction(record);
}

function actionQueueScore(record) {
  const issues = getProductionIssues(record);
  const decision = record.selectionDecision || record.compilerDecision || "";
  const year = recordYear(record);
  let score = 0;

  if (decision === "Include candidate") score += 44;
  else if (decision === "Context candidate") score += 32;
  else if (decision === "Pending") score += 20;
  else score += 12;

  score +=
    {
      "Release Packet": 24,
      "Scout Lead": 22,
      "Source Lead": 18,
      Memcon: 18,
      Telcon: 18,
      Context: 10
    }[record.type] || 8;

  if (record.pdfUrl || record.source?.pdfUrl) score += 9;
  if (record.catalogUrl || record.source?.url) score += 5;
  if (record.date === "1993-01-01" && record.type === "Scout Lead") score += 10;
  if (year && year >= 1997) score += 4;

  score += coverageBonus(record);

  if (record.chapter?.name === "Crisis Security Files") {
    const gapSignals = coverageSignals(record).filter((signal) => /gap|architecture|late-volume/i.test(signal));
    score -= gapSignals.length ? 18 : 42;
    if (["Scout Lead", "Source Lead"].includes(record.type) && !gapSignals.length) score -= 28;
  }

  for (const issue of issues) {
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

function buildActionQueue(records, limit = 96) {
  const scored = records
    .map((record) => {
      const issues = getProductionIssues(record);
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
        byChronology(a.record, b.record)
      );
    });

  return scored.slice(0, limit).map((item, index) => ({ ...item, rank: index + 1 }));
}

function buildActionQueueCsv(records) {
  const columns = [
    ["rank", (item) => item.rank],
    ["category", (item) => item.category],
    ["priority_score", (item) => item.score],
    ["date", (item) => item.record.sortDate || item.record.date || ""],
    ["type", (item) => item.record.type || ""],
    ["title", (item) => item.record.documentTitle || item.record.title || ""],
    ["chapter", (item) => item.record.chapter?.name || ""],
    ["selection_decision", (item) => item.record.selectionDecision || item.record.compilerDecision || ""],
    ["production_issues", (item) => item.issues.map(formatIssue).join("; ")],
    ["coverage_signals", (item) => item.signals.join("; ")],
    ["next_action", (item) => item.nextAction],
    ["catalog_url", (item) => item.record.catalogUrl || item.record.source?.url || ""],
    ["pdf_url", (item) => item.record.pdfUrl || item.record.source?.pdfUrl || ""],
    ["source_note", (item) => createSourceNoteDraft(item.record)]
  ];

  const queue = buildActionQueue(records, Number.POSITIVE_INFINITY);
  return [
    columns.map(([name]) => name).join(","),
    ...queue.map((item) => columns.map(([, getter]) => csvEscape(getter(item))).join(","))
  ].join("\n");
}

function setActionQueueMetrics(items) {
  const metrics = {
    promotion: items.filter((item) => ["Scout Lead", "Source Lead", "Release Packet"].includes(item.record.type)).length,
    source: items.filter((item) =>
      item.issues.some((issue) => ["needs-source", "needs-chronology", "needs-declass"].includes(issue))
    ).length,
    diary: items.filter((item) => item.category === "Chase Diary Leads").length,
    coverage: items.filter((item) => item.signals.length).length
  };

  for (const [key, value] of Object.entries(metrics)) {
    const node = document.querySelector(`[data-queue-metric="${key}"]`);
    if (node) node.textContent = value.toString();
  }
}

function createQueueItem(item) {
  const { record } = item;
  const article = document.createElement("article");
  article.className = "queue-item";

  const top = document.createElement("div");
  top.className = "queue-item-top";

  const rank = document.createElement("span");
  rank.className = "queue-rank";
  rank.textContent = String(item.displayRank || item.rank).padStart(2, "0");

  const title = document.createElement("h4");
  title.textContent = record.documentTitle || record.title;

  const score = document.createElement("span");
  score.className = "queue-score";
  score.textContent = `Priority ${item.score}`;
  top.append(rank, title, score);

  const meta = document.createElement("p");
  meta.className = "queue-meta";
  meta.textContent = [
    formatDate(record.sortDate || record.date),
    record.type,
    record.chapter?.name,
    record.selectionDecision || record.compilerDecision
  ]
    .filter(Boolean)
    .join(" / ");

  const reason = document.createElement("p");
  reason.className = "queue-reason";
  const issueText = item.issues.length ? item.issues.map(formatIssue).join(", ") : "ready-check";
  const signalText = item.signals.length ? item.signals.join(", ") : "no special coverage signal";
  reason.textContent = `Why: ${issueText}; ${signalText}.`;

  const action = document.createElement("p");
  action.className = "queue-action";
  action.textContent = item.nextAction;

  const links = document.createElement("div");
  links.className = "record-links";

  if (record.catalogUrl || record.source?.url) {
    const source = document.createElement("a");
    source.href = record.catalogUrl || record.source.url;
    source.rel = "noreferrer";
    source.textContent = "Source";
    links.append(source);
  }

  if (record.pdfUrl || record.source?.pdfUrl) {
    const pdf = document.createElement("a");
    pdf.href = record.pdfUrl || record.source.pdfUrl;
    pdf.rel = "noreferrer";
    pdf.target = "_blank";
    pdf.textContent = "Open PDF";
    links.append(pdf);
  }

  article.append(top, meta, reason, action, links);
  return article;
}

function renderActionQueue(records) {
  if (!queueRoot) return;

  const fullQueue = buildActionQueue(records, Number.POSITIVE_INFINITY);
  setActionQueueMetrics(fullQueue);
  queueRoot.replaceChildren();

  if (!fullQueue.length) {
    queueRoot.innerHTML = `
      <div class="empty-state">
        <h3>No action queue items</h3>
        <p>The current records do not expose source, chronology, declassification, diary, or coverage-balancing work.</p>
      </div>
    `;
    return;
  }

  for (const groupName of QUEUE_GROUP_ORDER) {
    const groupItems = fullQueue.filter((item) => item.category === groupName);
    if (!groupItems.length) continue;

    const section = document.createElement("section");
    section.className = "queue-group";

    const header = document.createElement("div");
    header.className = "queue-group-header";

    const heading = document.createElement("h3");
    heading.textContent = groupName;

    const count = document.createElement("p");
    count.textContent = `${fullQueue.filter((item) => item.category === groupName).length} queued`;
    header.append(heading, count);

    const list = document.createElement("div");
    list.className = "queue-list";
    groupItems.slice(0, 12).forEach((item, index) => {
      list.append(createQueueItem({ ...item, displayRank: index + 1 }));
    });

    section.append(header, list);
    queueRoot.append(section);
  }
}

const CITATION_GROUP_ORDER = [
  "Repair First Note",
  "Verify Time and Placement",
  "Verify Declassification",
  "Copy-Ready Drafts"
];

function isDeclassCheck(record) {
  const status = [record.declassificationStatus, record.releaseStatus, record.withheldMaterial?.status].filter(Boolean).join(" ");
  return /pending|excised|withheld|partial|mixed|not yet audited/i.test(status);
}

function citationStatus(record, issues) {
  const note = createSourceNoteDraft(record);
  if (!note || /Citation pending/i.test(note) || issues.includes("needs-source")) return "needs source-note repair";
  if (issues.includes("needs-chronology")) return "needs time or placement check";
  if (issues.includes("needs-declass") || isDeclassCheck(record)) return "needs declassification check";
  if (/verify|pending review|not yet audited/i.test([record.sourceNoteAddendum, record.declassificationStatus].filter(Boolean).join(" "))) {
    return "draft; verify against source image";
  }
  return "copy-ready draft";
}

function citationGroup(record, issues) {
  if (issues.includes("needs-source")) return "Repair First Note";
  if (issues.includes("needs-chronology")) return "Verify Time and Placement";
  if (issues.includes("needs-declass") || isDeclassCheck(record)) return "Verify Declassification";
  return "Copy-Ready Drafts";
}

function citationPriority(record, issues) {
  const decision = record.selectionDecision || record.compilerDecision || "";
  let score = 0;
  if (decision === "Include candidate") score += 60;
  else if (decision === "Context candidate") score += 42;
  else if (decision === "Pending") score += 24;
  if (["Memcon", "Telcon"].includes(record.type)) score += 20;
  if (record.type === "Release Packet") score += 16;
  if (issues.includes("needs-source")) score += 36;
  if (issues.includes("needs-chronology")) score += 30;
  if (issues.includes("needs-declass") || isDeclassCheck(record)) score += 24;
  if (record.sourcePages || record.pageCount) score += 8;
  if (record.pdfUrl || record.source?.pdfUrl) score += 6;
  if (record.chapter?.name !== "Crisis Security Files") score += 8;
  return score;
}

function citationNextAction(record, issues) {
  if (issues.includes("needs-source")) {
    return "Repair footnote 1 from the source image: repository path, exact item, markings, page span, channel, clearance, and excision note.";
  }

  if (issues.includes("needs-chronology")) {
    return "Verify Washington time and date line before copying this citation into the document sequence.";
  }

  if (issues.includes("needs-declass") || isDeclassCheck(record)) {
    return "Check withdrawal sheets, excisions, omitted pages or lines, and release status before final source-note use.";
  }

  if (/verify|pending review|not yet audited/i.test([record.sourceNoteAddendum, record.declassificationStatus].filter(Boolean).join(" "))) {
    return "Copy as a working draft only; confirm markings, marginalia, attachments, and declassification details against the source image.";
  }

  return "Copy into the draft document and continue annotation, cross-reference, and index review.";
}

function buildCitationDesk(records, limit = 96) {
  const items = records
    .map((record) => {
      const issues = getProductionIssues(record);
      return {
        record,
        issues,
        group: citationGroup(record, issues),
        priority: citationPriority(record, issues),
        status: citationStatus(record, issues),
        nextAction: citationNextAction(record, issues),
        sourceNote: createSourceNoteDraft(record)
      };
    })
    .filter((item) => {
      const decision = item.record.selectionDecision || item.record.compilerDecision || "";
      return (
        ["Include candidate", "Context candidate"].includes(decision) ||
        item.issues.some((issue) => ["needs-source", "needs-chronology", "needs-declass"].includes(issue)) ||
        item.group !== "Copy-Ready Drafts"
      );
    })
    .sort((a, b) => {
      return (
        CITATION_GROUP_ORDER.indexOf(a.group) - CITATION_GROUP_ORDER.indexOf(b.group) ||
        b.priority - a.priority ||
        byChronology(a.record, b.record)
      );
    });

  return items.slice(0, limit).map((item, index) => ({ ...item, rank: index + 1 }));
}

function buildCitationCsv(records) {
  const columns = [
    ["rank", (item) => item.rank],
    ["citation_group", (item) => item.group],
    ["priority_score", (item) => item.priority],
    ["date", (item) => item.record.sortDate || item.record.date || ""],
    ["type", (item) => item.record.type || ""],
    ["title", (item) => item.record.documentTitle || item.record.title || ""],
    ["chapter", (item) => item.record.chapter?.name || ""],
    ["selection_decision", (item) => item.record.selectionDecision || item.record.compilerDecision || ""],
    ["citation_status", (item) => item.status],
    ["production_issues", (item) => item.issues.map(formatIssue).join("; ")],
    ["source_path", (item) => sourcePathParts(item.record).join(" / ")],
    ["markings", (item) => sourceMarkings(item.record)],
    ["source_pages", (item) => item.record.sourcePages || item.record.sourcePdfPages || ""],
    ["declassification", (item) => item.record.declassificationStatus || item.record.releaseStatus || ""],
    ["next_action", (item) => item.nextAction],
    ["source_note", (item) => item.sourceNote],
    ["catalog_url", (item) => item.record.catalogUrl || item.record.source?.url || ""],
    ["pdf_url", (item) => item.record.pdfUrl || item.record.source?.pdfUrl || ""]
  ];

  const desk = buildCitationDesk(records, Number.POSITIVE_INFINITY);
  return [
    columns.map(([name]) => name).join(","),
    ...desk.map((item) => columns.map(([, getter]) => csvEscape(getter(item))).join(","))
  ].join("\n");
}

function setCitationMetrics(records) {
  const metrics = records.reduce(
    (acc, record) => {
      const issues = getProductionIssues(record);
      const note = createSourceNoteDraft(record);
      if (note && !/Citation pending/i.test(note) && !issues.includes("needs-source")) acc.copyReady += 1;
      if (issues.includes("needs-source")) acc.sourceGaps += 1;
      if (issues.includes("needs-chronology")) acc.timeGaps += 1;
      if (issues.includes("needs-declass") || isDeclassCheck(record)) acc.declassChecks += 1;
      return acc;
    },
    { copyReady: 0, sourceGaps: 0, timeGaps: 0, declassChecks: 0 }
  );

  for (const [key, value] of Object.entries(metrics)) {
    const node = document.querySelector(`[data-citation-metric="${key}"]`);
    if (node) node.textContent = value.toString();
  }
}

function createCitationItem(item) {
  const { record } = item;
  const article = document.createElement("article");
  article.className = "citation-item";

  const top = document.createElement("div");
  top.className = "citation-item-top";

  const rank = document.createElement("span");
  rank.className = "queue-rank";
  rank.textContent = String(item.displayRank || item.rank).padStart(2, "0");

  const title = document.createElement("h4");
  title.textContent = record.documentTitle || record.title;

  const status = document.createElement("span");
  status.className = "citation-status";
  status.textContent = item.status;
  top.append(rank, title, status);

  const meta = document.createElement("p");
  meta.className = "queue-meta";
  meta.textContent = [
    formatDate(record.sortDate || record.date),
    record.type,
    record.chapter?.name,
    record.selectionDecision || record.compilerDecision
  ]
    .filter(Boolean)
    .join(" / ");

  const note = document.createElement("p");
  note.className = "citation-note";
  note.textContent = item.sourceNote;

  const action = document.createElement("p");
  action.className = "queue-action";
  action.textContent = item.nextAction;

  const links = document.createElement("div");
  links.className = "record-links";
  links.append(createCopyButton("Copy source note", item.sourceNote));

  if (record.catalogUrl || record.source?.url) {
    const source = document.createElement("a");
    source.href = record.catalogUrl || record.source.url;
    source.rel = "noreferrer";
    source.textContent = "Source";
    links.append(source);
  }

  if (record.pdfUrl || record.source?.pdfUrl) {
    const pdf = document.createElement("a");
    pdf.href = record.pdfUrl || record.source.pdfUrl;
    pdf.rel = "noreferrer";
    pdf.target = "_blank";
    pdf.textContent = "Open PDF";
    links.append(pdf);
  }

  article.append(top, meta, note, action, links);
  return article;
}

function renderCitationDesk(records) {
  if (!citationRoot) return;

  const fullDesk = buildCitationDesk(records, Number.POSITIVE_INFINITY);
  setCitationMetrics(records);
  citationRoot.replaceChildren();

  if (!fullDesk.length) {
    citationRoot.innerHTML = `
      <div class="empty-state">
        <h3>No citation work queued</h3>
        <p>The current records do not expose source-note, chronology, or declassification citation work.</p>
      </div>
    `;
    return;
  }

  for (const groupName of CITATION_GROUP_ORDER) {
    const groupItems = fullDesk.filter((item) => item.group === groupName);
    if (!groupItems.length) continue;

    const section = document.createElement("section");
    section.className = "citation-group";

    const header = document.createElement("div");
    header.className = "queue-group-header";

    const heading = document.createElement("h3");
    heading.textContent = groupName;

    const count = document.createElement("p");
    count.textContent = `${fullDesk.filter((item) => item.group === groupName).length} queued`;
    header.append(heading, count);

    const list = document.createElement("div");
    list.className = "citation-list";
    groupItems.slice(0, 12).forEach((item, index) => {
      list.append(createCitationItem({ ...item, displayRank: index + 1 }));
    });

    section.append(header, list);
    citationRoot.append(section);
  }
}

function renderEmptyState() {
  recordsRoot.innerHTML = `
    <div class="empty-state">
      <h3>No compiler records yet</h3>
      <p>Add verified entries to <code>data/records.json</code>, then refresh <code>data/records.js</code> for direct-file viewing.</p>
      <div class="empty-grid" aria-label="Recommended first fields">
        <span>selectionDecision</span>
        <span>washingtonTime</span>
        <span>sourceNote</span>
        <span>source.path</span>
        <span>documentMarkings</span>
        <span>handlingMarkings</span>
        <span>clearance</span>
        <span>communication</span>
        <span>declassificationStatus</span>
        <span>indexTerms</span>
      </div>
    </div>
  `;
}

function renderRecords(records) {
  const sorted = [...records].sort(byChapterThenDate);
  recordsRoot.replaceChildren();

  if (!sorted.length) {
    renderEmptyState();
    return;
  }

  for (const chapterName of CHAPTER_ORDER) {
    const chapterRecords = sorted.filter((record) => record.chapter.name === chapterName);
    if (!chapterRecords.length) continue;

    const section = document.createElement("section");
    section.className = "record-chapter";
    section.id = chapterId(chapterName);

    const header = document.createElement("div");
    header.className = "record-chapter-header";

    const heading = document.createElement("h3");
    heading.textContent = `Lane ${CHAPTER_ORDER.indexOf(chapterName) + 1}: ${chapterName}`;

    const count = document.createElement("p");
    count.className = "record-count";
    const pageTotal = chapterRecords.reduce((sum, record) => sum + (record.pageCount || 0), 0);
    count.textContent = pageTotal
      ? `${chapterRecords.length} records / ${pageTotal} pages or digital objects`
      : `${chapterRecords.length} records`;
    header.append(heading, count);

    const list = document.createElement("div");
    list.className = "record-list";
    for (const record of chapterRecords) list.append(createRecordRow(record));

    section.append(header, list);
    recordsRoot.append(section);
  }
}

function renderChronology(records) {
  if (!chronologyRoot) return;

  const sorted = records.filter(isDeclassifiedChronologyRecord).sort(byChronology);
  chronologyRoot.replaceChildren();

  if (!sorted.length) {
    chronologyRoot.innerHTML = `
      <div class="empty-state">
        <h3>No declassified documents in the chronology yet</h3>
        <p>Promote released source leads into document-level records with dates, page spans, and source notes.</p>
      </div>
    `;
    return;
  }

  const years = [...new Set(sorted.map(chronologyYear))];

  for (const year of years) {
    const yearRecords = sorted.filter((record) => chronologyYear(record) === year);
    const section = document.createElement("section");
    section.className = "record-chapter chronology-year";
    section.id = `chronology-${year}`;

    const header = document.createElement("div");
    header.className = "record-chapter-header";

    const heading = document.createElement("h3");
    heading.textContent = year === "pending" ? "Date Pending" : year;

    const count = document.createElement("p");
    count.className = "record-count";
    count.textContent = `${yearRecords.length} declassified or released records`;
    header.append(heading, count);

    const list = document.createElement("div");
    list.className = "record-list";
    for (const record of yearRecords) list.append(createRecordRow(record));

    section.append(header, list);
    chronologyRoot.append(section);
  }
}

function filterRecords() {
  const query = searchInput?.value.trim().toLowerCase() || "";
  const records = allRecords.filter((record) => {
    const matchesFilter = activeFilter === "all" || record.type === activeFilter;
    const matchesIssue = activeIssueFilter === "all" || getProductionIssues(record).includes(activeIssueFilter);
    const haystack = JSON.stringify(record).toLowerCase();
    return matchesFilter && matchesIssue && (!query || haystack.includes(query));
  });
  renderRecords(records);
}

function enableFilters() {
  searchInput?.addEventListener("input", filterRecords);

  for (const button of filterButtons) {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.recordFilter;
      for (const item of filterButtons) {
        item.setAttribute("aria-pressed", String(item === button));
      }
      filterRecords();
    });
  }

  for (const button of issueButtons) {
    button.addEventListener("click", () => {
      activeIssueFilter = button.dataset.issueFilter;
      for (const item of issueButtons) {
        item.setAttribute("aria-pressed", String(item === button));
      }
      filterRecords();
    });
  }
}

function enableChronologyExport() {
  if (!chronologyCsvControl) {
    const links = document.querySelector(".chronology-links");
    if (links) {
      chronologyCsvControl = document.createElement("a");
      chronologyCsvControl.id = "download-chronology-csv";
      chronologyCsvControl.href = "#";
      chronologyCsvControl.textContent = "Download chronology CSV";
      links.insertBefore(chronologyCsvControl, links.children[1] || null);
    }
  }

  chronologyCsvControl?.addEventListener("click", (event) => {
    event.preventDefault();
    const records = allRecords.filter(isDeclassifiedChronologyRecord).sort(byChronology);
    const blob = new Blob([`${buildChronologyCsv(records)}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "frus-v17-declassified-chronology.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
}

function enableActionQueueExport() {
  if (!actionQueueCsvControl) {
    const links = document.querySelector(".action-queue-links");
    if (links) {
      actionQueueCsvControl = document.createElement("a");
      actionQueueCsvControl.id = "download-action-queue-csv";
      actionQueueCsvControl.href = "#";
      actionQueueCsvControl.textContent = "Download action queue CSV";
      links.insertBefore(actionQueueCsvControl, links.children[1] || null);
    }
  }

  actionQueueCsvControl?.addEventListener("click", (event) => {
    event.preventDefault();
    const blob = new Blob([`${buildActionQueueCsv(allRecords)}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "frus-v17-compiler-action-queue.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
}

function enableCitationExport() {
  if (!citationCsvControl) {
    const links = document.querySelector(".citation-links");
    if (links) {
      citationCsvControl = document.createElement("a");
      citationCsvControl.id = "download-citation-csv";
      citationCsvControl.href = "#";
      citationCsvControl.textContent = "Download citation CSV";
      links.insertBefore(citationCsvControl, links.children[1] || null);
    }
  }

  citationCsvControl?.addEventListener("click", (event) => {
    event.preventDefault();
    const blob = new Blob([`${buildCitationCsv(allRecords)}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "frus-v17-citation-desk.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
}

function enableChapterCards() {
  for (const card of document.querySelectorAll(".chapter-card")) {
    card.addEventListener("click", (event) => {
      const targetId = card.getAttribute("href");
      if (!targetId?.startsWith("#")) return;

      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();
      history.pushState(null, "", targetId);
      target.scrollIntoView({ block: "start" });
    });
  }
}

async function loadRecords() {
  const response = await fetch("data/records.json");
  if (!response.ok) throw new Error(`Could not load records: ${response.status}`);
  return response.json();
}

async function init() {
  try {
    allRecords = window.COMPILER_RECORDS || window.MEMCONS || (await loadRecords());
    ensureActionQueueSurface();
    setChapterCounts(allRecords);
    renderChronology(allRecords);
    renderActionQueue(allRecords);
    renderCitationDesk(allRecords);
    renderRecords(allRecords);
    enableFilters();
    enableChronologyExport();
    enableActionQueueExport();
    enableCitationExport();
    enableChapterCards();
    if (window.location.hash) document.querySelector(window.location.hash)?.scrollIntoView();
  } catch (error) {
    recordsRoot.innerHTML =
      '<p class="error">The compiler records could not be loaded. Try opening this site through a local server or GitHub Pages.</p>';
  }
}

init();
