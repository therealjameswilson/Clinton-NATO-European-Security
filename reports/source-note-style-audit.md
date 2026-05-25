# Source Note Style Audit

Generated: 2026-05-25T12:01:09.630Z

## FRUS Model

- [FRUS 1989-1992, Volume XXXI, Document 1](https://history.state.gov/historicaldocuments/frus1989-92v31/d1): Source path; classification and handling markings; drafting, marginalia, attachment, or copy-context detail.
- [FRUS 1989-1992, Volume XXXI, Document 10](https://history.state.gov/historicaldocuments/frus1989-92v31/d10): Source path; classification.
- [FRUS 1989-1992, Volume XXXI, Document 50](https://history.state.gov/historicaldocuments/frus1989-92v31/d50): Source path; classification; meeting-location context.

## Rule Applied

Keep the displayed first footnote as a Source sentence only: repository and collection path first, exact folder/item identifier next, then classification/handling and document-context details when verified. Keep compiler warnings outside the Source sentence.

## Counts

- Records audited: 596
- Notes beginning with `Source:`: 596
- Notes with a repository/path shape: 596
- Raw URLs inside displayed Source note: 0
- Production language inside displayed Source note: 0
- Production review notes kept outside Source note: 530
- Notes still needing verified classification/handling/context details: 542
- File-unit Scout Leads still needing document-level source notes: 260

## Issue Counts

```json
{
  "needs-markings": 542,
  "file-unit-not-document-level": 260,
  "review-note-not-source-note": 530
}
```

## Actions

1. Do not append compiler verification language to the displayed Source note.
2. Normalize repository names: National Archives and Records Administration, National Archives Catalog; Department of State, FOIA Virtual Reading Room; William J. Clinton Presidential Library or FRUS-style Clinton Library shorthand.
3. Capitalize Release, Item, and Document identifiers inside source notes.
4. Replace raw source URLs in displayed Source notes with stable item, document, release, case, or NAID identifiers.
5. Before treating an Include candidate as FRUS-ready, verify classification, handling markings, page span, drafting/clearance, marginalia, attachments, and excisions from the original image or PDF.
6. Convert Scout Leads from file-unit source notes to document-level source notes only after onsite or digital-object inspection.

