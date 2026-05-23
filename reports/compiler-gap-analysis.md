# Compiler Gap Analysis

Generated: 2026-05-23T13:37:09.835Z

## Basis

- Official FRUS Volume XVII status: Planned.
- Current record count: 596.
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
- [GovInfo Public Papers of the Presidents](https://www.govinfo.gov/app/collection/PPP)

## Production Gaps

- Needs selection decision: 277
- Needs chronology cleanup: 130
- Needs source-note completion: 134
- Source verification language present: 596
- Declassification watch items: 493
- Placeholder January 1 Scout Lead dates: 260

## Highest-Risk Gaps

### HIGH: Crisis Security Files dominate the set.

Evidence: 432 of 596 records are in the crisis lane.

Action: Run targeted enlargement, NATO-Russia institutional, USNATO/NAC, CFE, and NATO-EU searches before using this as a selection base.

### HIGH: Too many records are file-unit leads, not document-ready items.

Evidence: 260 Scout Leads; 260 have placeholder January 1 dates.

Action: Promote high-value NARA file-unit leads to document-level rows only after inspecting digital objects, extracting page spans, and recording actual dates.

### HIGH: Source-note and declassification details remain draft-level.

Evidence: 134 records fail the source-note gate; 596 records carry verify/pending language; 493 records remain on declassification watch.

Action: Prioritize source-note completion for include candidates before expanding the corpus.

### HIGH: NAC/USNATO traffic is underrepresented.

Evidence: 5 records match NAC/USNATO terms.

Action: Search USNATO, North Atlantic Council, S/S-S, EUR/RPM, NATO Mission, and cable traffic sources.

### MEDIUM: CFE and architecture records are thin.

Evidence: 4 CFE matches; 52 architecture-lane records.

Action: Run a specific CFE/OSCE/NATO-EU architecture pass rather than relying on broad Europe searches.

### MEDIUM: 1997-2000 coverage is sparse relative to 1993-1995.

Evidence: 1997: 44, 1998: 49, 1999: 44, 2000: 17.

Action: Run post-Madrid implementation, Kosovo endgame, NATO 50th anniversary, and 2000 transition searches.

## Topic Coverage

| Topic | Count | Minimum | Status |
| --- | ---: | ---: | --- |
| NATO enlargement, Madrid, accession, and Senate ratification | 114 | 80 | covered-by-count |
| Partnership for Peace and NATO partnership policy | 49 | 30 | covered-by-count |
| NATO-Russia, Founding Act, PJC, Primakov/Mamedov/Chernomyrdin | 175 | 90 | covered-by-count |
| Bosnia, Dayton, IFOR, and SFOR | 417 | 80 | covered-by-count |
| Kosovo, KFOR, and 1998-1999 NATO air campaign diplomacy | 340 | 70 | covered-by-count |
| OSCE/CSCE | 99 | 35 | covered-by-count |
| CFE and conventional forces | 4 | 20 | gap |
| NAC, USNATO, and North Atlantic Council traffic | 5 | 25 | gap |
| NATO Secretary General Solana/Claes and alliance leadership | 21 | 25 | gap |
| NATO-EU, EU, and European security architecture | 114 | 35 | covered-by-count |

## Counts

### By Chapter

```json
{
  "NATO Strategy and Enlargement": 27,
  "NATO-Russia and Partnership": 85,
  "European Security Architecture": 52,
  "Crisis Security Files": 432
}
```

### By Type

```json
{
  "Scout Lead": 260,
  "Memcon": 70,
  "Context": 66,
  "Telcon": 60,
  "Source Lead": 70,
  "Release Packet": 70
}
```

### By Year

```json
{
  "1993": 127,
  "1994": 106,
  "1995": 149,
  "1996": 60,
  "1997": 44,
  "1998": 49,
  "1999": 44,
  "2000": 17
}
```

## Priority Next Actions

1. Extract top 40 NARA Scout/Catalog leads into document-level records with page spans and actual dates.
2. Run a targeted USNATO/NAC cable and file-unit search; current count is too low for compiler confidence.
3. Run a CFE/OSCE/NATO-EU architecture pass and separate it from crisis material.
4. Audit source notes for all Include candidate records before adding more broad leads.
5. Split Bosnia/Kosovo crisis records into direct decision documents vs public/context material.
6. Add a coverage matrix for allies and institutions: NATO, USNATO/NAC, Russia, Poland, Czech Republic, Hungary, Germany, France, United Kingdom, EU, OSCE, and CFE.

