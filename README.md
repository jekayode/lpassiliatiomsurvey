# LifePointe Assimilation Survey

A guided-conversation survey + auto-built presentation for the Assimilation breakout at the LifePointe leaders retreat. Members walk through a **diagnosis → imagination → prioritisation → action** conversation on their phones; their input lands in a Google Sheet; the presenter curates it into a branded 8-slide deck.

**Live pages (GitHub Pages):**

| Page | URL | Use |
|---|---|---|
| Splash / QR | `https://jekayode.github.io/lpassiliatiomsurvey/splash.html` | Show on the LED/projector first — members scan to join |
| Form | `https://jekayode.github.io/lpassiliatiomsurvey/` | The guided survey members fill on their phones |
| Presentation | `https://jekayode.github.io/lpassiliatiomsurvey/present.html` | Presenter setup + Back/Next deck |

## Architecture

```
Member's phone ──► index.html (static, GitHub Pages)
                      │  fetch POST (JSON)
                      ▼
              Google Apps Script /exec  ──►  Google Sheet ("Responses" tab)
                      ▲
                      │  fetch GET (JSON)
Projector ──► present.html (static, GitHub Pages)
```

`config.js` is the single connection point between the static pages and the Google Sheet backend.

## One-time setup (~5 minutes)

1. **Create the Sheet.** Go to [sheets.new](https://sheets.new), name it e.g. *Assimilation Survey*.
2. **Add the backend.** In the Sheet: **Extensions → Apps Script**. Delete the starter code and paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs). Save.
3. **Deploy.** **Deploy → New deployment** → gear → **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone** ← lets members submit without a Google login
   Click **Deploy**, authorize (choose **Advanced → Go to … (unsafe)** on the unverified-app screen — it's your own script), and copy the **Web app URL** (ends in `/exec`).
4. **Connect the site.** Open [`config.js`](config.js) and paste that URL into `SCRIPT_URL`. Commit and push (or edit the file directly on GitHub — Pages redeploys automatically).

Until `SCRIPT_URL` is set, the pages run in **preview mode**: the form simulates sending and the presentation shows sample data, so you can rehearse safely.

### Smoke test (do this once)
1. Open the form, add one idea, send it → a row appears in the Sheet's **Responses** tab.
2. Open the presentation, click **Refresh** → your test idea shows. Delete the test row afterwards.

## At the retreat

1. Put **splash.html** full-screen on the LED — it shows a QR code to the form.
2. Members scan and walk through the guided questions (everything optional; Back/Next).
3. During prioritisation, open **present.html**: click **Refresh** to pull the latest submissions, tick the best ~3 per section, pick/edit the vision sentence and the one big idea.
4. Click **Start presentation** — navigate with the on-screen arrows, keyboard **← →**, or the dots. **Esc** exits.

## Good to know

- **Updating the backend later:** edit the script, then **Deploy → Manage deployments → ✏️ → New version → Deploy**. The `/exec` URL stays the same.
- **Reusing a Sheet from an older version:** the schema includes a **Why** column — delete/clear the old *Responses* tab and it rebuilds with correct headers on the next submission.
- **If your Workspace blocks "Anyone":** set access to **"Anyone with a Google account"**; members then just need to be signed into any Google account.
- **QR target:** the QR encodes `FORM_URL` from `config.js` — update it if you ever move the site or add a custom domain.
- All data lives in **your** Google Sheet; the static site stores nothing.

## Repo layout

```
index.html          Guided survey (the form members fill)
present.html        Presenter setup + slide deck
splash.html         Full-screen QR splash for the projector
config.js           SCRIPT_URL (Apps Script /exec) + FORM_URL (QR target)
qrcode.min.js       QR generator (qrcode-generator, MIT — vendored)
apps-script/Code.gs Backend: paste into Apps Script bound to your Sheet
```
