/* Shared browser/offline formatter. A public surrogate ID is not an original archival ID. */
(function (root) {
  "use strict";
  const clean = (v) => typeof v === "string" || typeof v === "number" ? String(v).trim() : "";
  const list = (v) => (Array.isArray(v) ? v : [v]).map(clean).filter(Boolean);
  const unique = (a) => [...new Set(a.map(clean).filter(Boolean))];
  const trimStop = (s) => clean(s).replace(/\.+$/, "");
  const sentence = (s) => trimStop(s) ? trimStop(s) + "." : "";
  const marked = (s) => clean(s).replace(/\s+/g, " ");
  const official = (s) => {
    try {
      const url = new URL(s);
      return url.protocol === "https:" && /^(?:.*\.)?(?:archives\.gov|clintonlibrary\.gov|presidentiallibraries\.us|govinfo\.gov|state\.gov)$/.test(url.hostname) ? url.href : "";
    } catch { return ""; }
  };
  const levels = Object.freeze({
    marker: "Document scan and release marker checked",
    scan: "Document scan checked · release marker not verified",
    surrogate: "Digital surrogate · archival locator incomplete",
    unresolved: "Source unresolved · no item scan verified",
    publicEdition: "Published-source locator · not an archival document",
    diary: "Diary context · not the underlying conversation",
    foia: "Released-source lead · source image not verified",
    folder: "Catalog locator · document not identified"
  });
  function sourceNote(record, evidence = root.CLINTON_PROVENANCE_EVIDENCE || {}) {
    const s = record.source || {}, e = evidence[record.id] || {};
    const legacy = clean(record.sourceNote);
    const allURLs = unique([e.officialUrl, record.catalogUrl, record.pdfUrl, s.url, s.pdfUrl]).map(official).filter(Boolean);
    const pdf = official(e.scanUrl) || official(record.pdfUrl) || official(s.pdfUrl);
    let item = allURLs.find((u) => /\/items\/show\/\d+/.test(u))?.match(/\/items\/show\/(\d+)/)?.[1] || "";
    let archiveID = allURLs.find((u) => /catalog\.archives\.gov\/id\/\d+/.test(u))?.match(/\/id\/(\d+)/)?.[1] || "";
    const isPPP = /^govinfo-PPP-/i.test(record.id);
    const isDiary = /^pdd-/i.test(record.id) || /Presidential Daily Diary context record/i.test(clean(record.sourceNoteAddendum));
    let level, notation, context = "", publishedPages = "", caseId = "";
    const legacyOmeka = allURLs.some(u=>u.includes("clinton.presidentiallibraries.us/"));
    let bodyPages = "", markerPages = "", evidenceStatus = "";
    let workingPages = clean(record.sourcePages || record.sourcePdfPages);
    const notes = [];
    if (isPPP) {
      const product = (official(e.officialUrl) || allURLs[0] || "").match(/PPP-(\d{4})-book(\d+)-doc-pg(\d+)/i);
      publishedPages = clean(e.printedPages);
      const edition = official(e.officialUrl) && clean(e.edition) || (product ? `${product[1]}, Book ${product[2]}` : "");
      const locator = publishedPages ? `${/[–-]/.test(publishedPages) ? "pp." : "p."} ${publishedPages}` : product ? `item beginning on printed page ${product[3]}` : "";
      notation = unique(["Public Papers of the Presidents of the United States: William J. Clinton", edition, locator]).join(", ");
      level = "publicEdition";
      context = "Cite as public text or in an editorial note when appropriate; not evidence of the internal archival original.";
      if (official(e.metadataUrl)) context = "Title, date, edition, and printed page extent checked against GovInfo’s official granule metadata. " + context;
    } else if (isDiary) {
      caseId = clean(s.caseNumber);
      notation = unique([s.name, ...list(s.path).filter(x => !/^pages?\s/i.test(x))]).join(", ");
      if (official(e.officialUrl) && e.suppressLegacy) {
        item = ""; archiveID = ""; workingPages = ""; caseId = "";
        notation = unique([e.repository || s.name,e.collection || "Clinton Presidential Records, Presidential Daily Diary","Exact source pointer pending"]).join(", ");
      }
      if (official(e.officialUrl) && e.releaseCase) {
        caseId = clean(e.releaseCase);
        archiveID = clean(e.archiveId);
        workingPages = clean(e.workingPages);
        bodyPages = clean(e.bodyPages);
        notation = unique([e.repository || s.name,e.collection || "Clinton Presidential Records, Presidential Daily Diary",e.series,e.originalContainerId && `OA/ID ${e.originalContainerId}`,e.folder,caseId && `Release ${caseId}`,archiveID && `NAID ${archiveID}`]).join(", ");
      }
      level = "diary";
      context = "Cite the diary for the chronology only; do not substitute this entry for the substantive memorandum or telephone conversation.";
      if (official(e.officialUrl) && clean(e.limitations)) context = clean(e.limitations) + " " + context;
    } else if (record.type === "Scout Lead") {
      notation = unique([s.name, ...list(s.path).filter(x => !/^pages?\s/i.test(x))]).join(", ");
      level = "folder";
      context = "Catalog description or file-unit locator only; find the exact document, original markings, and page span before drafting a document source note.";
    } else if (record.type === "Source Lead") {
      const officialCase = allURLs.map(u=>u.match(/\b((?:FL-|[MF]-)?20\d{2}-\d{4,6})(?:\/|$)/i)?.[1]).find(Boolean);
      caseId = clean(s.caseNumber) || officialCase || "";
      const releaseID = allURLs.map(u=>u.match(/(?:\/DOC_0?|\/)(C\d{7,9})(?:\/|\.pdf|$)/i)?.[1]).find(Boolean);
      notation = unique([s.name || "Department of State, FOIA Library", s.collection, caseId && `Case ${caseId}`, releaseID && `Released document ${releaseID}`]).join(", ");
      level = "foia";
      context = "This identifies the public release. Original filing, cables, markings, page boundaries, and cover sheets require source-image review.";
    } else {
      const unresolved = !pdf || /Pending source problem/i.test(clean(record.extractionStatus));
      notation = unique([s.name || "William J. Clinton Presidential Library", ...list(s.path).filter(x=>!/^pages?\s/i.test(x))]).join(", ");
      caseId = clean(s.caseNumber) || notation.match(/\b20\d{2}-\d{4}-M(?:-\d+)?\b/)?.[0] || "";
      level = unresolved ? "unresolved" : "surrogate";
      context = unresolved ? "A document title or related public packet is not proof that the underlying record was released or identified." : "The public release or portal ID is a surrogate, not an original archival document ID. Verify the collection, filing locator, original markings, and editorial details against the item and its marker.";
      if (legacyOmeka) context += " The legacy Clinton Digital Library address may redirect; use the current library index to locate the exact scan.";
    }
    const validEvidence = official(e.officialUrl || e.scanUrl);
    if (validEvidence && ["marker", "scan"].includes(e.level) && clean(e.bodyPages) && (e.level !== "marker" || clean(e.markerPages)) && !["publicEdition","diary","folder"].includes(level)) {
      level = e.level;
      bodyPages = clean(e.bodyPages);
      markerPages = clean(e.markerPages);
      const preexistingNotation = notation;
      notation = unique([e.repository || s.name, e.collection, e.series, e.office, e.box && `Box ${e.box}`, e.oaId && `OA/ID ${e.oaId}`, e.folder, e.originalDocumentId && `Document ID ${e.originalDocumentId}`]).join(", ") || notation;
      if ( ![e.collection,e.series,e.office,e.box,e.oaId,e.folder,e.originalDocumentId].some(clean)) {
        notation = preexistingNotation;
      }
      if (clean(e.classification)) notes.push(sentence([e.classification,...list(e.handling)].join("; ")));
      for (const [k, label] of [["location","The meeting took place in "],["notetaker","Notetaker: "],["draftedBy","Drafted by "],["clearedBy","Cleared by "],["approvedBy","Approved by "],["distribution","Distribution: "],["omissions",""]]) {
        if (e[k]) notes.push(sentence(label + list(e[k]).join("; ")));
      }
      context = clean(e.limitations) || (level === "marker" ? "Only the details shown in the cited image and release marker are asserted." : "Details are from the checked scan. An original filing path or document ID is not established unless separately verified.");
      evidenceStatus = clean(e.checked);
    }
    return {level, label: levels[level], text: [`Source: ${sentence(marked(notation) || "Precise citation pending")}`,...notes].join(" "), context, bodyPages, markerPages, workingPages, publishedPages, caseId, item, archiveID, markerDocumentId:official(e.officialUrl) ? clean(e.markerDocumentId) : "", archiveCatalogURL:official(e.archiveCatalogUrl), publicContextURL:official(e.publicContextUrl), evidenceURL: validEvidence || (legacyOmeka && (level==="unresolved" || level==="surrogate") ? "https://www.clintonlibrary.gov/research/memcons-and-telcons" : "") || pdf || allURLs[0] || "", evidenceStatus, metadataURL:official(e.metadataUrl), scanURL:official(e.scanUrl) || (validEvidence && /\.pdf(?:[?#]|$)/i.test(validEvidence) ? validEvidence : (!legacyOmeka && !e.suppressLegacy ? pdf : "")), suppressLegacy:!!(validEvidence && e.suppressLegacy), originalDocumentId: ["scan","marker"].includes(level) ? clean(e.originalDocumentId) : "", classification: ["scan","marker"].includes(level) ? clean(e.classification) : "", legacy};
  }
  function applyRecordEvidence(record, evidence = root.CLINTON_PROVENANCE_EVIDENCE || {}) {
    const e = evidence[record.id] || {};
    if (!official(e.officialUrl)) return record;
    const fields = {};
    if (/^\d{4}-\d\d-\d\d$/.test(clean(e.correctedDate))) Object.assign(fields,{date:e.correctedDate,sortDate:e.correctedDate,dateLine:e.correctedDate});
    if (clean(e.correctedTitle)) Object.assign(fields,{title:e.correctedTitle,documentTitle:e.correctedTitle,subjectLine:e.correctedTitle});
    if (Array.isArray(e.correctedParticipants) && list(e.correctedParticipants).length) fields.participants=list(e.correctedParticipants);
    return Object.keys(fields).length ? {...record,...fields} : record;
  }
  function exportAll(records, evidence) {
    const quote = (x) => '"' + clean(x).replace(/"/g,'""') + '"';
    const columns = ["id","date","title","type","level","source_note","limitations","source_evidence_url","release_case","surrogate_item","nara_catalog_id","document_pdf_pages","release_marker_pdf_pages","working_page_pointer","printed_pages"];
    return [columns, ...records.map(record=>{ const r = applyRecordEvidence(record,evidence); const p = sourceNote(r,evidence); return [r.id,r.date,r.documentTitle || r.title,r.type,p.label,p.text,p.context,p.evidenceURL,p.caseId,p.item,p.archiveID,p.bodyPages,p.markerPages,p.workingPages,p.publishedPages]; })].map(row=>row.map(quote).join(",")).join("\n") + "\n";
  }
  root.ClintonProvenance = Object.freeze({sourceNote, levels, exportAll, applyRecordEvidence});
})(globalThis);
