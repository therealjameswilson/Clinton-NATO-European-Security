#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "records.json");
const REPORT_DIR = path.join(ROOT, "reports");
const JSON_PATH = path.join(REPORT_DIR, "compiler-gap-analysis.json");
const MD_PATH = path.join(REPORT_DIR, "compiler-gap-analysis.md");

const SOURCE_BASIS = [
  {
    label: "FRUS 1993-2000, Volume XVII status page",
    url: "https://history.state.gov/historicaldocuments/frus1993-00v17"
  },
  {
    label: "FRUS production and editorial method",
    url: "https://history.state.gov/historicaldocuments/frus1989-92v31/abouttheseries"
  },
  {
    label: "FRUS 1989-1992, Volume XXXI source-note model",
    url: "https://history.state.gov/historicaldocuments/frus1989-92v31"
  },
  {
    label: "Clinton Library memcons, telcons, meetings, and calls",
    url: "https://www.clintonlibrary.gov/research/memcons-and-telcons"
  },
  {
    label: "Department of State FOIA Virtual Reading Room",
    url: "https://foia.state.gov/"
  },
  {
    label: "Strobe Talbott FOIA manifest",
    url: "https://therealjameswilson.github.io/strobe-talbott-foia/manifest.html"
  },
  {
    label: "National Archives Catalog and NARA Scout leads",
    url: "https://catalog.archives.gov/"
  },
  {
    label: "Presidential Daily Diary 2010-0083-F and related diary releases",
    url: "https://catalog.archives.gov/search?q=%222010-0083-F%22&collectionIdentifier=WJC*"
  },
  {
    label: "GovInfo Public Papers of the Presidents",
    url: "https://www.govinfo.gov/app/collection/PPP"
  }
];

