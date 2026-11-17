# Community submissions: setup

Flow: Google Form -> Google Sheet -> you approve -> Apps Script -> `community.json` on GitHub -> Community tab on Avasara.

## 1. The sheet
`Code.gs` is written for these headers in row 1 of the `Form_Responses` tab:
Opportunity title, Opportunity category, Country / Destination, Eligible degree levels, Field of study,
Official opportunity website URL, Application deadline (if known), Funding type, Eligibility criteria,
Opportunity description, Review Status, Published, Publication ID.
If any header or the tab name differs, change it in `CONFIG` at the top of `Code.gs`.

- **Review Status** is a dropdown with `Pending`, `Approved`, `Rejected`. Only `Approved` rows are published.
- **Published** and **Publication ID** are filled in by the script. Leave them empty.
- Names and emails are never published.
- Fix typos in the sheet before approving (for example the country). The website shows what is in the sheet.
- If you later change a row from Approved to Rejected and publish again, it is removed from the site.

## 2. The GitHub token (keep it secret)
1. GitHub > Settings > Developer settings > Personal access tokens > **Fine-grained tokens** > Generate new token.
2. Repository access: **Only select repositories** > `avasara3.0`.
3. Permissions: **Contents: Read and write**. Nothing else.
4. Set an expiry (for example 90 days) and note the renewal date.
5. Copy the token once. Never paste it into the sheet, the form, the website, the repository or a chat.

## 3. The script
1. In the sheet: Extensions > Apps Script. Replace all the code with `Code.gs`. Save.
2. Project Settings (gear icon) > Script properties > Add property: name `GITHUB_TOKEN`, value = your token.
3. Reload the sheet. An **Avasara** menu appears. Run **Test GitHub connection** and approve the permission prompts.
4. Make sure `community.json` (containing `[]`) is in the repository root, next to `index.html`.

## 4. The website
- Replace your site's `index.html` with the new one. It adds a **Community** tab.
- Near the top of the script in `index.html` (or `assets/js/app.js`), find `SUBMIT_FORM_URL = ""` and put your Google Form link between the quotes. Every "Submit an opportunity" button then opens your form.

## 5. Each time
1. Read the new row. Open the link and confirm it is the organisation's official page. Fix any typos.
2. Set Review Status to **Approved** (or Rejected).
3. Avasara > **Publish approved to website**. The Community tab updates in a minute or two.
Rows with a problem get a note on the Review Status cell and are listed in the alert.

## Safety
- Keep the sheet private: share it with no one, and never use "anyone with the link".
- If the token is ever exposed, delete it on GitHub straight away and make a new one.
- Only Approved rows are published, and the site cleans every field again before showing it.
