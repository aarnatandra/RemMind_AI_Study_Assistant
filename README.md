# RemMind Study Hub

A local-first study workspace for planning study sessions, practising flashcards with spaced-repetition intervals, organizing subject notes, taking self-check quizzes, and reading local PDFs side-by-side with your notes. Built with semantic HTML, CSS, and vanilla JavaScript with zero external runtime dependencies. There is no build step and nothing to install.

## Features

- **Dashboard & Focus Timer:** View open tasks, due flashcards, saved notes, and completed reviews alongside a built-in Pomodoro focus timer (25, 15, and 5-minute presets).
- **Study Planner:** Create study tasks with subjects, estimated duration, due dates, and priority levels (`Low`, `Medium`, `High`). Filter by `All`, `Open`, or `Done`. Overdue tasks are flagged.
- **Flashcards & Active Recall:** Build question-and-answer decks by subject and schedule reviews using self-rated difficulty (`Again`, `Hard`, `Good`, `Easy`).
- **Notes Library:** Write, edit, delete, and search study notes across subjects.
- **Practice Quiz:** Generate 5, 10, or 20-question self-check quizzes directly from your saved flashcards.
- **PDF Reader:** Open local PDF documents inside your browser and take structured reading notes right next to the document.
- **Offline Study Helper:** Search across all saved notes and flashcards by keyword or topic locally in the browser.
- **JSON Backup & Restore:** Export your entire workspace to a `.json` file or import a previous backup at any time.

## Project Structure

```text
remmind-study-hub/
├── index.html                  # Public landing page
├── app.html                    # Main study workspace application
├── run-local.bat               # One-click local server launcher for Windows
├── package.json                # Project scripts and metadata
├── LICENSE                     # MIT License
├── styles/
│   ├── base.css                # Design tokens, typography, and shared UI components
│   ├── landing.css             # Landing page layout and styles
│   └── app.css                 # Workspace layout and responsive styles
├── src/
│   ├── app.js                  # UI rendering, routing, timer, and event handlers
│   ├── core.js                 # State normalization, scheduling, and search logic
│   └── storage.js              # Browser localStorage wrapper
├── tests/
│   └── run-node.js             # Unit tests for core application logic
├── docs/
│   ├── ARCHITECTURE.md         # Architecture overview
│   ├── ATTRIBUTION.md          # Source provenance
│   └── ROADMAP.md              # Planned enhancements
└── .github/
    └── workflows/
        └── tests.yml           # Automated CI unit test workflow
```

## Prerequisites

Because the workspace uses JavaScript ES modules (`<script type="module">`), browsers block loading `app.html` directly by double-clicking it (`file://`). The app must be served over `http://localhost`. You need **one** of the following:

