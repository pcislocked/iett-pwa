# AI Agent Operational Guide & Rulebook

This document is the permanent operational constitution for any AI agent working on this ecosystem. It is written to be version-agnostic and unambiguous. Follow every rule in this document literally. Do not improvise, do not assume permissions, and do not take shortcuts.

---

## 0. Absolute Red Lines (Zero-Tolerance Rules)

### Rule 0.1: Mandatory Timestamped Approval Gate (`onaylıyorum, dd/mm/yyyy hh:mm`)
1. **No Autonomous Releases or Merges:** You are strictly forbidden from bumping versions, creating git tags, publishing GitHub releases, or merging Pull Requests on your own initiative.
2. **All Work Goes Into a PR:** All implementation work for a task cycle must be committed to a dedicated branch and submitted as a Pull Request (PR) at the end.
3. **Critical Operations Requiring Explicit Timestamped Approval:**
   You MUST NOT execute any of the following operations unless the user explicitly replies in the format **`onaylıyorum, dd/mm/yyyy hh:mm`** (or `dd.mm.yyyy hh:mm`):
   - Cutting a new version, creating/pushing a git tag (`git tag`, `git push --tags`), or creating a GitHub release (`gh release create`).
   - Merging any Pull Request (`gh pr merge`, `git merge` into `master`/`main`).
   - Deleting a large number of files, deleting branches/tags, running `git reset --hard` / `git push --force`, or wiping databases (`data/*.db`).
   - Stopping, restarting, or redeploying production Docker containers.
4. **Strict Validation Algorithm (How to Check User Approval):**
   - Check the user's latest message and compare it against the current local timestamp.
   - The message **MUST** contain both the word `onaylıyorum` AND the current date and time formatted as `dd/mm/yyyy hh:mm` or `dd.mm.yyyy hh:mm` (e.g., `onaylıyorum, 26/10/2026 16:35`).
   - **IF THE TIMESTAMP IS MISSING OR STALE:** Even if the user writes `"onaylıyorum"`, `"evet"`, `"merge et"`, `"sürüm çık"`, or `"onaylıyorum"` without the current date and time, you MUST **REFUSE** to execute the action and reply:
     > `"Bu kritik işlemi gerçekleştirebilmem için güncel tarih ve saat ile 'onaylıyorum, dd/mm/yyyy hh:mm' formatında onay vermeniz gerekiyor."`

### Rule 0.2: Documentation Editing Protocol (Never Use Code or Scripts)
1. **No Scripted Doc Manipulation:** You are strictly forbidden from using Python (`python -c`, `.py` scripts), Node.js, PowerShell (`Set-Content`, `Out-File`, `-replace`), Bash (`sed`, `awk`, `cat <<EOF`, `>`), or any other programmatic method to create, modify, format, or overwrite documentation files (`.md`, `.txt`, `README.md`, `aidocs/*`, or Wiki files). Scripted edits frequently corrupt UTF-8/Turkish characters, strip sections, or break line endings.
2. **Local Documentation Flow:**
   - Always inspect the target section first using native file reading tools.
   - Always apply changes exclusively using native file editing tools.
3. **Remote Documentation Flow (e.g., GitHub Wiki / Remote Doc Repos):**
   Whenever editing documentation that lives in a remote repository (such as Wiki repositories), you MUST execute this exact 5-step sequence in order:
   1. **Backup:** Copy the existing files to a timestamped local backup directory outside the git working tree before making any changes.
   2. **Pull:** Fetch and pull the latest remote changes (`git fetch origin && git pull --rebase`).
   3. **Edit:** Edit the documentation files **strictly using native tools** — never via scripts.
   4. **Push:** Stage, commit, and push the changes (`git add`, `git commit`, `git push`).
   5. **Verify:** Fetch/check the remote state and run `git diff` against the backup to confirm zero unintended deletions, encoding corruption, or formatting damage.

### Rule 0.3: Anti-Hallucination & Scope Discipline
1. **Never Invent Unrequested Features:** Implement **only** what the user explicitly asked for. Do not add "helpful" extra UI widgets, preset buttons/chips, extra settings toggles, or speculative abstractions unless requested.
2. **Server vs. Client Placement:** Before designing any caching, storage, or data-processing feature, verify whether it belongs on the backend (`iett-middle`) or the frontend (`iett-pwa`). Shared/global data (e.g., fleet state, plate mappings, persistent stop caches) belongs on the **server (`iett-middle`)**, not in individual users' browsers, unless explicitly specified otherwise.

---

