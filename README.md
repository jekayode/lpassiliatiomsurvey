# LifePointe Breakout Survey — multi-team

A guided-conversation survey + AI-assisted presentation for the leadership-retreat breakouts. Everyone scans **one QR**, chooses their **team** (Assimilation, Missions, Discipleship, Life Groups), and walks a **diagnosis → imagination → prioritisation → action** conversation on their phone. Each team's input lands in its **own tab** of one Google Sheet. Each team lead opens their **own deck**, lets **Gemini draft the slides** from the live submissions, edits, and presents.

**Live pages:**

| Page | URL | Use |
|---|---|---|
| Splash / QR | `…/splash.html` | Show on the LED first — everyone scans |
| Form (chooser) | `…/` | Choose a group → guided survey |
| Presentation index | `…/present.html` | Media: pick a team to present · plus team-lead prepare links |
| Prepare (team lead) | `…/present.html?team=<id>` | Lead builds, AI-drafts, edits, and **finalizes** the deck |
| Present (media) | `…/present.html?team=<id>&show=1` | Media plays the **finalized** deck, read-only |

Team ids: `assimilation`, `missions`, `discipleship`, `lifegroups`.

## Architecture

```
Phone ─► index.html (choose team) ─POST {team,…}─► Apps Script ─► Sheet tab  Responses_<team>
Projector ─► present.html?team=X ─GET responses/summarize&team=X─► Apps Script ─► Gemini + Sheet
```

- `config.js` — `SCRIPT_URL` (Apps Script `/exec`) + `FORM_URL` (QR target).
- `teams.js` — **per-team wording** (objective + a few re-worded questions + journey stages + what-if prompts). Edit this to finalize each team.

## Setup (once)

1. **Backend:** in your Google Sheet → **Extensions → Apps Script** → paste [`apps-script/Code.gs`](apps-script/Code.gs).
2. **Gemini key (for AI slides):** get a free key at <https://aistudio.google.com/apikey>. In Apps Script → **Project Settings → Script properties** → add `GEMINI_API_KEY = <your key>`. (Submissions and reads work without it; only the AI summaries need it. Run **Breakouts → Check Gemini key** to confirm.)
3. **Deploy:** **Deploy → New deployment → Web app** (Execute as **Me**, access **Anyone**). Copy the `/exec` URL into [`config.js`](config.js) → `SCRIPT_URL`.
   - Updating later: **Deploy → Manage deployments → New version** — the URL stays the same.
4. **Finalize wording:** edit [`teams.js`](teams.js) — set each team's objective, the re-worded questions, journey stages, and what-if prompts (Missions is a placeholder; Discipleship & Life Groups inherit base wording until you edit them). Commit + push.

Each team's tab (`Responses_<team>`) is created automatically on first submission.

### Smoke test
Choose a group → submit one idea → a row appears in that team's tab. Open `present.html?team=<that team>` → **Generate with AI** → a drafted deck appears → **Start presentation**.

## On the day

Finalizing and presenting are **separate**, so a lead can prepare on their own phone and the media team presents on the projector — the two devices are not linked.

1. **splash.html** on the LED → everyone scans, **chooses their group**, fills the guided survey.
2. **Each team lead** (on their own device) opens their **prepare link** `present.html?team=<id>` — get these from the *Team-lead prepare links* panel on `present.html`. They:
   - **Refresh** to pull submissions, then **Generate with AI** (Gemini drafts problem / vision / quick wins / 90-day / long-term / big idea into editable fields) — or curate manually by ticking ~3 per section;
   - edit anything, **Preview slides** to check, then **Finalize & save**. That stores the deck (in the `Finals` tab).
3. **The media team** opens `present.html` on the projector, clicks a team (→ `?team=<id>&show=1`), and hits **Present slides**. It plays the **finalized** deck read-only — arrows, keyboard **← →**, or dots; **Esc** exits. A lead editing later doesn't change a running show until the media hits **Refresh**.

## Good to know

- **Summaries in the Sheet:** menu **Breakouts → Rebuild all summaries** creates a readable `Summary_<team>` tab per team, grouped by section.
- **Concurrency:** submissions are lock-guarded, so simultaneous senders never overwrite each other.
- **AI cost/caching:** Gemini results are cached ~15 min per team; the flash model on the free tier is ample for a retreat. Add `&fresh=1` to a summarize call to bypass the cache.
- **"Anyone" blocked by Workspace:** set access to **"Anyone with a Google account"** instead.
- **Finalized decks** are saved (one row per team) in the `Finals` tab — that's the snapshot the media presents. Re-finalizing overwrites it.
- All data lives in **your** Google Sheet; the static site stores nothing.

## Repo layout

```
index.html          Team chooser + guided survey
present.html        Presentation index + per-team deck + AI draft
splash.html         Full-screen QR splash for the projector
teams.js            Per-team wording (EDIT to finalize each team)
config.js           SCRIPT_URL + FORM_URL
qrcode.min.js       QR generator (MIT, vendored)
apps-script/Code.gs Backend: team tabs, counts, Gemini summarize, summary tabs
```
