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
- **Email:** submissions and "Report a correction" go to the email. Change it in `index.html` (Share button) and `CONTACT_EMAIL` in `app.js`.
- **Support links:** Buy Me a Coffee links are in `index.html` (About section and footer).

## Notes
- Visitors' tracker items, eligibility answers and CV details are saved only in their own browser.
- Timing notes and closing months are typical windows, not official dates. Always confirm on the official page.
- Fonts load from Google Fonts; the site still works without them.