## 1. Multi-Repo Architecture & Component Roles

The ecosystem consists of independent repositories, each with its own CI pipeline and version lifecycle:

| Repository | Role & Tech Stack | Primary Branch |
| :--- | :--- | :--- |
| `iett-middle` | Backend REST API, background fleet poller, SOAP/NTCAPI/Scraper proxy, & SQLite persistent caches (`FastAPI`, `Python 3.12+`, `aiohttp`, `SQLite WAL`) | `master` |
| `iett-pwa` | Progressive Web App frontend (`React 18`, `TypeScript`, `Vite`, `Tailwind CSS`, `Leaflet`, `Vitest`) | `master` |
| `iett-hacs` | Home Assistant custom integration & Lovelace card (`Python`, `aiohttp`, `Vanilla JS Web Component`) | `master` |

- **Virtual Environment:** Always use the dedicated virtual environment (`.venv`) for Python dependencies and tests. Never run global `pip install`.

---

## 2. Standard Development & Implementation Lifecycle

Every task or feature request must follow this exact lifecycle from start to finish:

### Phase 1: Codebase Deep-Dive (Before Writing Code or Planning)
For every single feature or bugfix:
1. **Traverse the Codebase:** Search and read all relevant files across backend and frontend. Do not guess file names, model fields, or endpoint signatures.
2. **Locate Exact Integration Points:** Identify the exact functions, React components, hooks, Pydantic models, and line ranges involved.
3. **Reuse Existing Architectural Patterns:**
   - If adding persistent storage in `iett-middle`, follow the existing SQLite WAL + `threading.Lock` + `COALESCE` non-destructive upsert pattern (e.g., `app/services/vehicle_cache.py`, `app/services/stop_cache.py`).
   - If adding UI/hooks in `iett-pwa`, follow existing hook, `AbortController`, and Tailwind theme token (`surface-*`, `text-*`, `brand-*`) conventions.

### Phase 2: Branch Isolation
- **Never Commit Directly to `master`:** Always create or switch to a descriptive branch (`feat/...`, `fix/...`, `chore/...`) inside the target repository before editing code.
- **Consolidate Into One PR:** Keep all changes for the current work cycle cleanly organized on the branch so they are submitted together in a single Pull Request per affected repository at the end.

### Phase 3: Mandatory Architectural Guardrails
1. **Backend Guardrails (`iett-middle`):**
   - **No Event-Loop Blocking:** Never run CPU-bound parsing (e.g., `BeautifulSoup` HTML scraping, PIL/OCR image processing) or synchronous disk/SQLite writes directly on the `asyncio` event loop. Always offload them via `await asyncio.to_thread(...)` or `loop.run_in_executor(None, ...)`.
   - **Thread-Safe & Non-Destructive SQLite Caches:** All SQLite connections must enable `PRAGMA journal_mode = WAL;`, protect writes with a lock, and use `COALESCE(excluded.col, table.col)` on `ON CONFLICT DO UPDATE` so partial upstream data never overwrites existing non-null fields with `NULL`.
   - **Shared HTTP Sessions:** Reuse the shared `aiohttp.ClientSession` via `deps.get_session()` rather than creating unclosed per-request sessions.
2. **Frontend Guardrails (`iett-pwa`):**
   - **Unmount & Race Protection:** Every `useEffect` or async handler that performs network requests or timers must use an `AbortController` (`signal`) or cleanup function (`clearTimeout` / `clearInterval`) to prevent state updates on unmounted components.
   - **Map Performance & Data Saver:** Every Leaflet `<TileLayer>` must include `keepBuffer={1}` (or `2`), `updateWhenIdle={true}`, and `updateWhenZooming={false}` to prevent tile storms during `flyTo` / zoom animations. Map viewport listeners (`zoomend`, `moveend`) must be debounced.
   - **i18n Rules (`public/locales/`):**
     - Every new user-facing string must be added to both `public/locales/tr.json` and `public/locales/en.json` with identical key structure (`src/__tests__/i18n.test.ts` enforces 100% key parity between `tr` and `en`).
     - **CRITICAL (`ku.json`):** `public/locales/ku.json` intentionally uses `\u2800` (Braille blank) as an easter egg. Never translate `ku.json` into actual text and never delete it.
3. **Home Assistant Guardrails (`iett-hacs`):**
   - **Line-Ending Agnostic Hashing:** When computing static asset hashes (e.g., `iett-card.js`), normalize `\r\n` to `\n` so hashes remain identical across Windows and Linux.
   - **DOM Connection Check:** In `iett-card.js`, always check `if (this.isConnected)` inside `async`/`finally` blocks before mutating the Shadow DOM.

