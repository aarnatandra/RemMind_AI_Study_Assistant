# Import, export and analytics tools

These modules sit beside the original workspace. They do not change `app.html` or `src/app.js`; open `tools.html` (through the local server) to use them.

## Running the tests

```text
node tests/run-all.js
```

This runs the original `tests/run-node.js` plus every `tests/*.test.js` file. `npm test` still runs only the original core tests.

## Modules

| File | Purpose |
| --- | --- |
| `src/csv.js` | CSV parsing and writing with quoted fields, BOM and CRLF handling; flashcard CSV import/export. |
| `src/markdown-import.js` | Flashcards from `Q:`/`A:` blocks or `term :: definition` lines; notes from `# Title` sections; matching exporters. |
| `src/sm2.js` | A documented SM-2 scheduler using the app's card fields. Not wired into the workspace yet. |
| `src/analytics.js` | Per-subject summary, study streaks, 7-day activity, workload forecast and card maturity. |
| `src/subjects.js` | Subject normalisation, record builders, filtering, grouping and duplicate detection. |
| `src/formatters.js` | Day keys, durations, percentages, relative due text, slugs. |
| `src/tools-page.js` | Browser wiring for `tools.html`. |

## Formats

CSV flashcards use a header row of `front,back,subject` (column order is free; `subject` is optional). Without a header, the first three columns are used.

Markdown flashcards:

```text
## Databases
Q: What is a primary key?
A: A column set that uniquely identifies each row.
ACID :: Atomicity, Consistency, Isolation, Durability
```

Markdown notes start each note with a level-one heading. An optional `Subject: Name` line may follow it.

## Limits worth knowing

- Only the most recent review of each card is stored, so activity charts cannot show older review history.
- Imports skip cards whose front text already exists (case-insensitive).
- Exported Markdown collapses blank lines inside an answer so it can be re-imported.
- SM-2 here clamps ease to 1.3-3.0 and leaves ease unchanged after a failed review.
