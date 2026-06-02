# Compiler Gap Analysis

Generated: 2026-06-02T01:31:19.480Z

## Basis

- Official FRUS Volume XVII status: Planned.
- Current record count: 636.
- This is a source-finding corpus, not a selection-ready FRUS chapter base.
- Count coverage does not equal FRUS coverage until individual documents have verified dates, source notes, declassification accounting, and selection decisions.

## Source Classes Checked

- [FRUS 1993-2000, Volume XVII status page](https://history.state.gov/historicaldocuments/frus1993-00v17)
- [FRUS production and editorial method](https://history.state.gov/historicaldocuments/frus1989-92v31/abouttheseries)
- [FRUS 1989-1992, Volume XXXI source-note model](https://history.state.gov/historicaldocuments/frus1989-92v31)
- [Clinton Library memcons, telcons, meetings, and calls](https://www.clintonlibrary.gov/research/memcons-and-telcons)
- [Department of State FOIA Virtual Reading Room](https://foia.state.gov/)
- [Strobe Talbott FOIA manifest](https://therealjameswilson.github.io/strobe-talbott-foia/manifest.html)
- [National Archives Catalog and NARA Scout leads](https://catalog.archives.gov/)
- [Presidential Daily Diary 2010-0083-F and related diary releases](https://catalog.archives.gov/search?q=%222010-0083-F%22&collectionIdentifier=WJC*)
- [GovInfo Public Papers of the Presidents](https://www.govinfo.gov/app/collection/PPP)

## Production Gaps

- Needs selection decision: 277
- Needs chronology cleanup: 130
- Needs source-note completion: 134
- Source verification language present: 596
- Declassification watch items: 533
- Placeholder January 1 Scout Lead dates: 260

## Highest-Risk Gaps

### HIGH: Crisis Security Files dominate the set.

Evidence: 453 of 636 records are in the crisis lane.

Action: Run targeted enlargement, NATO-Russia institutional, USNATO/NAC, CFE, and NATO-EU searches before using this as a selection base.

### HIGH: Too many records are file-unit leads, not document-ready items.

Evidence: 260 Scout Leads; 260 have placeholder January 1 dates.

Action: Promote high-value NARA file-unit leads to document-level rows only after inspecting digital objects, extracting page spans, and recording actual dates.

### HIGH: Source-note and declassification details remain draft-level.

Evidence: 134 records fail the source-note gate; 596 records carry verify/pending language; 533 records remain on declassification watch.

Action: Prioritize source-note completion for include candidates before expanding the corpus.

### HIGH: NAC/USNATO traffic is underrepresented.

Evidence: 6 records match NAC/USNATO terms.

Action: Search USNATO, North Atlantic Council, S/S-S, EUR/RPM, NATO Mission, and cable traffic sources.

### MEDIUM: CFE and architecture records are thin.

Evidence: 6 CFE matches; 53 architecture-lane records.

Action: Run a specific CFE/OSCE/NATO-EU architecture pass rather than relying on broad Europe searches.

### MEDIUM: 1997-2000 coverage is sparse relative to 1993-1995.

Evidence: 1997: 45, 1998: 57, 1999: 54, 2000: 20.

Action: Run post-Madrid implementation, Kosovo endgame, NATO 50th anniversary, and 2000 transition searches.

## Topic Coverage

| Topic | Count | Minimum | Status |
| --- | ---: | ---: | --- |
| NATO enlargement, Madrid, accession, and Senate ratification | 125 | 80 | covered-by-count |
| Partnership for Peace and NATO partnership policy | 50 | 30 | covered-by-count |
| NATO-Russia, Founding Act, PJC, Primakov/Mamedov/Chernomyrdin | 191 | 90 | covered-by-count |
| Bosnia, Dayton, IFOR, and SFOR | 430 | 80 | covered-by-count |
| Kosovo, KFOR, and 1998-1999 NATO air campaign diplomacy | 350 | 70 | covered-by-count |
| OSCE/CSCE | 102 | 35 | covered-by-count |
| CFE and conventional forces | 6 | 20 | gap |
| NAC, USNATO, and North Atlantic Council traffic | 6 | 25 | gap |
| NATO Secretary General Solana/Claes and alliance leadership | 30 | 25 | covered-by-count |
| NATO-EU, EU, and European security architecture | 114 | 35 | covered-by-count |

## Counts

### By Chapter

```json
{
  "NATO Strategy and Enlargement": 35,
  "NATO-Russia and Partnership": 95,
  "European Security Architecture": 53,
  "Crisis Security Files": 453
}
```

### By Type

```json
{
  "Scout Lead": 260,
  "Memcon": 70,
  "Context": 106,
  "Telcon": 60,
  "Source Lead": 70,
  "Release Packet": 70
}
```

### By Year

```json
{
  "1993": 130,
  "1994": 113,
  "1995": 154,
  "1996": 63,
  "1997": 45,
  "1998": 57,
  "1999": 54,
  "2000": 20
}
```

## Priority Next Actions

1. Extract top 40 NARA Scout/Catalog leads into document-level records with page spans and actual dates.
2. Run a targeted USNATO/NAC cable and file-unit search; current count is too low for compiler confidence.
3. Run a CFE/OSCE/NATO-EU architecture pass and separate it from crisis material.
4. Audit source notes for all Include candidate records before adding more broad leads.
5. Split Bosnia/Kosovo crisis records into direct decision documents vs public/context material.
6. Use the coverage matrix to set ally and institution quotas before final selection: NATO, USNATO/NAC, Russia, Poland, Czech Republic, Hungary, Germany, France, United Kingdom, EU, OSCE, and CFE.

## Companion Coverage Matrix

- [Coverage matrix report](coverage-matrix.md)
- [Coverage matrix CSV](coverage-matrix.csv)
- [Structured coverage matrix](coverage-matrix.json)

