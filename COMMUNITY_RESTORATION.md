# AVASARA Community restoration (v8.2)

- Removed the homepage Facebook/LinkedIn/Bluesky email-composition form.
- Added a Community tab (`#community`) showing approved listings from `community.json`.
- Kept the existing Google Form submission button and moderation flow.
- Community entries also continue to appear in the main scholarship board after loading.
- Corrected the Apps Script `Code.gs` repository target from `avasara3.0` to `avasara4.0`.

## Important setup

`community.json` currently contains `[]`, so the Community tab initially shows an empty state. This does **not** mean submissions have been deleted; it means no approved rows have been published to the JSON file in this ZIP.

To publish: verify `Code.gs` OWNER/REPO/BRANCH; connect the Google Form to the response spreadsheet, set the appropriate rows to `Approved`, then use the Apps Script **Avasara → Publish approved to website** menu. The Google Apps Script needs a GitHub token in Script Properties (`GITHUB_TOKEN`) with appropriate repository write permission; do not put tokens in the website.

If deploying the website from a test branch, change `CONFIG.BRANCH` in Apps Script to the branch you intend to publish into. For the live website, use the Pages source branch (typically `main`). Never publish test submissions to production unintentionally.

The site is static and cannot accept moderated public submissions directly without the configured Google Form/Apps Script workflow.
