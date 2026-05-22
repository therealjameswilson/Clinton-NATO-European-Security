#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const COLLECTION_ROOT = process.env.FRUS_COLLECTION_ROOT || path.resolve(ROOT, "..");
const DATA_DIR = path.join(ROOT, "data");
const REPORT_DIR = path.join(ROOT, "reports");

const FRUS_VOLUME = {
  id: "frus1993-00v17",
  title:
    "Foreign Relations of the United States, 1993-2000, Volume XVII, North Atlantic Treaty Organization; European Security",
  url: "https://history.state.gov/historicaldocuments/frus1993-00v17",
  status: "Planned"
};

const SOURCE_URLS = {
  volume: "https://history.state.gov/historicaldocuments/frus1993-00v17",
  clintonMemcons: "https://www.clintonlibrary.gov/research/memcons-and-telcons",
  clintonLeaderCalls:
    "https://www.clintonlibrary.gov/research/meetings-and-telephone-calls-foreign-leaders",
  stateFoia: "https://foia.state.gov/",
  strobeTalbott: "https://therealjameswilson.github.io/strobe-talbott-foia/manifest.html",
  naraScout: "https://therealjameswilson.github.io/nara-scout/",
  naraCatalog: "https://catalog.archives.gov/",
  govInfo: "https://www.govinfo.gov/app/collection/PPP"
};

const KEY_TERMS =
  /\b(NATO|NAC|Partnership for Peace|PFP|enlargement|expansion|Madrid|Helsinki|Founding Act|NATO-Russia|NATO\/Russia|Russia-NATO|Solana|OSCE|CSCE|CFE|European Security|European Union|EU\b|European Community|Bosnia|Herzegovina|Dayton|IFOR|SFOR|Kosovo|KFOR|Balkans|Serbia|Yugoslav|Milosevic|Milošević|Croatia|Srebrenica|Macedonia|Albania|Poland|Polish|Czech|Havel|Hungary|Romania|Bulgaria|Baltic|Lithuania|Latvia|Estonia)\b/i;

const CRISIS_TERMS = /\b(Bosnia|Herzegovina|Dayton|IFOR|SFOR|Kosovo|KFOR|Balkans|Serbia|Yugoslav|Milosevic|Milošević|Croatia|Srebrenica|Macedonia|Albania|UNPROFOR|Contact Group)\b/i;
const RUSSIA_NATO_TERMS = /\b(NATO-Russia|NATO\/Russia|Russia-NATO|Founding Act|Yeltsin|Primakov|Mamedov|Kozyrev|Russia|Russian|Helsinki|Paris summit)\b/i;
const ARCHITECTURE_TERMS = /\b(OSCE|CSCE|CFE|European Security|European Union|EU\b|European Community|Maastricht|Lisbon|Istanbul summit|arms control)\b/i;
const ENLARGEMENT_TERMS = /\b(NATO|NAC|Partnership for Peace|PFP|enlargement|expansion|Madrid|Solana|Poland|Polish|Czech|Havel|Hungary|Baltic|Lithuania|Latvia|Estonia|Romania|Bulgaria)\b/i;

const SOURCE_PATHS = {
  clintonEuropeRecords: ["Clinton-Europe", "data", "records.json"],
  clintonEuropeStatements: ["Clinton-Europe", "data", "public-statements.json"],
  clintonEuropeStrobe: ["Clinton-Europe", "reports", "strobe-talbott-candidates.json"],
  clintonEuropeNaraScout: ["Clinton-Europe", "reports", "nara-scout-candidates.json"],
  clintonEuropeNaraCollection: [
    "Clinton-Europe",
    "reports",
    "nara-collection-7388808-candidates.json"
  ],
  balkansMap: ["Balkans-93-95", "data", "compiler-map.json"],
  russiaHighLevel: ["Clinton-Russia-High-Level", "data", "memcons.json"]
};

