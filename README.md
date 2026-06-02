# FRUS 1993-2000 Volume XVII NATO and European Security Files

A GitHub Pages working site for the compiler assembling source leads for
*Foreign Relations of the United States, 1993-2000, Volume XVII, North Atlantic
Treaty Organization; European Security*.

The Office of the Historian currently lists this FRUS volume as **Planned**.
This repository follows the static-site pattern used by
[`therealjameswilson/Bush41-Western-Europe`](https://github.com/therealjameswilson/Bush41-Western-Europe),
but starts as an empty compiler workbench rather than a finished document set.

## Provisional Arrangement

1. NATO Strategy and Enlargement
2. NATO-Russia and Partnership
3. European Security Architecture
4. Crisis Security Files

Records inside each lane should be arranged chronologically by `sortDate`.
The public page now opens with a date-sorted declassified-document chronology
before the lane browser so a compiler can read the released record first.

## Declassified Chronology Export

The live page has a **Download chronology CSV** button beside the first
chronology section. It exports the current 240-record declassified chronology
from the browser for spreadsheet sorting.

For a local Markdown/CSV/JSON export after refreshing `data/records.json`, run:

```bash
node scripts/build-declassified-chronology.js
```

The export filters out Scout Leads, Source Leads, and public-statement context,
then writes a date-sorted working chronology for document review:

- `reports/declassified-document-chronology.md`
- `reports/declassified-document-chronology.csv`
- `reports/declassified-document-chronology.json`
- `reports/frus-v17-compiler-workbook.xlsx`

Use the Markdown file for reading order and either CSV for spreadsheet sorting
by date, document type, participants, source path, declassification status, and
next compiler action.

## Compiler Action Queue

The page now includes a generated **Compiler Action Queue** immediately after
the chronology. It ranks records by production risk and coverage value so a
compiler can move from reading order into the next best work: promoting Scout
Leads, splitting release packets, chasing Presidential Daily Diary events back
to substantive records, repairing source-note/declassification gaps, and
balancing weak CFE, NAC/USNATO, OSCE/CSCE, NATO-EU/ESDI, Madrid/accession, and
late-volume coverage.

Use **Download action queue CSV** on the live page for an in-browser export, or
download the committed static report for the same workbook-backed work queue:

- `reports/frus-v17-compiler-action-queue.csv`

## Citation Desk

The page also includes a generated **Citation Desk** after the action queue. It
surfaces source-note repair work, chronology/time checks, declassification
checks, and working first-note drafts. Record cards include **Copy source
note** controls for moving working citations into a draft, and the citation desk
has a **Download citation CSV** export for spreadsheet review. The committed
static citation ledger is also available as:

- `reports/frus-v17-citation-desk.csv`

Treat copied notes as working FRUS first notes until the source image confirms
markings, page span, excisions, marginalia, attachments, drafting, clearance,
and final chronological placement.

## Compiler Workbook

The public site includes a consolidated workbook for spreadsheet-first review:

- `reports/frus-v17-compiler-workbook.xlsx`

The workbook has tabs for the start-here dashboard, declassified chronology,
action queue, promotion queue, citation desk, Clinton Library pull sheet,
Presidential Daily Diary chases, gap risks, coverage matrix, search playbook,
source-note audit, and the full records index. To rebuild it from Codex or
another environment with the spreadsheet runtime available after refreshing the
component reports, run:

```bash
node scripts/build-declassified-chronology.js
node scripts/build-coverage-matrix.js
node scripts/build-search-playbook.js
node scripts/build-promotion-queue.js
node scripts/build-compiler-workbook.mjs
```

The workbook builder also refreshes:

- `reports/frus-v17-compiler-action-queue.csv`
- `reports/frus-v17-citation-desk.csv`

## Promotion Queue

The **Promotion Queue** turns Scout Leads and Source Leads into a document-level
extraction worksheet. It preserves the first 40 Scout/Catalog extraction targets
as a distinct batch, adds the first 40 released-source triage targets, and
provides blank fields for inspection status, actual document date, page span,
markings verification, source-note verification, promoted record ID, and final
compiler decision.

Run:

```bash
node scripts/build-promotion-queue.js
```

The script writes:

- `reports/promotion-queue.md`
- `reports/promotion-queue.csv`
- `reports/promotion-queue.json`

## Data Model

The canonical data file is `data/records.json`, with a generated
`data/records.js` mirror so the page can also render when opened directly from
the filesystem. The schema lives in `data/records.schema.json`, and the sample
shape lives in `data/records.sample.json`.

Each compiler record can track date, type, participants, countries, lane
assignment, release status, source identifiers, PDF or catalog links, source
notes, FRUS topic tags, and production-readiness fields.

## Source Note Model

Citation information is organized to match the source-note pattern used in
published FRUS volumes, especially the source notes in
*FRUS, 1989-1992, Volume XXXI*. A record should either provide a finished
`sourceNote` beginning with `Source:` or enough structured fields for the page
to draft one.

Preferred order:

1. Repository, collection, series, file unit, box, folder, and item identifier.
2. Original classification, precedence, distribution, and handling markings.
3. Transmission channel, addressees, meeting place, or document context.
4. Drafting, clearance, approval, marginalia, attachments, and source-page
   details.

Useful structured fields include `source.path`, `source.documentId`,
`source.caseNumber`, `documentMarkings`, `handlingMarkings`, `communication`,
`meetingLocation`, `clearance`, `sourcePages`, and `sourceNoteAddendum`.

## Source Note Style Audit

Run the style audit after any source-note refresh:

```bash
node scripts/extract-source-markings.js
node scripts/audit-source-notes.js
```

The marking extraction and audit write:

- `reports/source-marking-extraction.md`
- `reports/source-marking-extraction.json`
- `reports/source-note-style-audit.md`
- `reports/source-note-style-audit.json`

The extraction pass uses PDF text, OCR, item-image OCR, public-record context,
and explicit visual source-image review. The audit checks the displayed
`Source:` sentence against FRUS-style source-path, classification/handling, and
document-context expectations, and keeps compiler warnings or onsite-verification
reminders in `sourceNoteAddendum` rather than inside the first footnote. NARA
Scout Leads remain a research backlog until digital-object inspection promotes
specific documents into the compiler corpus.

## FRUS Production Workflow

The workbench is organized around the editorial and production practices
described in the FRUS "About the Series" front matter:

1. **Selection decision**: mark whether a source is an include candidate,
   context candidate, exclusion, or still pending.
2. **Chronological placement**: record Washington time and sort memcons/telcons
   by the time of the conversation, not the drafting date.
3. **Source-note readiness**: preserve repository path, exact item identifier,
   classification and handling markings, channel, drafting, clearance,
   approval, page spans, and who read the item.
4. **Declassification accounting**: mark full release, excisions, withheld
   documents, pending review, and omitted lines or pages when available.
5. **Annotation and access**: track related documents, public statements,
   memoirs or first-hand accounts, people, countries, and index terms.

The record UI includes issue filters for missing selection, source-note,
chronology, declassification, annotation, and index-term metadata.

## Compiler Gap Audit

Run the compiler-risk audit after refreshing records:

```bash
node scripts/audit-compiler-gaps.js
node scripts/build-coverage-matrix.js
node scripts/build-search-playbook.js
node scripts/build-promotion-queue.js
```

The audit writes:

- `reports/compiler-gap-analysis.md`
- `reports/compiler-gap-analysis.json`
- `reports/coverage-matrix.md`
- `reports/coverage-matrix.csv`
- `reports/coverage-matrix.json`
- `reports/search-playbook.md`
- `reports/search-playbook.csv`
- `reports/search-playbook.json`
- `reports/promotion-queue.md`
- `reports/promotion-queue.csv`
- `reports/promotion-queue.json`

The current audit treats the corpus as a source-finding base, not as a
selection-ready FRUS chapter set. It identifies six main gaps: crisis files
dominate the set, 260 Scout Leads still need document-level extraction, source
notes and declassification details remain draft-level, NAC/USNATO traffic is
underrepresented, CFE and security-architecture records are thin, and 1997-2000
coverage is sparse relative to 1993-1995.

The coverage matrix turns the audit's ally-and-institution control problem into
a quota-style sheet for NATO, USNATO/NAC, Russia, Poland, Czech Republic,
Hungary, Germany, France, the United Kingdom, EU/NATO-EU, OSCE/CSCE, CFE,
enlargement, Partnership for Peace, and the Bosnia/Kosovo crisis-balance rows.
It separates raw hits from document-level records so a high count does not hide
thin usable FRUS evidence.

The search playbook turns hard gaps and direct-document gaps into source-specific
queries across NARA Catalog, NARA Scout, State FOIA, Clinton Library, Clinton
Digital Library, the Strobe Talbott FOIA manifest, and GovInfo. Its CSV/workbook
fields are designed for live compiler use: search date, result count, promising
hits, promoted record IDs, and notes remain blank until the search is actually
run and the hit is promoted into document-level evidence.

## Clinton Library Research Plan

The site includes an onsite pull strategy built from the local Clinton Library
finding-aid PDFs for release `2013-0185-M`:

- `2013-0185-M_Part1.pdf`
- `2013-0185-M_Part2.pdf`
- `2013-0185-M_Part3.pdf`
- `2013-0185-M_Part4.pdf`

The plan prioritizes European Affairs policy files before broad crisis files,
then targets gaps in NAC/North Atlantic Council traffic, CFE, OSCE/CSCE,
Partnership for Peace, NATO-Russia, NATO-EU/ESDI, Executive Secretary trip
books, and PC/DC meeting chronology. It writes:

- `reports/clinton-library-research-plan.md`
- `reports/clinton-library-research-plan.json`
- `reports/clinton-library-pull-sheet.csv`

Use the site link or CSV as the pre-visit pull queue and same-day decision log;
do not promote a folder title into the public corpus until an actual document
has date, participants, page span, markings, release status, and source-note
path. To rebuild the pull sheet after editing the structured plan, run:

```bash
node scripts/build-clinton-library-pull-sheet.js
```

## Presidential Daily Diary Search

Run the Daily Diary pass after the collection source pass when you need
chronology for calls, meetings, briefings, summit sessions, and trip events:

```bash
node scripts/search-presidential-daily-diary.js
```

The script searches the NARA Catalog Presidential Daily Diary releases, including
the user-supplied `2010-0083-F` query and broader NATO/European-security terms,
then writes:

- `reports/presidential-daily-diary-search.md`
- `reports/presidential-daily-diary-search.json`
- `reports/presidential-daily-diary-chase-sheet.csv`
- 40 `pdd-` context records in `data/records.json` and `data/records.js`

Treat these as chronology and source-control leads. The diary can identify that
a relevant call, meeting, briefing, or summit event happened, but it does not
replace the memcon, telcon, briefing book, trip file, or source-image review
needed for final FRUS selection. The current report flags Madrid and Helsinki
summit coverage as high-risk gaps.

Use the chase-sheet CSV as the working log for turning diary references into
substantive records. It keeps the NAID, release, page reference, participants,
topics, PDF link, and next source to chase beside blank fields for the memcon,
telcon, trip file, source-note check, and final selection decision. To rebuild
just that worksheet after editing the structured report, run:

```bash
node scripts/build-daily-diary-chase-sheet.js
```

## Source Anchors

- FRUS 1993-2000, Volume XVII, North Atlantic Treaty Organization; European Security: <https://history.state.gov/historicaldocuments/frus1993-00v17>
- FRUS production and editorial method: <https://history.state.gov/historicaldocuments/frus1989-92v31/abouttheseries>
- FRUS 1989-1992, Volume XXXI source-note model: <https://history.state.gov/historicaldocuments/frus1989-92v31>
- NARA Presidential Daily Diary 2010-0083-F search: <https://catalog.archives.gov/search?q=%222010-0083-F%22&collectionIdentifier=WJC*>
- Clinton Library research guide: <https://www.clintonlibrary.gov/research/guide>
- Clinton Digital Library finding aids: <https://clinton.presidentiallibraries.us/items/browse?collection=82&sort_dir=a&sort_field=Dublin+Core%2CIdentifier>
- Clinton Library Memcons and Telcons: <https://www.clintonlibrary.gov/research/memcons-and-telcons>
- Clinton Library Meetings and Telephone Calls with Foreign Leaders: <https://www.clintonlibrary.gov/research/meetings-and-telephone-calls-foreign-leaders>
- State Department FOIA Virtual Reading Room: <https://foia.state.gov/>
- National Archives Catalog: <https://catalog.archives.gov/>
- GovInfo Public Papers of the Presidents: <https://www.govinfo.gov/app/collection/PPP>
- Strobe Talbott FOIA manifest: <https://therealjameswilson.github.io/strobe-talbott-foia/manifest.html>

## Source Check

Run the collection source pass from this repository:

```bash
node scripts/build-records-from-collection-sources.js
```

The script reads the sibling FRUS companion harvests under the parent collection
directory, checks the same source classes used by the other sites, dedupes by
source URL or item identifier, and writes:

- `data/records.json`
- `data/records.js`
- `reports/source-check.json`

The companion reports tracked in this repository include:

- `reports/compiler-gap-analysis.json`
- `reports/compiler-gap-analysis.md`
- `reports/coverage-matrix.json`
- `reports/coverage-matrix.md`
- `reports/coverage-matrix.csv`
- `reports/promotion-queue.json`
- `reports/promotion-queue.md`
- `reports/promotion-queue.csv`
- `reports/search-playbook.json`
- `reports/search-playbook.md`
- `reports/search-playbook.csv`
- `reports/clinton-library-research-plan.json`
- `reports/clinton-library-research-plan.md`
- `reports/clinton-library-pull-sheet.csv`
- `reports/presidential-daily-diary-chase-sheet.csv`
- `reports/frus-v17-compiler-action-queue.csv`
- `reports/frus-v17-citation-desk.csv`
- `reports/frus-v17-compiler-workbook.xlsx`

The current pass adds 596 compiler records across Clinton Library released
memcons/telcons, Balkans source packets, Clinton-Russia high-level
cross-references, State FOIA/Strobe Talbott records, NARA Catalog/Scout leads,
and GovInfo Public Papers context.

The separate Presidential Daily Diary pass adds 40 chronology context records
for calls and meetings pertinent to Volume XVII.

## Local Preview

Run a local static server so the page can fetch `data/records.json`:

```bash
python3 -m http.server 4197 --bind 127.0.0.1
```

Then open <http://127.0.0.1:4197/>.

## Publish

This repository deploys through GitHub Pages with `.github/workflows/deploy-pages.yml`.

The repository Pages source is configured for **GitHub Actions**. The public site
is expected at <https://therealjameswilson.github.io/Clinton-NATO-European-Security/>.