---

## 3. Verification, Peer Review & Pull Request Workflow

Before reporting that work is complete or asking for merge approval, you MUST complete all 4 verification steps:

### Step 1: Automated Tests, Linting & Production Build
Run the full verification suite for every modified repository:

- **`iett-middle`:**
  ```bash
  python -m ruff check app tests
  python -m pytest --cov=app --cov-report=term-missing
  ```
- **`iett-pwa`:**
  ```bash
  npm run typecheck
  npm test
  npm run build
  ```
  *(Note: Always run `npm run build` in addition to `npm test` because Vite/Rollup production bundling catches minification, temporal-dead-zone, and import issues that dev mode misses.)*
- **`iett-hacs`:**
  ```bash
  python -m ruff check .
  python -m pytest --cov=custom_components.iett --cov-report=term-missing
  node --check custom_components/iett/frontend/iett-card.js
  ```

### Step 2: Independent Subagent Peer Review
- Spawn an isolated **Reviewer Subagent** and instruct it to audit the full git diff (`git diff master...HEAD`) strictly following the 9-section template in the review prompt.
- If the Reviewer Subagent returns `REQUEST_CHANGES` or identifies any `CRITICAL`, `HIGH`, or `MEDIUM` issues, fix them immediately, re-run Step 1 tests, and re-verify with the reviewer in a loop until the verdict is **`APPROVE`**.

### Step 3: Push Branch & Open/Update Pull Request
- Push the branch to `origin` and create or update the Pull Request (`gh pr create` / `gh pr view`).
- Check GitHub Actions status (`gh pr checks` or `gh run list`) to verify remote CI passes.

### Step 4: Report to User & Await Timestamped Approval
- Present the PR link, summary of changes, and verification results to the user.
- **STOP HERE.** Do not merge the PR and do not cut a release until the user provides the explicit **`onaylıyorum, dd/mm/yyyy hh:mm`** confirmation (Rule 0.1).

---

## 4. Versioning, Tagging & Release Procedure

> **GATE:** Do NOT execute any command in this section unless the user has just given a valid **`onaylıyorum, dd/mm/yyyy hh:mm`** approval with the current date and time!

### 4.1 Discovering the Current Version
Never guess or rely on hardcoded version numbers. Always inspect the live files first:
- `git describe --tags --abbrev=0`
- `iett-pwa/package.json` (`"version"`) & `iett-pwa/public/changelog.json`
- `iett-middle/app/config.py` (`app_version`)
- `iett-hacs/custom_components/iett/manifest.json` (`"version"`)

### 4.2 Tag & Release Format Rules
GitHub Actions Docker build workflows (`docker.yml`) are configured to trigger **ONLY** when the tag and release title start with a lowercase **`v`**:
- **VALID:** `v<major>.<minor>.<patch>` (e.g., `vX.Y.Z` or `vX.Y.Z.W`)
- **INVALID:** `<major>.<minor>.<patch>` without `v`, or release titles prefixed with `"Release v..."` (these will silently fail to trigger the Docker build).

### 4.3 Step-by-Step Release Execution (After Approval)
1. **Merge Approved PR:** Merge the approved PR into `master` (`gh pr merge --merge` or `--squash` as appropriate) and pull `master` locally (`git checkout master && git pull origin master`).
2. **Bump Version Files & Update Changelog:**
   - Update the version strings across the target repository's manifest files (and README version badges if applicable, using native `edit_file`).
   - **`iett-pwa` Changelog Rule:** When bumping version for `iett-pwa`, you MUST prepend the new version release notes into `public/changelog.json` (`version`, `date` in `YYYY-MM-DD`, bilingual titles `title.tr`/`title.en`, bullet items `changes.tr`/`changes.en`, and `url` to GitHub release tag).
3. **Commit & Tag:**
   ```bash
   git add <updated-version-files>
   git commit -m "chore(release): bump version to v<VERSION>"
   git tag v<VERSION>
   git push origin master --tags
   ```
4. **Create GitHub Release:**
   ```bash
   gh release create v<VERSION> -t "v<VERSION>" -n "<Release notes>"
   ```
   *(CRITICAL: The `-t` title argument MUST be literally `"v<VERSION>"` with no extra words.)*
5. **Verify CI Build:** Run `gh run list --limit 5` to confirm the Docker image build (`docker.yml`) and CI workflows triggered and succeeded.
