# Sales Reorder CSV Generator

Vite-based frontend that:

1. lets a user upload an `.xlsx`/`.xls`
2. computes a composite sales score per row (ported from the original Node scripts)
3. sorts by score and allocates lines to a budget
4. generates two downloadable CSVs:
    - `recommended_reorders_YYYY-MM-DD.csv`
    - `backlog_YYYY-MM-DD.csv`

## Requirements

- Node.js 18+

## Run

- `npm install`
- `npm run dev`
- Open the shown URL (usually `http://localhost:5173`)

## Spreadsheet columns

The app expects the same column names used by the original scripts. Key fields:

- `EAN` (used as ISBN in the output)
- `Title`
- `Cost`
- Fields used for scoring: `QoH`, `QoO`, `Tot Sales`, `ST`, `SW`, `SM`, `STY`, `Last Sale`, `Last Delivery`, `Core`, `Bg`

Missing/blank numeric fields are treated as `0`. Missing/invalid dates in `Last Sale` / `Last Delivery` are treated as non-recent.
