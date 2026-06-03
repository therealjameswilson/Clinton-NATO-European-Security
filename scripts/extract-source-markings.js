#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "records.json");
const JS_PATH = path.join(ROOT, "data", "records.js");
const REPORT_DIR = path.join(ROOT, "reports");
const REPORT_PATH = path.join(REPORT_DIR, "source-marking-extraction.json");
const MD_REPORT_PATH = path.join(REPORT_DIR, "source-marking-extraction.md");
const CACHE_DIR = process.env.SOURCE_MARKING_CACHE || path.join(os.homedir(), "Library", "Caches", "frus-source-pdfs");

const CLASSIFICATION_PATTERN =
  /\b(Top Secret|Secret|Confidential|Limited Official Use|Unclassified|No classification marking|Sensitive|Nodis|Eyes Only|No Foreign|P\d\/b\(\d\)|E\.O\.)\b/i;
const PRODUCTION_SOURCE_PAGE_PATTERN = /\bNo released\b|\bnot located\b|\bno .*pages located\b/i;
const CLASSIFICATION_PRIORITY = ["Top Secret", "Secret", "Confidential", "Limited Official Use", "Unclassified"];
const HANDLING_PRIORITY = ["Sensitive", "Nodis", "Eyes Only", "No Foreign"];

function commandExists(command) {
  try {
    execFileSync("which", [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function hash(value) {
  return crypto.createHash("sha1").update(value).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeRecords(records) {
  fs.writeFileSync(DATA_PATH, `${JSON.stringify(records, null, 2)}\n`);
  fs.writeFileSync(JS_PATH, `window.COMPILER_RECORDS = ${JSON.stringify(records, null, 2)};\n`);
}

function existingMarkingText(record) {
  return [
    record.sourceNote,
    record.originalClassification,
    ...(record.documentMarkings || []),
    ...(record.handlingMarkings || [])
  ]
    .filter(Boolean)
    .join(" ");
}

function needsMarking(record) {
  if (record.type === "Scout Lead") return false;
  if (PRODUCTION_SOURCE_PAGE_PATTERN.test(record.sourcePages || "")) return false;
  if (/finding-aid summary/i.test(record.sourceNote || "") && !record.sourcePages && !record.pageCount) return false;
  return !CLASSIFICATION_PATTERN.test(existingMarkingText(record));
}

function isPublicContext(record) {
  return record.type === "Context" && record.source?.name === "Government Publishing Office, GovInfo";
}

function appendUnique(values, nextValues) {
  const seen = new Set(values || []);
  for (const value of nextValues) {
    if (value && !seen.has(value)) {
      seen.add(value);
      values.push(value);
    }
  }
  return values;
}

function normalizeLine(line) {
  return line.replace(/\s+/g, " ").trim();
}

function detectMarkings(text) {
  const lines = text
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean)
    .slice(0, 240);

  const hits = [];
  const add = (value) => {
    if (!hits.includes(value)) hits.push(value);
  };

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (/TOP\s+SECRET/.test(upper)) add("Top Secret");
    else if (/(^|[^A-Z])SECRET([^A-Z]|$)/.test(upper)) add("Secret");
    else if (/CONFIDENTIAL/.test(upper)) add("Confidential");
    else if (/LIMITED OFFICIAL USE/.test(upper)) add("Limited Official Use");
    else if (/UNCLASSIFIED/.test(upper)) add("Unclassified");

    if (/NODIS/.test(upper)) add("Nodis");
    if (/NOFORN|NO FOREIGN/.test(upper)) add("No Foreign");
    if (/EYES ONLY/.test(upper)) add("Eyes Only");
    if (/\bSENSITIVE\b/.test(upper) && line === upper) add("Sensitive");
  }

  return hits;
}

function selectMarkings(hits) {
  const classification = CLASSIFICATION_PRIORITY.find((marking) => hits.includes(marking)) || "";
  const handling = HANDLING_PRIORITY.filter((marking) => hits.includes(marking));
  return { classification, handling };
}

function markingSentence(markings, qualifier = "") {
  const parts = [markings.classification, ...markings.handling].filter(Boolean);
  if (!parts.length) return "";
  if (qualifier) return `${parts.join("; ")} ${qualifier}.`;
  return `${parts.join("; ")}.`;
}

function insertMarkingIntoSourceNote(note, markings, qualifier = "") {
  if (!note || CLASSIFICATION_PATTERN.test(note)) return note;
  const sentence = markingSentence(markings, qualifier);
  if (!sentence) return note;
  if (note.includes(" Source pages:")) return note.replace(" Source pages:", ` ${sentence} Source pages:`);
  return `${note.replace(/\s+$/, "")} ${sentence}`;
}

function pdfPageCount(filePath) {
  if (!commandExists("pdfinfo")) return null;
  const info = execFileSync("pdfinfo", [filePath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });
  const match = info.match(/^Pages:\s+(\d+)/m);
  return match ? Number(match[1]) : null;
}

function addPdfPageCount(record, count, method) {
  if (!Number.isFinite(count) || count < 1) return false;
  const pageSpan = count === 1 ? "PDF page 1" : `PDF pages 1-${count}`;
  const unit = count === 1 ? "page" : "pages";
  record.pageCount = count;
  record.sourcePages = record.sourcePages || pageSpan;
  const extractionNote = `PDF page count extraction: ${count} ${unit} counted by ${method}.`;
  if (!record.sourceNoteAddendum?.includes(extractionNote)) {
    record.sourceNoteAddendum = [record.sourceNoteAddendum, extractionNote].filter(Boolean).join(" ");
  }
  return true;
}

function addMarkings(record, markings, method) {
  if (markings.classification) {
    record.originalClassification = markings.classification;
    record.documentMarkings = appendUnique(record.documentMarkings || [], [markings.classification]);
  }
  record.handlingMarkings = appendUnique(record.handlingMarkings || [], markings.handling);
  record.sourceNote = insertMarkingIntoSourceNote(record.sourceNote, markings);
  const extractionNote = `Source marking extraction: ${markingSentence(markings).replace(/\.$/, "")} found by ${method}.`;
  if (!record.sourceNoteAddendum?.includes(extractionNote)) {
    record.sourceNoteAddendum = [record.sourceNoteAddendum, extractionNote].filter(Boolean).join(" ");
  }
}

function addPublicContextMarking(record) {
  const markings = { classification: "Unclassified", handling: [] };
  record.originalClassification = "Unclassified public record";
  record.documentMarkings = appendUnique(record.documentMarkings || [], ["Unclassified"]);
  record.sourceNote = insertMarkingIntoSourceNote(record.sourceNote, markings, "public record");
}

function pageRange(record) {
  const pageText = String(record.sourcePages || "");
  if (PRODUCTION_SOURCE_PAGE_PATTERN.test(pageText)) return null;
  const match = pageText.match(/(\d+)(?:\D+(\d+))?/);
  if (!match) return [1, 4];
  const first = Number(match[1]);
  const last = Number(match[2] || match[1]);
  return [first, Math.min(last, first + 5)];
}

function download(url) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const extension = path.extname(new URL(url).pathname) || ".bin";
  const filePath = path.join(CACHE_DIR, `${hash(url)}${extension}`);
  if (!fs.existsSync(filePath)) {
    execFileSync("curl", ["-L", "--fail", "--max-time", "45", "-o", filePath, url], {
      stdio: ["ignore", "ignore", "ignore"]
    });
  }
  return filePath;
}

function extractPdfText(filePath, record) {
  const range = pageRange(record);
  if (!range) return "";
  const [first, last] = range;
  const textPath = `${filePath}.${String(record.sourcePages || "first").replace(/\W+/g, "_")}.txt`;
  execFileSync("pdftotext", ["-f", String(first), "-l", String(last), "-layout", filePath, textPath], {
    stdio: ["ignore", "ignore", "ignore"]
  });
  return fs.readFileSync(textPath, "utf8");
}

function extractPdfOcr(filePath, record) {
  if (!commandExists("pdftoppm") || !commandExists("tesseract")) return "";
  const range = pageRange(record);
  if (!range) return "";
  const [first, last] = [range[0], Math.min(range[1], range[0] + 2)];
  const prefix = path.join(CACHE_DIR, `ocr-${hash(`${filePath}:${first}:${last}`)}`);
  execFileSync("pdftoppm", ["-f", String(first), "-l", String(last), "-r", "180", "-png", filePath, prefix], {
    stdio: ["ignore", "ignore", "ignore"]
  });
  return fs
    .readdirSync(CACHE_DIR)
    .filter((name) => name.startsWith(path.basename(prefix)) && name.endsWith(".png"))
    .sort()
    .map((name) => tesseractText(path.join(CACHE_DIR, name)))
    .join("\n");
}

function clintonItemImageUrls(record) {
  if (!record.catalogUrl?.includes("clinton.presidentiallibraries.us/items/show/")) return [];
  const html = execFileSync("curl", ["-L", "--fail", "--max-time", "45", record.catalogUrl], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });
  return [...html.matchAll(/href="(https:\/\/clinton\.presidentiallibraries\.us\/files\/original\/[^"]+\.(?:jpg|jpeg|png))"/gi)]
    .map((match) => match[1])
    .slice(0, 3);
}

function extractImageOcr(urls) {
  if (!commandExists("tesseract")) return "";
  return urls
    .map((url) => download(url))
    .map((filePath) => tesseractText(filePath))
    .join("\n");
}

function tesseractText(filePath) {
  return ["6", "4", "11"]
    .map((psm) =>
      execFileSync("tesseract", [filePath, "stdout", "--psm", psm], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      })
    )
    .join("\n");
}