- **Option A:** [Python 3](https://www.python.org/) (recommended; preinstalled on most macOS/Linux systems and easy to install on Windows). Any Python 3 version works.
- **Option B:** [Node.js 18+](https://nodejs.org/) (also needed to run the unit tests).
- **Option C:** Visual Studio Code with the **Live Server** extension.

You also need a modern desktop browser. The app was tested in a Chromium-based browser (Chrome/Edge); it uses only standard web features and is expected to work in current Firefox and Safari as well. No internet connection is needed once the files are on your computer, except for Option B's `npx serve`, which downloads the small `serve` helper the first time it runs.

## How to Run Locally (Step-by-Step)

### Step 1: Extract the Project

1. Extract `remmind-study-hub.zip` to a folder on your computer.
2. Open the extracted `remmind-study-hub` folder.
3. Check that you can see `index.html`, `app.html`, `src`, and `styles` **directly inside** this folder. If you only see another folder named `remmind-study-hub`, open that one instead. All commands below must be run from the folder that contains `app.html`.

### Step 2: Start a Local Server

Choose **one** of the following methods:

#### Method 1: Windows One-Click Launcher (`run-local.bat`)
1. Double-click `run-local.bat` inside the `remmind-study-hub` folder.
2. A command prompt window will start the local server on port `8000` and automatically open `http://localhost:8000` in your default browser. (Requires Python; the launcher uses `py` if available, otherwise `python`.)
3. Keep the server command prompt window open while using the app. Close that window (or press `Ctrl+C` in it) when finished.

#### Method 2: Using Python (Windows, macOS, or Linux)
1. Open a terminal (PowerShell, Command Prompt, or Terminal) **inside the folder that contains `app.html`**.
2. Run the built-in HTTP server:
   ```bash
   python -m http.server 8000
   ```
   *(On Windows, if `python` is not recognized, use `py -m http.server 8000`. On macOS/Linux, use `python3 -m http.server 8000`.)*
3. Open your browser and visit:
   - Landing page: `http://localhost:8000`
   - Workspace directly: `http://localhost:8000/app.html`
4. Press `Ctrl+C` in the terminal to stop the server.

#### Method 3: Using Node.js
1. Open a terminal inside the folder that contains `app.html`.
2. Start a static server using `npx` (no installation required; needs internet the first time):
   ```bash
   npx serve -l 8000
   ```
3. Open `http://localhost:8000` in your browser. (This server shows the workspace at `http://localhost:8000/app`; that is normal.)
4. Press `Ctrl+C` in the terminal to stop the server.

> `npm run serve` is a shortcut for `python -m http.server 8000`. It only works where the command `python` exists. On macOS/Linux systems that only have `python3`, use Method 2 with `python3` instead.

#### Method 4: Using VS Code Live Server
1. Open the folder that contains `app.html` in Visual Studio Code.
2. Right-click `index.html` (or `app.html`) and select **Open with Live Server**. Live Server normally uses port `5500` instead of `8000`.

### Step 3: Check That It Works

After opening `http://localhost:8000`:

1. You should see the **RemMind Study Hub** landing page. Click **Start studying** to open the workspace.
2. In **Study planner**, add a task. It should appear in the list and on the **Overview** page.
3. In **Flashcards**, save a card. Only the **Show answer** button should be visible at first; the **Again / Hard / Good / Easy** buttons appear after you reveal the answer.
4. In **PDF reader**, choose a PDF. The PDF should appear in the viewer and the "No document selected" placeholder should disappear.
5. Reload the page. Your task, card, and notes should still be there.

### Troubleshooting

| Problem | Cause and fix |
| --- | --- |
| Blank page, or the console says a module script was blocked / CORS error | You opened `app.html` by double-clicking it (`file://`). Start a server (Step 2) and use `http://localhost:8000` instead. |
| Browser shows a file/directory listing instead of the landing page | The server was started in the wrong folder. Stop it and restart it inside the folder that contains `index.html` and `app.html`. |
| `python` is not recognized (Windows) | Use `py -m http.server 8000`, or install Python 3 and tick **Add Python to PATH**. |
| `python: command not found` (macOS/Linux) | Use `python3 -m http.server 8000`. |
| `Address already in use` / port 8000 is busy | Use another port, e.g. `python -m http.server 8080`, then open `http://localhost:8080`. Note that your saved data is kept per address and port (see below). |
| Page loads but is unstyled or buttons do nothing on Windows with Python's server | Rare: a Windows registry setting can make Python serve `.js` files with the wrong type. Use Method 3 (`npx serve`) or Method 4 (Live Server) instead. |
| My data disappeared | Data is saved per browser **and per address**. `localhost:8000`, `localhost:8080`, `127.0.0.1:8000`, and Live Server's port `5500` each have their own separate storage. Always use the same address, or move data with Export/Import. Clearing browser site data also removes it. |
| PDF does not display on a phone/tablet | The reader relies on your browser's built-in PDF viewer, which some mobile browsers do not provide. Use a desktop browser. |

## Running Unit Tests

To run the automated unit tests for task summaries, flashcard scheduling, keyword scoring, and state validation (requires Node.js 18 or newer; no `npm install` is needed because there are no dependencies):

```bash
npm test
```

Or run the test runner directly with Node:

```bash
node tests/run-node.js
```

A successful run prints `All core unit checks passed.` and exits without errors. These tests cover the logic in `src/core.js` only; the user interface is not covered by automated tests.

## Data Storage & Privacy

- **100% Local Storage:** All tasks, flashcards, notes, and review counts are stored in your browser's `localStorage` under the key `remmind_study_hub_v1`, separately for each address/port you use.
- **No Cloud or External APIs:** Your notes and PDFs are never uploaded to an external server or third-party AI provider. The app makes no network requests other than loading its own files from the local server.
- **Backups:** Clearing your browser site data will remove local workspace data. Use **Data & settings → Export your data → Download backup** inside the workspace regularly to save a `.json` backup file, and **Import a backup** to restore it. Importing replaces the current workspace.
- **Backup contents:** The backup file contains only your tasks, cards, notes, review count, and timestamps. It does not contain your name, e-mail address, or device information.

## Current Scope & Limitations

- **Offline Study Helper:** Uses local keyword and token matching across your saved notes and flashcards rather than a live cloud LLM.
- **Spaced Repetition:** Uses a lightweight interval heuristic rather than full SM-2 or FSRS.
- **PDF Viewer:** Uses your browser's native PDF rendering engine; automated PDF text extraction and OCR are not included. Opened PDFs are not remembered after you close or reload the page.
- **Editing:** Notes can be edited; tasks and flashcards can only be added, completed, or deleted.
- **No accounts or sync:** Data does not sync between browsers or devices.

## License

This project is licensed under the [MIT License](LICENSE).
