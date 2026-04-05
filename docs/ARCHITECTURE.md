# Architecture

RemMind Study Hub is a static, local-first web application built with HTML, CSS and vanilla JavaScript. It intentionally has no build step or external runtime dependency.

## Main files

- `index.html`: public landing page.
- `app.html`: workspace shell and all views.
- `styles/base.css`: tokens, controls and shared components.
- `styles/landing.css`: landing-page layout.
- `styles/app.css`: responsive workspace layout.
- `src/core.js`: pure data validation, task summaries, card scheduling and matching functions.
- `src/storage.js`: localStorage loading and saving.
- `src/app.js`: DOM rendering, forms, routes, timer and app events.
- `tests/run-node.js`: unit tests for core functions.

## Data model

Local state uses the `remmind_study_hub_v1` localStorage key and contains `tasks`, `cards`, `notes` and `reviewCount`. The app does not sync across browsers or devices. JSON export/import provides a manual backup path.

## Spaced-repetition note

The current card scheduler is a small transparent interval heuristic inspired by spaced-repetition workflows. It is **not** an implementation of FSRS or the full SM-2 algorithm. It should not be labelled FSRS without adopting and testing the actual algorithm.

## AI and documents

There is no live LLM integration in this build. The study helper uses local keyword matching against saved notes and flashcards. The PDF reader opens a user-selected PDF in the browser; it does not extract text, run OCR, or upload a document.