function extractRecordMarkings(record) {
  if (record.pdfUrl) {
    const pdfPath = download(record.pdfUrl);
    const textHits = detectMarkings(extractPdfText(pdfPath, record));
    if (textHits.length) return { method: "PDF text extraction", hits: textHits };
    const ocrHits = detectMarkings(extractPdfOcr(pdfPath, record));
    if (ocrHits.length) return { method: "PDF OCR", hits: ocrHits };
  }

  const imageUrls = clintonItemImageUrls(record);
  if (imageUrls.length) {
    const imageHits = detectMarkings(extractImageOcr(imageUrls));
    if (imageHits.length) return { method: "item-image OCR", hits: imageHits };
  }

  return { method: "", hits: [] };
}

function main() {
  if (!commandExists("curl") || !commandExists("pdftotext")) {
    throw new Error("This script requires curl and pdftotext.");
  }

  const records = readJson(DATA_PATH);
  const updated = [];
  const pageCountUpdated = [];
  const unresolved = [];
  const failures = [];
  let publicContextUpdated = 0;

  for (const record of records) {
    if (/^strobe-hardgap-/.test(record.id || "") && record.pdfUrl && (!record.pageCount || !record.sourcePages)) {
      try {
        const pdfPath = download(record.pdfUrl);
        const count = pdfPageCount(pdfPath);
        if (addPdfPageCount(record, count, "pdfinfo")) {
          pageCountUpdated.push({ id: record.id, title: record.title, pageCount: count });
        }
      } catch (error) {
        failures.push({ id: record.id, title: record.title, error: `page count: ${error.message}` });
      }
    }

    if (isPublicContext(record) && needsMarking(record)) {
      addPublicContextMarking(record);
      publicContextUpdated += 1;
      updated.push({ id: record.id, method: "public-record context", markings: ["Unclassified"] });
      continue;
    }

    if (!needsMarking(record)) continue;
    if (!record.pdfUrl && !record.catalogUrl?.includes("clinton.presidentiallibraries.us/items/show/")) continue;

    try {
      const extraction = extractRecordMarkings(record);
      const markings = selectMarkings(extraction.hits);
      if (markings.classification || markings.handling.length) {
        addMarkings(record, markings, extraction.method);
        updated.push({ id: record.id, method: extraction.method, markings: [markings.classification, ...markings.handling].filter(Boolean) });
      } else {
        unresolved.push({ id: record.id, title: record.title, type: record.type, sourcePages: record.sourcePages || "" });
      }
    } catch (error) {
      failures.push({ id: record.id, title: record.title, error: error.message });
    }
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    updatedThisRun: updated.length,
    pageCountsUpdatedThisRun: pageCountUpdated.length,
    recordsWithExtractedMarkings: records.filter((record) => record.sourceNoteAddendum?.includes("Source marking extraction:")).length,
    recordsWithPdfPageCounts: records.filter((record) => record.pageCount || /PDF page count extraction:/.test(record.sourceNoteAddendum || "")).length,
    publicContextRecordsMarkedUnclassified: records.filter((record) => record.originalClassification === "Unclassified public record").length,
    publicContextUpdated,
    unresolved: unresolved.length,
    failureCount: failures.length,
    cacheDir: CACHE_DIR,
    updatedRecords: updated,
    pageCountUpdatedRecords: pageCountUpdated,
    unresolvedRecords: unresolved,
    failureRecords: failures
  };

  writeRecords(records);
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(
    MD_REPORT_PATH,
    [
      "# Source Marking Extraction",
      "",
      `Generated: ${report.generatedAt}`,
      "",
      "## Counts",
      "",
      `- Records updated in this run: ${report.updatedThisRun}`,
      `- PDF page counts updated in this run: ${report.pageCountsUpdatedThisRun}`,
      `- Records with extracted source markings: ${report.recordsWithExtractedMarkings}`,
      `- Records with PDF page counts: ${report.recordsWithPdfPageCounts}`,
      `- Public context records marked unclassified: ${report.publicContextRecordsMarkedUnclassified}`,
      `- Unresolved source-marking extractions: ${report.unresolved}`,
      `- Extraction failures: ${report.failureCount}`,
      "",
      "## Method",
      "",
      "The extraction pass uses PDF text, PDF OCR, Clinton Digital Library item-image OCR, public-record context, and explicit visual source-image review. It writes markings only when the source image or text exposes the marking; unresolved records remain blank rather than inferred.",
      ""
    ].join("\n")
  );
  console.log(`Updated ${updated.length} records; ${unresolved.length} unresolved; ${failures.length} failures.`);
  console.log(`Wrote ${path.relative(ROOT, REPORT_PATH)}.`);
}

main();
