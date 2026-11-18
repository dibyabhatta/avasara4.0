/**
 * Avasara — publish approved community submissions to GitHub.
 *
 * Flow: Google Form -> this Sheet -> you set Review Status to "Approved" ->
 *       Avasara menu > "Publish approved to website" -> community.json on GitHub -> Community tab.
 *
 * The GitHub token is NEVER written in this file. Store it in
 * Project Settings > Script properties as GITHUB_TOKEN (see SETUP.md).
 * Names and emails from the form are never published.
 */

const CONFIG = {
  OWNER: "dibyabhatta",
  REPO: "avasara4.0",
  BRANCH: "main",
  FILE_PATH: "community.json",
  SHEET_NAME: "Form_Responses", // the tab that receives the form answers

  // Column headers exactly as they appear in row 1 of your sheet.
  HEADERS: {
    name: "Opportunity title",
    type: "Opportunity category",
    country: "Country / Destination",
    levels: "Eligible degree levels",
    field: "Field of study",
    url: "Official opportunity website URL",
    deadline: "Application deadline (if known)",
    funding: "Funding type",
    eligibility: "Eligibility criteria",
    description: "Opportunity description",
    status: "Review Status", // dropdown: Pending / Approved / Rejected
    published: "Published",  // filled in by the script
    id: "Publication ID",    // filled in by the script
  },
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Avasara")
    .addItem("Publish approved to website", "publishApproved")
    .addItem("Test GitHub connection", "testConnection")
    .addToUi();
}

/** Rebuilds community.json from every row marked Approved and commits it to GitHub. */
function publishApproved() {
  const ui = SpreadsheetApp.getUi();
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) throw new Error('Tab "' + CONFIG.SHEET_NAME + '" not found. Check SHEET_NAME.');

    const rows = sheet.getDataRange().getValues();
    const col = columnIndexes_(rows[0]);
    const items = [];
    const seen = {};
    const problems = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const statusCell = sheet.getRange(r + 1, col.status + 1);
      if (String(row[col.status]).trim().toLowerCase() !== "approved") { statusCell.setNote(""); continue; }

      const result = cleanRow_(row, col);
      if (result.error) {
        statusCell.setNote("Needs fix: " + result.error);
        problems.push("Row " + (r + 1) + ": " + result.error);
        continue;
      }
      statusCell.setNote("");
      if (seen[result.item.url]) { problems.push("Row " + (r + 1) + ": same link as an earlier row, skipped"); continue; }
      seen[result.item.url] = true;

      // Give every published row a stable ID and a publish date.
      let id = String(row[col.id]).trim();
      if (!id) { id = "AV-" + Utilities.getUuid().slice(0, 8).toUpperCase(); sheet.getRange(r + 1, col.id + 1).setValue(id); }
      if (!row[col.published]) sheet.getRange(r + 1, col.published + 1).setValue(new Date());
      result.item.id = id;
      items.push(result.item);
    }

    const changed = putFile_(JSON.stringify(items, null, 2) + "\n", items.length);
    ui.alert(
      (changed ? "Published " + items.length + " opportunities. The site updates in a minute or two."
               : "No changes: community.json already matches the approved rows.") +
      (problems.length ? "\n\nPlease check:\n" + problems.join("\n") : "")
    );
  } catch (err) {
    ui.alert("Could not publish: " + err.message);
  }
}

