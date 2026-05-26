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
```

The audit writes:

- `reports/compiler-gap-analysis.md`
- `reports/compiler-gap-analysis.json`

The current audit treats the corpus as a source-finding base, not as a
selection-ready FRUS chapter set. It identifies six main gaps: crisis files
dominate the set, 260 Scout Leads still need document-level extraction, source
notes and declassification details remain draft-level, NAC/USNATO traffic is
underrepresented, CFE and security-architecture records are thin, and 1997-2000
coverage is sparse relative to 1993-1995.

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

Use the plan as a pre-visit pull queue and same-day decision log template; do
not promote a folder title into the public corpus until an actual document has
date, participants, page span, markings, release status, and source-note path.

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
- 40 `pdd-` context records in `data/records.json` and `data/records.js`

Treat these as chronology and source-control leads. The diary can identify that
a relevant call, meeting, briefing, or summit event happened, but it does not
replace the memcon, telcon, briefing book, trip file, or source-image review
needed for final FRUS selection. The current report flags Madrid and Helsinki
summit coverage as high-risk gaps.

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
- `reports/compiler-gap-analysis.json`
- `reports/compiler-gap-analysis.md`
- `reports/clinton-library-research-plan.json`
- `reports/clinton-library-research-plan.md`

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