const EXPECTED_TOPICS = [
  {
    id: "enlargement",
    label: "NATO enlargement, Madrid, accession, and Senate ratification",
    pattern: /\b(enlargement|expansion|Madrid|accession|ratification|Poland|Polish|Czech|Havel|Hungary)\b/i,
    minimum: 80,
    gap: "NATO enlargement is a core volume subject, but the current set has too few direct decision records relative to the crisis material."
  },
  {
    id: "pfp",
    label: "Partnership for Peace and NATO partnership policy",
    pattern: /\b(Partnership for Peace|PFP)\b/i,
    minimum: 30,
    gap: "Partnership for Peace appears mostly as context inside crisis or Russia records; it needs a dedicated policy-document search."
  },
  {
    id: "nato_russia",
    label: "NATO-Russia, Founding Act, PJC, Primakov/Mamedov/Chernomyrdin",
    pattern: /\b(NATO-Russia|NATO\/Russia|Russia-NATO|Founding Act|PJC|Yeltsin|Primakov|Mamedov|Chernomyrdin)\b/i,
    minimum: 90,
    gap: "The count is adequate, but many records are cross-references or crisis files; direct NATO-Russia negotiation files need prioritization."
  },
  {
    id: "bosnia",
    label: "Bosnia, Dayton, IFOR, and SFOR",
    pattern: /\b(Bosnia|Herzegovina|Dayton|IFOR|SFOR)\b/i,
    minimum: 80,
    gap: "Bosnia is overrepresented relative to the rest of the volume; the risk is crowding out enlargement and architecture files."
  },
  {
    id: "kosovo",
    label: "Kosovo, KFOR, and 1998-1999 NATO air campaign diplomacy",
    pattern: /\b(Kosovo|Kosova|KFOR)\b/i,
    minimum: 70,
    gap: "Kosovo has enough leads, but needs document-level extraction and sorting by Washington time."
  },
  {
    id: "osce",
    label: "OSCE/CSCE",
    pattern: /\b(OSCE|CSCE)\b/i,
    minimum: 35,
    gap: "OSCE/CSCE appears in source leads, but direct decision records are thin."
  },
  {
    id: "cfe",
    label: "CFE and conventional forces",
    pattern: /\b(CFE|Conventional Forces)\b/i,
    minimum: 20,
    gap: "CFE is materially undercovered for a European security volume."
  },
  {
    id: "nac_usnato",
    label: "NAC, USNATO, and North Atlantic Council traffic",
    pattern: /\b(NAC|USNATO|North Atlantic Council)\b/i,
    minimum: 25,
    gap: "USNATO/NAC traffic is almost absent; this is a high-risk source gap for NATO institutional decision-making."
  },
  {
    id: "solana",
    label: "NATO Secretary General Solana/Claes and alliance leadership",
    pattern: /\b(Solana|Willy Claes|Manfred Woerner|NATO Secretary General)\b/i,
    minimum: 25,
    gap: "Alliance leadership contacts are underrepresented."
  },
  {
    id: "nato_eu",
    label: "NATO-EU, EU, and European security architecture",
    pattern: /\b(NATO-EU|European Union|EU\b|European Community|WEU)\b/i,
    minimum: 35,
    gap: "EU/NATO-EU material exists as public/context records, but needs more archival policy files."
  }
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function countBy(records, keyFn) {
  return records.reduce((counts, record) => {
    const key = keyFn(record);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function textOf(record) {
  return JSON.stringify(record || "");
}

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function sourcePathParts(record) {
  const source = record.source || {};
  const explicitPath = list(source.path);
  if (explicitPath.length) return [source.name, ...explicitPath].filter(Boolean);
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
  const annotation = record.annotation || {};
  if (!record.annotationStatus && !annotation.firstFootnote && !list(annotation.relatedDocuments).length) {
    issues.push("needs-annotation");
  }
  if (!list(record.indexTerms).length && !list(record.persons).length && !list(record.frusTopics).length) {
    issues.push("needs-index");
  }
  return issues;
}

function sampleIds(records, limit = 8) {
  return records.slice(0, limit).map((record) => ({
    id: record.id,
    date: record.sortDate || record.date,
    type: record.type,
    title: record.title,
    source: record.source?.name || ""
  }));
}

function main() {
  const records = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const byChapter = countBy(records, (record) => record.chapter.name);
  const byType = countBy(records, (record) => record.type);
  const byYear = countBy(records, (record) => (record.sortDate || record.date || "unknown").slice(0, 4));
  const bySource = countBy(records, (record) => record.source?.name || "Unknown");
  const issueCounts = records.reduce((counts, record) => {
    for (const issue of productionIssues(record)) counts[issue] = (counts[issue] || 0) + 1;
    return counts;
  }, {});

  const sourceVerifyCount = records.filter((record) =>
    /verify|requires|pending|not yet audited/i.test([record.sourceNote, record.sourceNoteAddendum, record.withheldMaterial?.status].filter(Boolean).join(" "))
  ).length;
  const declassWatchCount = records.filter((record) => {
    const status = [record.releaseStatus, record.declassificationStatus, record.withheldMaterial?.status].filter(Boolean).join(" ");
    return productionIssues(record).includes("needs-declass") || /pending|excised|withheld|partial|mixed/i.test(status);
  }).length;
  const placeholderDateCount = records.filter((record) => /-01-01$/.test(record.date) && record.type === "Scout Lead").length;

  const topicCoverage = EXPECTED_TOPICS.map((topic) => {
    const matches = records.filter((record) => topic.pattern.test(textOf(record)));
    const byMatchType = countBy(matches, (record) => record.type);
    const byMatchChapter = countBy(matches, (record) => record.chapter.name);
    return {
      id: topic.id,
      label: topic.label,
      count: matches.length,
      minimum: topic.minimum,
      status: matches.length >= topic.minimum ? "covered-by-count" : "gap",
      caveat: topic.gap,
      byType: byMatchType,
      byChapter: byMatchChapter,
      sampleRecords: sampleIds(matches)
    };
  });

  const risks = [
    {
      id: "lane-imbalance",
      severity: "high",
      finding: "Crisis Security Files dominate the set.",
      evidence: `${byChapter["Crisis Security Files"] || 0} of ${records.length} records are in the crisis lane.`,
      action: "Run targeted enlargement, NATO-Russia institutional, USNATO/NAC, CFE, and NATO-EU searches before using this as a selection base."
    },
    {
      id: "file-unit-vs-document",
      severity: "high",
      finding: "Too many records are file-unit leads, not document-ready items.",
      evidence: `${byType["Scout Lead"] || 0} Scout Leads; ${placeholderDateCount} have placeholder January 1 dates.`,
      action: "Promote high-value NARA file-unit leads to document-level rows only after inspecting digital objects, extracting page spans, and recording actual dates."
    },
    {
      id: "source-note-risk",
      severity: "high",
      finding: "Source-note and declassification details remain draft-level.",
      evidence: `${issueCounts["needs-source"] || 0} records fail the source-note gate; ${sourceVerifyCount} records carry verify/pending language; ${declassWatchCount} records remain on declassification watch.`,
      action: "Prioritize source-note completion for include candidates before expanding the corpus."
    },
    {
      id: "institutional-nato-gap",
      severity: "high",
      finding: "NAC/USNATO traffic is underrepresented.",
      evidence: `${topicCoverage.find((topic) => topic.id === "nac_usnato").count} records match NAC/USNATO terms.`,
      action: "Search USNATO, North Atlantic Council, S/S-S, EUR/RPM, NATO Mission, and cable traffic sources."
    },
    {
      id: "architecture-gap",
      severity: "medium",
      finding: "CFE and architecture records are thin.",
      evidence: `${topicCoverage.find((topic) => topic.id === "cfe").count} CFE matches; ${byChapter["European Security Architecture"] || 0} architecture-lane records.`,
      action: "Run a specific CFE/OSCE/NATO-EU architecture pass rather than relying on broad Europe searches."
    },
    {
      id: "late-period-gap",
      severity: "medium",
      finding: "1997-2000 coverage is sparse relative to 1993-1995.",
      evidence: `1997: ${byYear["1997"] || 0}, 1998: ${byYear["1998"] || 0}, 1999: ${byYear["1999"] || 0}, 2000: ${byYear["2000"] || 0}.`,
      action: "Run post-Madrid implementation, Kosovo endgame, NATO 50th anniversary, and 2000 transition searches."
    }
  ];

  const nextActions = [
    "Use the promotion queue to extract top 40 NARA Scout/Catalog leads into document-level records with page spans and actual dates.",
    "Use the hard-gap harvest and search playbook to extract release-qualified USNATO/NAC source leads into direct document records with page spans and source notes.",
    "Use the hard-gap harvest and search playbook to extract CFE, OSCE/CSCE, NATO-EU/ESDI, and architecture records, then separate direct decision documents from crisis material.",
    "Audit source notes for all Include candidate records before adding more broad leads.",
    "Split Bosnia/Kosovo crisis records into direct decision documents vs public/context material.",
    "Use the coverage matrix to set ally and institution quotas before final selection: NATO, USNATO/NAC, Russia, Poland, Czech Republic, Hungary, Germany, France, United Kingdom, EU, OSCE, and CFE."
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    officialVolumeStatus: {
      status: "Planned",
      checkedUrl: "https://history.state.gov/historicaldocuments/frus1993-00v17"
    },
    sourceBasis: SOURCE_BASIS,
    recordCount: records.length,
    counts: {
      byChapter,
      byType,
      byYear,
      topSources: Object.entries(bySource)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15),
      productionIssues: issueCounts,
      sourceVerifyCount,
      declassWatchCount,
      placeholderDateCount
    },
    topicCoverage,
    risks,
    nextActions
  };

  const md = [
    "# Compiler Gap Analysis",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Basis",
    "",
    "- Official FRUS Volume XVII status: Planned.",
    `- Current record count: ${records.length}.`,
    "- This is a source-finding corpus, not a selection-ready FRUS chapter base.",
    "- Count coverage does not equal FRUS coverage until individual documents have verified dates, source notes, declassification accounting, and selection decisions.",
    "",
    "## Source Classes Checked",
    "",
    ...SOURCE_BASIS.map((source) => `- [${source.label}](${source.url})`),
    "",
    "## Production Gaps",
    "",
    `- Needs selection decision: ${issueCounts["needs-selection"] || 0}`,
    `- Needs chronology cleanup: ${issueCounts["needs-chronology"] || 0}`,
    `- Needs source-note completion: ${issueCounts["needs-source"] || 0}`,
    `- Source verification language present: ${sourceVerifyCount}`,
    `- Declassification watch items: ${declassWatchCount}`,
    `- Placeholder January 1 Scout Lead dates: ${placeholderDateCount}`,
    "",
    "## Highest-Risk Gaps",
    "",
    ...risks.flatMap((risk) => [
      `### ${risk.severity.toUpperCase()}: ${risk.finding}`,
      "",
      `Evidence: ${risk.evidence}`,
      "",
      `Action: ${risk.action}`,
      ""
    ]),
    "## Topic Coverage",
    "",
    "| Topic | Count | Minimum | Status |",
    "| --- | ---: | ---: | --- |",
    ...topicCoverage.map((topic) => `| ${topic.label} | ${topic.count} | ${topic.minimum} | ${topic.status} |`),
    "",
    "## Counts",
    "",
    "### By Chapter",
    "",
    "```json",
    JSON.stringify(byChapter, null, 2),
    "```",
    "",
    "### By Type",
    "",
    "```json",
    JSON.stringify(byType, null, 2),
    "```",
    "",
    "### By Year",
    "",
    "```json",
    JSON.stringify(byYear, null, 2),
    "```",
    "",
    "## Priority Next Actions",
    "",
    ...nextActions.map((action, index) => `${index + 1}. ${action}`),
    "",
    "## Companion Coverage Matrix",
    "",
    "- [Coverage matrix report](coverage-matrix.md)",
    "- [Coverage matrix CSV](coverage-matrix.csv)",
    "- [Structured coverage matrix](coverage-matrix.json)",
    "",
    "## Companion Promotion Queue",
    "",
    "- [Promotion queue report](promotion-queue.md)",
    "- [Promotion queue CSV](promotion-queue.csv)",
    "- [Structured promotion queue](promotion-queue.json)",
    "",
    "## Companion Search Playbook",
    "",
    "- [Search playbook report](search-playbook.md)",
    "- [Search playbook CSV](search-playbook.csv)",
    "- [Structured search playbook](search-playbook.json)",
    "",
    "## Companion Hard-Gap Harvest",
    "",
    "- [Hard-gap harvest report](hard-gap-harvest.md)",
    "- [Hard-gap harvest CSV](hard-gap-harvest.csv)",
    "- [Structured hard-gap harvest](hard-gap-harvest.json)",
    ""
  ].join("\n");

  fs.writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_PATH, `${md}\n`);
  console.log(`Wrote ${path.relative(ROOT, JSON_PATH)} and ${path.relative(ROOT, MD_PATH)}.`);
}

main();
