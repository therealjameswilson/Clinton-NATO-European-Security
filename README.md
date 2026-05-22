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

## Source Anchors

- FRUS 1993-2000, Volume XVII, North Atlantic Treaty Organization; European Security: <https://history.state.gov/historicaldocuments/frus1993-00v17>
- FRUS production and editorial method: <https://history.state.gov/historicaldocuments/frus1989-92v31/abouttheseries>
- FRUS 1989-1992, Volume XXXI source-note model: <https://history.state.gov/historicaldocuments/frus1989-92v31>
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

The current pass adds 596 compiler records across Clinton Library released
memcons/telcons, Balkans source packets, Clinton-Russia high-level
cross-references, State FOIA/Strobe Talbott records, NARA Catalog/Scout leads,
and GovInfo Public Papers context.

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