/** Checks the token and repository access without changing anything. */
function testConnection() {
  const ui = SpreadsheetApp.getUi();
  try {
    const token = getToken_();
    const res = UrlFetchApp.fetch("https://api.github.com/repos/" + CONFIG.OWNER + "/" + CONFIG.REPO, {
      headers: githubHeaders_(token), muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    if (code === 200) ui.alert("Connected to " + CONFIG.OWNER + "/" + CONFIG.REPO + ".");
    else if (code === 401) ui.alert("GitHub rejected the token (401). It may be wrong or expired.");
    else if (code === 404) ui.alert("Repository not found (404). Check OWNER and REPO, and that the token can access that repository.");
    else ui.alert("GitHub returned " + code + ".");
  } catch (err) {
    ui.alert("Test failed: " + err.message);
  }
}

/* ---------- cleaning and validation ---------- */

function columnIndexes_(headerRow) {
  const headers = headerRow.map(function (h) { return String(h).trim(); });
  const col = {};
  Object.keys(CONFIG.HEADERS).forEach(function (key) {
    const i = headers.indexOf(CONFIG.HEADERS[key]);
    if (i < 0) throw new Error('Column "' + CONFIG.HEADERS[key] + '" not found in row 1. Fix CONFIG.HEADERS or the sheet.');
    col[key] = i;
  });
  return col;
}

function plain_(value, max) {
  return String(value == null ? "" : value).replace(/&/g, "and").replace(/[<>"'`]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function levelCodes_(text) {
  const t = String(text).toLowerCase().replace(/[’'`]/g, "");
  const codes = [];
  if (/grade 11|grade 12|high school|school|\+2/.test(t)) codes.push("S");
  if (/bachelor|undergrad/.test(t)) codes.push("B");
  if (/master|postgrad/.test(t)) codes.push("M");
  if (/phd|doctor/.test(t)) codes.push("P");
  return codes;
}

function typeOf_(text) {
  const t = String(text).toLowerCase();
  if (/intern/.test(t)) return "Internship";
  if (/summer|winter school|short course/.test(t)) return "Summer school";
  if (/research|phd position|studentship|assistantship|lab/.test(t)) return "Research";
  return "Scholarship"; // scholarships, fellowships, grants and anything else
}

function fundingOf_(text) {
  const t = String(text).toLowerCase();
  if (/full/.test(t)) return "Fully funded";
  if (/partial|tuition|waiver/.test(t)) return "Partial";
  if (/paid|stipend|salary/.test(t)) return "Paid";
  return "Varies";
}

function deadlineOf_(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "";
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function cleanUrl_(value) {
  let url = String(value).trim();
  if (!url) return "";
  if (/^http:\/\//i.test(url)) url = "https://" + url.slice(7);
  if (!/^https:\/\//i.test(url)) url = "https://" + url.replace(/^\/+/, "");
  return /^https:\/\/[^\s<>"'`]{4,300}$/.test(url) && url.indexOf(".") > 8 ? url : "";
}

function cleanRow_(row, col) {
  const name = plain_(row[col.name], 120);
  const country = plain_(row[col.country], 60);
  const url = cleanUrl_(row[col.url]);
  const levels = levelCodes_(row[col.levels]);
  if (!name) return { error: "missing title" };
  if (!country) return { error: "missing country" };
  if (!url) return { error: "the website link is not valid" };
  if (!levels.length) return { error: "no recognised degree level" };
  return {
    item: {
      name: name,
      type: typeOf_(row[col.type]),
      levels: levels,
      country: country,
      funding: fundingOf_(row[col.funding]),
      field: plain_(row[col.field], 60),
      deadline: deadlineOf_(row[col.deadline]),
      eligibility: plain_(row[col.eligibility], 300),
      description: plain_(row[col.description], 400),
      url: url,
    },
  };
}

/* ---------- GitHub ---------- */

function getToken_() {
  const token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!token) throw new Error("GITHUB_TOKEN is not set. Add it under Project Settings > Script properties.");
  return token;
}

function githubHeaders_(token) {
  return { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
}

function putFile_(content, count) {
  const token = getToken_();
  const headers = githubHeaders_(token);
  const url = "https://api.github.com/repos/" + CONFIG.OWNER + "/" + CONFIG.REPO + "/contents/" + CONFIG.FILE_PATH;

  const current = UrlFetchApp.fetch(url + "?ref=" + CONFIG.BRANCH, { headers: headers, muteHttpExceptions: true });
  let sha;
  if (current.getResponseCode() === 200) {
    const file = JSON.parse(current.getContentText());
    sha = file.sha;
    const existing = Utilities.newBlob(Utilities.base64Decode(file.content.replace(/\n/g, ""))).getDataAsString();
    if (existing.trim() === content.trim()) return false; // nothing to update
  } else if (current.getResponseCode() !== 404) {
    throw new Error("GitHub returned " + current.getResponseCode() + " while reading the file. Check the token's access.");
  }

  const body = {
    message: "Update community opportunities (" + count + " approved)",
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch: CONFIG.BRANCH,
  };
  if (sha) body.sha = sha;

  const saved = UrlFetchApp.fetch(url, {
    method: "put", headers: headers, contentType: "application/json",
    payload: JSON.stringify(body), muteHttpExceptions: true,
  });
  if (saved.getResponseCode() !== 200 && saved.getResponseCode() !== 201) {
    throw new Error("GitHub returned " + saved.getResponseCode() + " while saving. Check the token's permissions.");
  }
  return true;
}
