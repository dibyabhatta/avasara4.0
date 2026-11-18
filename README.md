# Avasara — Find your opportunity

Scholarships, summer schools, internships and research programs for Bachelor, Master and PhD students worldwide, each linked to its official source. It includes an eligibility check, Tracker 2.0, a "Closing soon" bar, a destination explorer, and a destination-aware CV builder with cold email templates.

The site is organised in tabs (Home, Scholarships, Destinations, Tracker 2.0, Toolkit, Academy, About); only one shows at a time.

Plain HTML, CSS and JavaScript. No build step, no dependencies, no server. Works by opening `index.html`.

## Put it online with GitHub Pages
1. Create a new repository on GitHub (for example `avasara`).
2. Upload the contents of this folder (including `assets` and `.nojekyll`) to the repository root.
3. Go to **Settings → Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then Save.
4. After a minute the site is live at `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

## Files
| File | What it does |
|---|---|
| `index.html` | Page structure and text (About, headings, links) |
| `assets/css/style.css` | Design, colours (`:root` variables) and dark mode |
| `assets/js/data.js` | **All content: listings, universities, timing, rules. This is the file you edit.** |
| `assets/js/app.js` | Board, eligibility check, Tracker 2.0, Closing soon bar, destinations |
| `assets/js/toolkit.js` | CV builder (formats per destination) and cold email templates |

## Add an opportunity
Open `assets/js/data.js` and add one line to `opportunities`:

    {"name":"Example Scholarship","type":"Scholarship","levels":["M","P"],"country":"Germany","funding":"Fully funded","url":"https://example.org"},

- `type`: `Scholarship`, `Research`, `Internship` or `Summer school`
- `levels`: `S` (Grade 11–12), `B` (Bachelor), `M` (Master), `P` (PhD)
- `funding`: `Fully funded`, `Partial`, `Paid` or `Varies`
- Always use the official link, and check it before publishing.

Optional, using the exact listing name as the key:
- `timing`: a note shown on the card ("Typically closes Oct").
- `rules`: eligibility rules (`citizenships`, `excludedCitizenships`, `fields`, `location`, `maxAge`).
- `details`: extra text for the "Key details" panel (`apply`, `when`).
- `closingMonths`: `[startMonth, endMonth]` so it appears in "Closing soon" during those months.

Commit the change on GitHub and the live site updates in about a minute. Be careful with commas: every entry except the last in a list needs one.

## Settings to know
- **Email:** submissions and "Report a correction" go to my email. Change it in `index.html` (Share button) and `CONTACT_EMAIL` in `app.js`.
- **Support links:** Buy Me a Coffee links are in `index.html` (About section and footer).

## Notes
- Visitors' tracker items, eligibility answers and CV details are saved only in their own browser.
- Timing notes and closing months are typical windows, not official dates. Always confirm on the official page.
- Fonts load from Google Fonts; the site still works without them.

## Community submissions
Students submit opportunities through a Google Form. You approve them in the linked Google Sheet, and an Apps Script writes the approved ones to `community.json`, which the site reads. See `apps-script/Code.gs` and `apps-script/SETUP.md`. `community.json` must stay in the repository root next to `index.html`. It needs a web server to load, so it works on GitHub Pages but not when you open `index.html` straight from your computer.

## AVASARA 4.0 — launch polish update

This build keeps the original one-page design and adds/fixes:
- Hash-based navigation for About, Scholarships, Tracker, Toolkit and other tabs (no missing `.html` pages).
- Global header search and expanded subject filter.
- Postdoctoral opportunities from official fellowship providers.
- Share buttons on opportunity cards (native share sheet where supported; clipboard fallback).
- CV Studio: print/save PDF, Word-compatible editable `.doc` export, and Europass link.
- Candid with Candidates video link in About.
- Restored closing-soon ticker and smaller heading scale.


## Publish with GitHub Pages
1. Upload/replace the repository files from this ZIP.
2. Keep `index.html`, `style.css`, `data.js`, `app.js`, `toolkit.js`, `community.json`, and the founder image together in the repository root.
3. In GitHub, open **Settings → Pages** and confirm deployment from the main branch/root folder.
4. Open the published URL and test the nav tabs, search, opportunity share, tracker, Toolkit exports, and About.


## Notes
The main site currently contains its own inline data and application scripts. `app.js` and `data.js` are retained as companion/reference files from the original project. Opportunity deadlines and typical opening windows must be verified on the official provider pages.

## Global opportunity automation (new)

This release adds an **operational, conservative GitHub Actions discovery and review pipeline**. It runs twice daily and on demand via **Actions → AVASARA opportunity discovery and review queue → Run workflow**. It reads `automation/sources/registry.json` and reviewed JSON files in `automation/inbox/`, deduplicates by official URL, archives records with past published deadlines, and writes `automated-opportunities.json`, `automation/review-queue.json`, and `automation/import-status.json`. The website loads reviewed entries alongside the existing curated data and displays a searchable directory of official university, government, and research job portals.

**Important launch distinction:** All 15 initial official portal sources are `link_only` until a permitted machine-readable feed or API has been confirmed. Therefore the scheduled job is functional but does not yet ingest vacancies from WUR, ANU, CSIRO, etc. automatically. Do not interpret the portal directory as individual job listings. To activate a verified supported source, see `automation/sources/README.md` (RSS/Atom or Greenhouse public job-board API). Newly discovered feed items go to the review queue, not directly onto the public site. The source registry can be expanded to any country or institution.

To publish a reviewed record, add a JSON array in `automation/inbox/my-reviewed-opportunities.json` with each item's `name`, `country`, `type`, `levels`, `funding`, official HTTPS `url`, `reviewed: true`, and `officialSourceConfirmed: true`. Optionally include `majors`, `discoverySubjects`, `deadline` (YYYY-MM-DD), `verifiedOn`, `fundingSource`, `institution`, and `majorEligibilityStatus`. Run the workflow. This explicit human gate prevents unsupported subjects, invented deadlines and misleading funding claims. For example:

```json
[{"name":"Example verified award","country":"Australia","type":"Scholarship","levels":["P"],"funding":"Varies","url":"https://example.edu/scholarship/award","majors":["All eligible majors"],"majorEligibilityStatus":"verified","reviewed":true,"officialSourceConfirmed":true}]
```

This example is documentation only, not an actual scholarship. **Never mark `reviewed` or `officialSourceConfirmed` true without checking the official individual posting and eligibility.**

On GitHub, Actions must be enabled and workflow permissions must allow **Read and write** access (`Settings → Actions → General → Workflow permissions`). Branch protection may require a pull-request-based commit workflow instead. GitHub Pages should deploy from `main` root. Local `file://` opening still shows the existing curated database, but browser fetches of automation JSON require GitHub Pages or a local HTTP server.

No private credentials are embedded in the website. Social submissions remain manual and moderated. Existing tracker records remain in each visitor's local browser.

## CV and résumé studio

Open **Toolkit → CV builder** and choose one of six visual styles (Academic Research, Australian Professional, US Résumé, UK Graduate, European Minimal, Scholarship Student). Enter information in the existing CV form to update the live preview; use **Print / Save PDF** to export. No Word download or account is required. Information is stored in the visitor's browser; the selected style is also saved locally. Follow each programme's prescribed format when required. Existing Word template files remain in the repository as legacy resources but are no longer required by the CV studio.

## Acknowledgements

AVASARA is an independent project created and maintained by Dibya Bhatta. The original website design was developed with the assistance of **Claude (Anthropic)**. Subsequent development, feature enhancements, and technical improvements have been supported by **ChatGPT (OpenAI)**. Both AI tools were used under the direction of the project creator. AVASARA is not affiliated with or endorsed by OpenAI or Anthropic.
