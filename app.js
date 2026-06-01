const CHAPTER_ORDER = [
  "NATO Strategy and Enlargement",
  "NATO-Russia and Partnership",
  "European Security Architecture",
  "Crisis Security Files"
];

const recordsRoot = document.querySelector("#records-root");
const chronologyRoot = document.querySelector("#chronology-root");
let chronologyCsvControl = document.querySelector("#download-chronology-csv");
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
    setChapterCounts(allRecords);
    renderChronology(allRecords);
    renderRecords(allRecords);
    enableFilters();
    enableChronologyExport();
    enableChapterCards();
    if (window.location.hash) document.querySelector(window.location.hash)?.scrollIntoView();
  } catch (error) {
    recordsRoot.innerHTML =
      '<p class="error">The compiler records could not be loaded. Try opening this site through a local server or GitHub Pages.</p>';
  }
}

init();