function readJson(parts) {
  const filePath = path.join(COLLECTION_ROOT, ...parts);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function textOf(value) {
  return JSON.stringify(value || "");
}

function leadText(record) {
  return [
    record.title,
    record.scopeAndContentNote,
    record.description,
    record.descriptionExcerpt,
    record.summary
  ]
    .filter(Boolean)
    .join(" ");
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function toIsoDate(value, fallbackYear) {
  if (!value && fallbackYear) return `${fallbackYear}-01-01`;
  if (!value) return "";
  const iso = String(value).match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (iso) return iso;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  if (fallbackYear) return `${fallbackYear}-01-01`;
  return "";
}

function inferYear(record) {
  return (
    String(record.inferredYear || record.year || "").match(/\d{4}/)?.[0] ||
    String(record.title || "").match(/\b(199[3-9]|2000)\b/)?.[0] ||
    "1993"
  );
}

function chapterFor(record) {
  const text = textOf(record);
  if (CRISIS_TERMS.test(text)) return { number: 4, name: "Crisis Security Files" };
  if (RUSSIA_NATO_TERMS.test(text) && ENLARGEMENT_TERMS.test(text)) {
    return { number: 2, name: "NATO-Russia and Partnership" };
  }
  if (ARCHITECTURE_TERMS.test(text)) return { number: 3, name: "European Security Architecture" };
  return { number: 1, name: "NATO Strategy and Enlargement" };
}

function countriesFor(record) {
  const text = textOf(record);
  const countries = ["United States"];
  const rules = [
    ["Russia", /\b(Russia|Russian|Yeltsin|Primakov|Mamedov|Kozyrev)\b/i],
    ["France", /\b(France|French|Chirac|Mitterrand|de Charette)\b/i],
    ["Germany", /\b(Germany|German|Kohl|Schroeder|Schröder)\b/i],
    ["United Kingdom", /\b(United Kingdom|British|Britain|Major|Blair|Rifkind)\b/i],
    ["Poland", /\b(Poland|Polish|Walesa|Kwasniewski)\b/i],
    ["Czech Republic", /\b(Czech|Havel)\b/i],
    ["Hungary", /\b(Hungary|Hungarian)\b/i],
    ["Bosnia and Herzegovina", /\b(Bosnia|Herzegovina|Izetbegovic)\b/i],
    ["Serbia", /\b(Serbia|Serbian|Milosevic|Milošević)\b/i],
    ["Croatia", /\b(Croatia|Croatian|Tudjman)\b/i],
    ["Kosovo", /\b(Kosovo|Kosova)\b/i],
    ["Italy", /\b(Italy|Italian|Prodi|Dini|D'Alema)\b/i],
    ["Netherlands", /\b(Netherlands|Dutch|Kok)\b/i],
    ["Ukraine", /\b(Ukraine|Ukrainian|Kuchma)\b/i]
  ];
  for (const [country, regex] of rules) {
    if (regex.test(text)) countries.push(country);
  }
  return unique(countries);
}

function peopleFor(record) {
  const text = textOf(record);
  const people = ["Bill Clinton"];
  const names = [
    "Boris Yeltsin",
    "Jacques Chirac",
    "Francois Mitterrand",
    "Helmut Kohl",
    "Tony Blair",
    "John Major",
    "Javier Solana",
    "Alija Izetbegovic",
    "Slobodan Milosevic",
    "Franjo Tudjman",
    "Warren Christopher",
    "Strobe Talbott",
    "Madeleine Albright",
    "Vaclav Havel",
    "Lech Walesa",
    "Evgeniy Primakov",
    "Georgiy Mamedov",
    "Igor Ivanov"
  ];
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(escaped, "i").test(text)) people.push(name);
  }
  return unique([...(record.participants || []), ...(record.persons || []), ...people]);
}

function topicsFor(record) {
  const text = textOf(record);
  const topics = [];
  const rules = [
    ["NATO enlargement", /\b(enlargement|expansion|Madrid|Poland|Czech|Hungary)\b/i],
    ["NATO-Russia", /\b(NATO-Russia|NATO\/Russia|Russia-NATO|Founding Act|Yeltsin|Primakov|Mamedov)\b/i],
    ["Partnership for Peace", /\b(Partnership for Peace|PFP)\b/i],
    ["Bosnia", /\b(Bosnia|Herzegovina|Dayton|IFOR|SFOR)\b/i],
    ["Kosovo", /\b(Kosovo|KFOR)\b/i],
    ["OSCE/CSCE", /\b(OSCE|CSCE)\b/i],
    ["CFE", /\b(CFE|Conventional Forces)\b/i],
    ["European Union", /\b(European Union|EU\b|European Community)\b/i],
    ["High-level contact", /\b(President|Prime Minister|Chancellor|Foreign Minister|Secretary)\b/i]
  ];
  for (const [topic, regex] of rules) {
    if (regex.test(text)) topics.push(topic);
  }
  return unique([...(record.frusTopics || []), ...(record.topics || []), ...(record.subjects || []), ...topics]);
}

function externalPdf(record, fallback) {
  const value = record.sourcePdfUrl || record.source?.pdfUrl || record.pdfUrl || record.digitalObjectUrl || fallback || "";
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (record.__sourceSite === "Clinton-Russia-High-Level") {
    return `https://therealjameswilson.github.io/Clinton-Russia-High-Level/${value}`;
  }
  if (record.__sourceSite === "Balkans-93-95") {
    return `https://therealjameswilson.github.io/Balkans-93-95/${value}`;
  }
  return value;
}

function baseRecord(record, options) {
  const sortDate = toIsoDate(record.sortDate || record.date || record.dateText, inferYear(record));
  const title = record.title || record.documentTitle || record.identifier || "Untitled source lead";
  const chapter = chapterFor(record);
  const topics = topicsFor(record);
  const countries = countriesFor(record);
  const persons = peopleFor(record);
  const pdfUrl = externalPdf(record, options.pdfUrl);
  const catalogUrl = options.catalogUrl || record.catalogUrl || record.itemUrl || record.url || record.detailsUrl || pdfUrl || "";
  const naid = String(options.naid || record.naid || record.naId || record.identifier || record.itemId || record.id || "");

  return {
    id: options.id,
    date: sortDate || "1993-01-01",
    sortDate: sortDate || "1993-01-01",
    type: options.type,
    title,
    documentTitle: record.documentTitle || title,
    participants: persons,
    countries,
    chapter,
    releaseStatus: options.releaseStatus,
    selectionDecision: options.selectionDecision,
    naid,
    catalogUrl,
    pdfUrl,
    pageCount: Number(record.pageCount || record.localPdfPageCount) || null,
    digitalObjects: Number(record.digitalObjects || record.digitalObjectCount) || null,
    dateLine: record.dateLine || record.dateText || record.date || (sortDate ? sortDate : "Date pending"),
    washingtonTime: record.washingtonTime || "",
    placementNote: record.placementNote || "Verify final chronological placement against the source document.",
    subjectLine: record.subjectLine || record.compilerUse || record.descriptionExcerpt || title,
    sourceNote: options.sourceNote,
    sourceNoteStatus: options.sourceNoteStatus || "Draft",
    sourceNoteAddendum:
      options.sourceNoteAddendum ||
      "Compiler should verify classification, handling markings, drafting, clearance, attachments, marginalia, and excisions against the original source image or PDF.",
    sourcePages: record.sourcePages || record.sourcePdfPages || "",
    originalClassification: record.originalClassification || record.classification || "",
    documentMarkings: options.documentMarkings || [],
    handlingMarkings: options.handlingMarkings || [],
    distribution: record.distribution || "",
    draftingInfo: record.draftingInfo || "",
    clearance: record.clearance || {},
    communication: record.communication || {},
    readBy: record.readBy || [],
    declassificationStatus: options.declassificationStatus,
    withheldMaterial: record.withheldMaterial || { status: "Not yet audited" },
    annotationStatus: "Pending",
    annotation: record.annotation || { firstFootnote: "", relatedDocuments: [], publicStatements: [], memoirs: [] },
    extractionStatus: record.extractionStatus || options.extractionStatus || "",
    source: options.source,
    frusVolume: FRUS_VOLUME,
    frusTopics: topics,
    topics,
    indexTerms: unique([...topics, ...countries.filter((country) => country !== "United States")]),
    persons,
    compilerNotes: unique([options.compilerNote, record.notes, record.compilerUse, record.summary].filter(Boolean)),
    relatedReleaseIds: unique([record.identifier, record.itemId, record.caseNumber, record.naid, record.naId].filter(Boolean))
  };
}

function clintonDigitalRecord(record) {
  const itemId = record.itemId || record.id?.replace(/^clinton-dl-/, "");
  const release = record.sourceNote?.match(/release ([^,\.]+)/i)?.[1] || "";
  return baseRecord(record, {
    id: `clinton-dl-${itemId || record.id}`,
    type: record.type === "Memcon" || record.type === "Telcon" ? record.type : "Source Lead",
    releaseStatus: "FOIA/MDR Lead",
    selectionDecision: "Include candidate",
    declassificationStatus: "Pending review",
    catalogUrl: record.itemUrl,
    pdfUrl: record.pdfUrl,
    sourceNote: [
      "Source: William J. Clinton Presidential Library, Clinton Digital Library, Declassified Documents",
      record.collection,
      release ? `release ${release}` : "",
      itemId ? `item ${itemId}` : ""
    ]
      .filter(Boolean)
      .join(", ")
      .concat("."),
    source: {
      name: "William J. Clinton Presidential Library & Museum",
      url: record.itemUrl,
      pdfUrl: record.pdfUrl,
      collection: "Clinton Digital Library, Declassified Documents",
      series: record.collection || record.source?.series || "",
      documentId: itemId || "",
      path: unique(["Clinton Digital Library", record.collection, release ? `Release ${release}` : "", itemId ? `Item ${itemId}` : ""])
    },
    compilerNote: "Declassified Clinton Library memcon/telcon lead harvested by the Europe companion site."
  });
}

function balkansDocumentRecord(record) {
  const kind = record.kind || record.documentType || "";
  const type = /telcon/i.test(kind) ? "Telcon" : /memcon|conversation/i.test(kind) ? "Memcon" : "Release Packet";
  return baseRecord({ ...record, __sourceSite: "Balkans-93-95" }, {
    id: `balkans-${record.id}`,
    type,
    releaseStatus: "FOIA/MDR Lead",
    selectionDecision: type === "Release Packet" ? "Context candidate" : "Include candidate",
    declassificationStatus: "Pending review",
    catalogUrl: record.url,
    pdfUrl: record.sourcePdfUrl || record.pdfUrl,
    sourceNote:
      record.sourceNote ||
      `Source: ${record.repository || "William J. Clinton Presidential Library, Clinton Digital Library"}, ${record.collection || "released Bosnia/Kosovo source packet"}, ${record.identifier || record.id}.`,
    source: {
      name: record.repository || "William J. Clinton Presidential Library, Clinton Digital Library",
      url: record.url || record.sourcePdfUrl || record.pdfUrl,
      pdfUrl: record.sourcePdfUrl || record.pdfUrl,
      collection: record.collection || "Balkans companion source packet",
      documentId: record.identifier || record.id,
      path: unique([record.collection, record.identifier || record.id, record.sourcePdfPages ? `Source pages ${record.sourcePdfPages}` : ""])
    },
    compilerNote: "Balkans companion source packet or extracted conversation relevant to NATO crisis-security files."
  });
}

function russiaRecord(record) {
  return baseRecord({ ...record, __sourceSite: "Clinton-Russia-High-Level" }, {
    id: `russia-cross-${record.id}`,
    type: record.type === "Memcon" || record.type === "Telcon" ? record.type : "Source Lead",
    releaseStatus: record.releaseStatus === "Full" ? "Full" : record.releaseStatus === "Partial" ? "Partial" : "FOIA/MDR Lead",
    selectionDecision: "Context candidate",
    declassificationStatus:
      record.releaseStatus === "Full" ? "Released in full" : record.releaseStatus === "Partial" ? "Released with minor excisions" : "Pending review",
    catalogUrl: record.catalogUrl || record.source?.url,
    pdfUrl: externalPdf({ ...record, __sourceSite: "Clinton-Russia-High-Level" }),
    sourceNote: record.sourceNote || `Source: ${record.source?.name || "National Archives Catalog"}, ${record.naid ? `NAID ${record.naid}` : record.id}.`,
    source: {
      name: record.source?.name || "National Archives Catalog",
      url: record.catalogUrl || record.source?.url || "",
      pdfUrl: record.source?.pdfUrl || externalPdf({ ...record, __sourceSite: "Clinton-Russia-High-Level" }),
      caseNumber: record.source?.caseNumber || "",
      documentId: record.source?.documentId || record.naid || "",
      path: unique([record.source?.name, record.source?.caseNumber, record.naid ? `NAID ${record.naid}` : "", record.sourcePdfPages ? `Source pages ${record.sourcePdfPages}` : ""])
    },
    compilerNote: "Russia high-level contact cross-reference for NATO-Russia, Bosnia, Kosovo, or European security issues."
  });
}

function strobeRecord(record) {
  return baseRecord(record, {
    id: `strobe-${record.id}`,
    type: "Source Lead",
    releaseStatus: "FOIA/MDR Lead",
    selectionDecision: record.includePriority === "high" ? "Include candidate" : "Pending",
    declassificationStatus: "Pending review",
    catalogUrl: record.pdfUrl,
    pdfUrl: record.pdfUrl,
    sourceNote: `Source: Department of State FOIA Virtual Reading Room, Strobe Talbott FOIA release, document ${record.id}.`,
    source: {
      name: "Department of State FOIA Virtual Reading Room",
      url: record.pdfUrl || SOURCE_URLS.stateFoia,
      pdfUrl: record.pdfUrl,
      collection: "Strobe Talbott FOIA release",
      documentId: record.id,
      path: unique(["State Department FOIA Library", "Strobe Talbott FOIA", record.id])
    },
    compilerNote: `Strobe Talbott FOIA candidate. Rationale: ${(record.rationale || []).join("; ")}`
  });
}

function naraRecord(record, prefix) {
  const naid = String(record.naid || record.naId || "");
  const ancestors = (record.ancestors || []).map((ancestor) => ancestor.title || ancestor.naid || ancestor.naId);
  const digitalUrl = record.firstDigitalObjectUrl || record.digitalObjectUrl || record.digitalUrl || "";
  return baseRecord(record, {
    id: `${prefix}-${naid || record.id}`,
    type: "Scout Lead",
    releaseStatus: digitalUrl ? "Catalog Lead" : "Search Lead",
    selectionDecision: record.priority === "high" ? "Context candidate" : "Pending",
    declassificationStatus: digitalUrl ? "Pending review" : "Not applicable",
    catalogUrl: record.catalogUrl || (naid ? `https://catalog.archives.gov/id/${naid}` : SOURCE_URLS.naraCatalog),
    pdfUrl: digitalUrl,
    naid,
    sourceNote: `Source: National Archives Catalog, ${ancestors.concat([record.title, naid ? `NAID ${naid}` : ""]).filter(Boolean).join(", ")}.`,
    source: {
      name: "National Archives Catalog",
      url: record.catalogUrl || (naid ? `https://catalog.archives.gov/id/${naid}` : SOURCE_URLS.naraCatalog),
      pdfUrl: digitalUrl,
      collection: ancestors[0] || "NARA Catalog lead",
      series: ancestors[1] || "",
      documentId: naid,
      path: unique([...ancestors, record.title, naid ? `NAID ${naid}` : ""])
    },
    compilerNote: `NARA Scout/Catalog candidate from ${record.scope?.join?.(", ") || record.category || "collection search"}.`
  });
}

function publicStatementRecord(record) {
  return baseRecord(record, {
    id: `govinfo-${record.granuleId || record.id}`,
    type: "Context",
    releaseStatus: "Full",
    selectionDecision: "Context candidate",
    declassificationStatus: "Not applicable",
    catalogUrl: record.detailsUrl || record.url,
    pdfUrl: record.pdfUrl,
    sourceNote: `Source: Government Publishing Office, GovInfo, Public Papers of the Presidents of the United States: William J. Clinton, ${record.packageId || record.pkg}; ${record.granuleId || record.granule}.`,
    source: {
      name: "Government Publishing Office, GovInfo",
      url: record.detailsUrl || record.url,
      pdfUrl: record.pdfUrl,
      collection: "Public Papers of the Presidents of the United States: William J. Clinton",
      documentId: record.granuleId || record.granule || record.id,
      path: unique(["Public Papers of the Presidents", record.packageId || record.pkg, record.granuleId || record.granule || record.id])
    },
    sourceNoteAddendum:
      "Public record context; use for chronology, public explanation, and annotation rather than as a declassified archival source.",
    compilerNote: "GovInfo Public Papers context item from a companion Europe/Balkans search."
  });
}

function addRecord(records, dedupe, record) {
  const span = record.sourcePages || "";
  const scoped = (value) => (value && span ? `${value}#${span}` : value);
  const keys = unique([
    scoped(record.catalogUrl),
    scoped(record.pdfUrl),
    record.naid && scoped(`naid:${record.naid}`),
    record.source?.documentId && scoped(`doc:${record.source.documentId}`)
  ]);
  if (keys.some((key) => dedupe.has(key))) return false;
  records.push(record);
  for (const key of keys) dedupe.add(key);
  return true;
}

function loadArray(key, arrayKey) {
  const data = readJson(SOURCE_PATHS[key]);
  if (!data) return [];
  return arrayKey ? data[arrayKey] || [] : data;
}

function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const records = [];
  const dedupe = new Set();
  const report = {
    generatedAt: new Date().toISOString(),
    collectionRoot: path.relative(ROOT, COLLECTION_ROOT) || ".",
    sourceUrls: SOURCE_URLS,
    sourceInputs: {},
    added: {}
  };

  const balkansMap = readJson(SOURCE_PATHS.balkansMap) || {};
  const balkansDocs = (balkansMap.documents || []).filter((record) => record.documentScope !== "Public statement");
  report.sourceInputs.balkansDocuments = balkansDocs.length;
  report.added.balkansDocuments = balkansDocs.filter((record) => addRecord(records, dedupe, balkansDocumentRecord(record))).length;

  const russiaRecords = loadArray("russiaHighLevel").filter(
    (record) => ["Memcon", "Telcon", "Release Packet"].includes(record.type) && KEY_TERMS.test(textOf(record))
  );
  report.sourceInputs.russiaHighLevel = russiaRecords.length;
  report.added.russiaHighLevel = russiaRecords.filter((record) => addRecord(records, dedupe, russiaRecord(record))).length;

  const clintonRecords = loadArray("clintonEuropeRecords").filter((record) => KEY_TERMS.test(textOf(record)));
  report.sourceInputs.clintonDigitalLibrary = clintonRecords.length;
  report.added.clintonDigitalLibrary = clintonRecords.filter((record) => addRecord(records, dedupe, clintonDigitalRecord(record))).length;

  const strobeCandidates = loadArray("clintonEuropeStrobe", "candidates");
  report.sourceInputs.strobeTalbottFoia = strobeCandidates.length;
  report.added.strobeTalbottFoia = strobeCandidates.filter((record) => addRecord(records, dedupe, strobeRecord(record))).length;

  const naraScout = loadArray("clintonEuropeNaraScout", "candidates")
    .filter((record) => KEY_TERMS.test(leadText(record)))
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 140);
  report.sourceInputs.naraScout = naraScout.length;
  report.added.naraScout = naraScout.filter((record) => addRecord(records, dedupe, naraRecord(record, "nara-scout"))).length;

  const naraCollection = loadArray("clintonEuropeNaraCollection", "candidates")
    .filter((record) => KEY_TERMS.test(leadText(record)) && (record.priority !== "review" || (record.score || 0) >= 34))
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 120);
  report.sourceInputs.naraCollection = naraCollection.length;
  report.added.naraCollection = naraCollection.filter((record) => addRecord(records, dedupe, naraRecord(record, "nara-7388808"))).length;

  const publicStatements = loadArray("clintonEuropeStatements").filter((record) => KEY_TERMS.test(textOf(record)));
  report.sourceInputs.govInfoPublicPapers = publicStatements.length;
  report.added.govInfoPublicPapers = publicStatements.filter((record) => addRecord(records, dedupe, publicStatementRecord(record))).length;

  const duplicateAudit = [];
  const titleDateSeen = new Set();
  const dedupedRecords = records.filter((record) => {
    if (["Scout Lead", "Source Lead"].includes(record.type)) return true;
    const titleKey = `${record.sortDate}|${record.title.toLowerCase().replace(/\s+/g, " ").trim()}`;
    if (titleDateSeen.has(titleKey)) {
      duplicateAudit.push({ id: record.id, title: record.title, sortDate: record.sortDate });
      return false;
    }
    titleDateSeen.add(titleKey);
    return true;
  });

  dedupedRecords.sort(
    (a, b) =>
      a.chapter.number - b.chapter.number ||
      (a.sortDate || a.date).localeCompare(b.sortDate || b.date) ||
      a.title.localeCompare(b.title)
  );

  report.removedDuplicateTitleDateRecords = duplicateAudit;
  report.totalRecords = dedupedRecords.length;
  report.chapterCounts = dedupedRecords.reduce((counts, record) => {
    counts[record.chapter.name] = (counts[record.chapter.name] || 0) + 1;
    return counts;
  }, {});
  report.typeCounts = dedupedRecords.reduce((counts, record) => {
    counts[record.type] = (counts[record.type] || 0) + 1;
    return counts;
  }, {});
  report.recordsWithPdf = dedupedRecords.filter((record) => record.pdfUrl).length;
  report.recordsWithCatalogOrItemUrl = dedupedRecords.filter((record) => record.catalogUrl).length;

  fs.writeFileSync(path.join(DATA_DIR, "records.json"), `${JSON.stringify(dedupedRecords, null, 2)}\n`);
  fs.writeFileSync(path.join(DATA_DIR, "records.js"), `window.COMPILER_RECORDS = ${JSON.stringify(dedupedRecords, null, 2)};\n`);
  fs.writeFileSync(path.join(REPORT_DIR, "source-check.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Built ${dedupedRecords.length} records from collection source checks.`);
  console.log(JSON.stringify({ added: report.added, chapterCounts: report.chapterCounts }, null, 2));
}

main();
