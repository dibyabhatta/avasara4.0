/*
 * Avasara — app logic.
 * Reads everything from AVASARA (data.js). Sections:
 *   1. Helpers and storage      5. Tracker 2.0
 *   2. Eligibility check        6. Closing soon + ticker
 *   3. Opportunity board        7. Destinations and portals
 *   4. Key details panel        8. Theme, logo centering, start-up
 */
(() => {
  "use strict";

  const { opportunities, universities, tabCountries, portals, timing, rules, details, closingMonths, englishTestCountries } = AVASARA;

  /* ---------- 1. Helpers and storage ---------- */

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);
  const escapeHtml = (text) => String(text ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const storage = {
    read(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    write(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    },
  };

  const LEVELS = { S: "Grade 11–12", B: "Bachelor", M: "Master", P: "PhD" };
  const CITIZENSHIPS = {
    NP: "Nepal", IN: "India", CN: "China", BD: "Bangladesh", PK: "Pakistan", LK: "Sri Lanka",
    DEV: "Australia, NZ, Canada, USA, UK or EU", OTH: "other countries",
  };
  const DOCUMENTS = ["CV", "Statement", "Referees", "Transcripts", "English test"];
  const STATUSES = ["Saved", "Preparing", "Submitted", "Interview", "Won", "Rejected"];
  const CONTACT_EMAIL = "agridibu@gmail.com";
  const MS_PER_DAY = 86400000;

  const daysUntil = (dateString) => {
    const today = new Date().setHours(0, 0, 0, 0);
    return Math.ceil((new Date(dateString) - today) / MS_PER_DAY);
  };

  /* ---------- 2. Eligibility check ---------- */

  const PROFILE_INPUTS = { pn: "citizenship", pl2: "level", pc: "location", pd: "field", pa: "age", pe: "english" };
  const profile = storage.read("avprof", {});

  function loadProfileIntoForm() {
    for (const [id, key] of Object.entries(PROFILE_INPUTS)) {
      if (profile[key] != null) $("#" + id).value = profile[key];
    }
  }

  function saveProfileFromForm() {
    for (const [id, key] of Object.entries(PROFILE_INPUTS)) profile[key] = $("#" + id).value;
    storage.write("avprof", profile);
  }

  /** Returns { status: "yes" | "maybe" | "no" | "none", reason } for one opportunity. */
  function checkEligibility(opp) {
    if (!profile.citizenship || !profile.level) return { status: "none", reason: "" };
    const rule = rules[opp.name] || {};

    if (!opp.levels.includes(profile.level)) return { status: "no", reason: "Not offered at your level" };

    if (rule.citizenships && !rule.citizenships.includes(profile.citizenship)) {
      return profile.citizenship === "OTH"
        ? { status: "maybe", reason: "Check if your country is eligible" }
        : { status: "no", reason: "Not open to your citizenship" };
    }
    if (rule.excludedCitizenships?.includes(profile.citizenship)) return { status: "no", reason: "Not open to your citizenship" };
    if (rule.location && profile.location && profile.location !== rule.location) return { status: "no", reason: "For students currently in Nepal" };

    if (rule.fields && profile.field && profile.field !== "Any" && !rule.fields.includes(profile.field)) {
      return { status: "no", reason: "Only for " + rule.fields.join(", ") };
    }

    const maxAge = typeof rule.maxAge === "object" ? rule.maxAge[profile.level] : rule.maxAge;
    if (maxAge && profile.age && Number(profile.age) > maxAge) return { status: "no", reason: "Age limit about " + maxAge };

    if (englishTestCountries.includes(opp.country) && profile.english !== "yes") {
      return { status: "maybe", reason: "English test usually needed" };
    }
    return Object.keys(rule).length
      ? { status: "yes", reason: "Matches the main rules we hold" }
      : { status: "maybe", reason: "No specific rule recorded; confirm criteria" };
  }

  const BADGE_LABELS = { yes: "✓ Likely eligible", maybe: "? Check criteria", no: "✕ Not eligible" };

  function badgeHtml(opp) {
    const { status, reason } = checkEligibility(opp);
    return status === "none" ? "" : `<span class="badge b-${status}">${BADGE_LABELS[status]}</span><span class="note">${reason}</span>`;
  }

  function updateEligibilitySummary() {
    if (!profile.citizenship || !profile.level) {
      $("#sum").textContent = "Choose your citizenship and level to see matches.";
      return;
    }
    const counts = { yes: 0, maybe: 0, no: 0 };
    opportunities.forEach((opp) => counts[checkEligibility(opp).status]++);
    $("#sum").textContent = `Of ${opportunities.length} listings: ${counts.yes} likely eligible, ${counts.maybe} to check, ${counts.no} not eligible.`;
  }

  /* ---------- 3. Opportunity board ---------- */

  const FILTER_IDS = ["#q", "#ft", "#fl", "#fd", "#ff"];

  function matchesFilters(opp) {
    const query = $("#q").value.toLowerCase();
    const type = $("#ft").value, level = $("#fl").value, country = $("#fd").value, funding = $("#ff").value;
    return (!type || opp.type === type)
      && (!level || opp.levels.includes(level))
      && (!country || opp.country === country)
      && (!funding || opp.funding === funding)
      && (!query || `${opp.name} ${opp.country} ${opp.type}`.toLowerCase().includes(query))
      && !($("#hide").checked && checkEligibility(opp).status === "no");
  }

  function cardHtml(opp) {
    const note = timing[opp.name] ? `<p class="note"><b>Timing:</b> ${timing[opp.name]}</p>` : "";
    return `<div class="card">
      <div class="tags"><span>${opp.type}</span><span>${opp.levels.map((l) => LEVELS[l]).join(" · ")}</span><span>${opp.country}</span><span>${opp.funding}</span></div>
      ${badgeHtml(opp)}
      <h3>${escapeHtml(opp.name)}</h3>
      ${note}
      ${keyDetailsHtml(opp)}
      <div class="row">
        <a class="btn dk" href="${opp.url}" target="_blank" rel="noopener">Official page ↗</a>
        <button class="btn" data-track="${escapeHtml(opp.name)}">＋ Track</button>
      </div>
    </div>`;
  }

  function renderBoard() {
    const results = opportunities.filter(matchesFilters);
    $("#cnt").textContent = results.length + " opportunities";
    $("#grid").innerHTML = results.map(cardHtml).join("");
    updateEligibilitySummary();
  }

  /* ---------- 4. Key details panel (ANU-style) ---------- */

  function eligibilityText(opp) {
    const rule = rules[opp.name] || {};
    const parts = [];
    if (rule.citizenships) parts.push("Citizens of " + rule.citizenships.map((c) => CITIZENSHIPS[c]).join(", "));
    if (rule.excludedCitizenships) parts.push("Not open to " + rule.excludedCitizenships.map((c) => CITIZENSHIPS[c]).join(", ") + " citizens");
    if (rule.location) parts.push("Students currently in Nepal");
    if (rule.fields) parts.push("Fields: " + rule.fields.join(", "));
    if (rule.maxAge) parts.push("Age limit about " + (typeof rule.maxAge === "object" ? Object.values(rule.maxAge).join("/") : rule.maxAge));
    return parts.length ? parts.join(". ") + ". Confirm on the official page." : "See the official page";
  }

  function keyDetailsHtml(opp) {
    const extra = details[opp.name] || {};
    const correction = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Avasara update: " + opp.name)}`;
    const row = (label, value) => `<dt>${label}</dt><dd>${value}</dd>`;
    return `<details class="kd"><summary>Key details</summary><dl>
      ${row("Level", opp.levels.map((l) => LEVELS[l]).join(", "))}
      ${row("Type", opp.type)}
      ${row("Country", opp.country)}
      ${row("Funding", opp.funding)}
      ${row("Application period", extra.when || timing[opp.name] || "Check the official page")}
      ${row("Eligibility", eligibilityText(opp))}
      ${row("How to apply", extra.apply || "Follow the instructions on the official page")}
      ${row("Value", "See the official page")}
      ${row("Update", `<a href="${correction}">Report a correction</a>`)}
    </dl></details>`;
  }

  /* ---------- 5. Tracker 2.0 ---------- */

  let tracked = storage.read("avtrk", []);
  const saveTracked = () => storage.write("avtrk", tracked);

  function trackerRowHtml(item, index) {
    const days = item.deadline ? daysUntil(item.deadline) : null;
    const countdown = days === null ? "" : days < 0 ? "Passed" : `${days} days left`;
    const urgency = days === null || days < 0 ? "" : days <= 14 ? "u-red" : days <= 30 ? "u-amb" : "";
    const ready = Math.round((item.docs.filter(Boolean).length / DOCUMENTS.length) * 100);
    const statusOptions = STATUSES.map((s) => `<option${s === item.status ? " selected" : ""}>${s}</option>`).join("");
    const docBoxes = DOCUMENTS.map((doc, j) => `<label style="display:block"><input type="checkbox" data-i="${index}" data-doc="${j}"${item.docs[j] ? " checked" : ""}> ${doc}</label>`).join("");
    return `<tr>
      <td><b>${escapeHtml(item.name)}</b></td>
      <td><select data-i="${index}" data-field="status">${statusOptions}</select></td>
      <td><input type="date" value="${item.deadline}" data-i="${index}" data-field="deadline"><div class="${urgency}">${countdown}</div></td>
      <td>${docBoxes}</td>
      <td><div class="bar"><i style="width:${ready}%"></i></div>${ready}%</td>
      <td><textarea rows="2" data-i="${index}" data-field="notes">${escapeHtml(item.notes)}</textarea></td>
      <td><button class="btn" data-remove="${index}">✕</button></td>
    </tr>`;
  }

  function renderTracker() {
    $("#tb").innerHTML = tracked.length
      ? tracked.map(trackerRowHtml).join("")
      : `<tr><td colspan="7">Nothing tracked yet — press “＋ Track” on any opportunity.</td></tr>`;
    const urgent = tracked.filter((t) => t.deadline && daysUntil(t.deadline) >= 0 && daysUntil(t.deadline) <= 14).length;
    $("#radar").textContent = tracked.length
      ? `Deadline Radar: ${urgent} deadline${urgent === 1 ? "" : "s"} within 14 days · ${tracked.length} tracked`
      : "";
  }

  function exportTrackerCsv() {
    const rows = tracked.map((t) => [t.name, t.status, t.deadline, `${t.docs.filter(Boolean).length}/${DOCUMENTS.length}`, t.notes]);
    const csv = [["Opportunity", "Status", "Deadline", "Docs done", "Notes"], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    link.download = "avasara-tracker.csv";
    link.click();
  }

  /* ---------- 6. Closing soon + ticker ---------- */

  const isOpenThisMonth = ([start, end], month) => (start <= end ? month >= start && month <= end : month >= start || month <= end);

  function updateClosingSoon() {
    const month = new Date().getMonth() + 1;
    const mine = tracked
      .map((item) => ({ item, days: item.deadline ? daysUntil(item.deadline) : null }))
      .filter(({ days }) => days !== null && days >= 0 && days <= 30)
      .sort((a, b) => a.days - b.days);
    const openNow = opportunities.filter((opp) => closingMonths[opp.name] && isOpenThisMonth(closingMonths[opp.name], month) && checkEligibility(opp).status !== "no");

    $("#soonmine").innerHTML = mine.length
      ? `<h3 style="font-size:22px;margin:0 0 12px">Your deadlines (next 30 days)</h3><div class="grid" style="margin-bottom:34px">${mine.map(({ item, days }) => `
          <div class="card"><span class="badge ${days <= 14 ? "b-no" : "b-maybe"}">${days} day${days === 1 ? "" : "s"} left</span>
          <h3>${escapeHtml(item.name)}</h3><p class="note">Status: ${item.status}</p>
          <div class="row"><a class="btn dk" href="#tracker">Open tracker</a></div></div>`).join("")}</div>`
      : `<p class="note">Add your own deadlines in Tracker 2.0 and the ones closing within 30 days appear here.</p>`;

    $("#soongrid").innerHTML = openNow.length
      ? openNow.map((opp) => `<div class="card">${badgeHtml(opp)}<div class="tags"><span>${opp.type}</span><span>${opp.country}</span></div>
          <h3>${escapeHtml(opp.name)}</h3><p class="note"><b>Timing:</b> ${timing[opp.name] || ""}</p>
          <div class="row"><a class="btn dk" href="${opp.url}" target="_blank" rel="noopener">Official page ↗</a></div></div>`).join("")
      : `<p class="note">Nothing is typically open this month. Browse the full board below.</p>`;

    updateTicker(openNow, mine);
  }

  function updateTicker(openNow, mine) {
    const messages = [
      ...mine.map(({ item, days }) => `Your deadline: ${item.name} in ${days} day${days === 1 ? "" : "s"}`),
      ...openNow.map((opp) => `${opp.name} (typically open now)`),
    ];
    if (!messages.length) messages.push("Browse scholarships, internships and summer schools worldwide");
    const html = messages.map((m) => `<span>${escapeHtml(m)}</span>`).join("");
    const track = $("#tickmove");
    track.innerHTML = html + html; // doubled so the loop is seamless
    track.style.animationDuration = Math.max(30, messages.join("").length / 5) + "s";
  }

  /* ---------- 7. Destinations and portals ---------- */

  const linksHtml = (list) => list.map((u) => `<a href="${u.url}" target="_blank" rel="noopener">${u.name} ↗</a>`).join("");

  function showDestination(tab) {
    $("#ul").innerHTML = linksHtml(universities[tab]);
    $("#dl").innerHTML = (tabCountries[tab] || []).map((c) => `<button class="btn" data-country="${c}">${c} scholarships ↗</button>`).join("");
  }

  function setupDestinations() {
    const tabs = Object.keys(universities);
    $("#tabs").innerHTML = tabs.map((t, i) => `<button class="btn${i ? "" : " on"}" data-tab="${t}">${t}</button>`).join("");
    showDestination(tabs[0]);
    $("#pl").innerHTML = linksHtml(portals);

    $("#tabs").addEventListener("click", (e) => {
      const tab = e.target.dataset.tab;
      if (!tab) return;
      $$("#tabs button").forEach((b) => b.classList.toggle("on", b === e.target));
      showDestination(tab);
    });
    $("#dl").addEventListener("click", (e) => {
      const country = e.target.dataset.country;
      if (!country) return;
      $("#fd").value = country;
      renderBoard();
      location.hash = "#board";
    });
  }

  /* ---------- 8. Theme, logo centering, start-up ---------- */

  /** Light is the default. A visitor's choice is remembered in their browser. */
  function applySavedTheme() {
    const saved = storage.read("avtheme", "light");
    document.documentElement.dataset.theme = saved === "dark" ? "dark" : "light";
  }

  function toggleTheme() {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    storage.write("avtheme", root.dataset.theme);
  }

  /** Devanagari glyphs sit off-centre in their text box; measure the ink and nudge it to the middle. */
  function centerLogoGlyphs() {
    const ctx = document.createElement("canvas").getContext("2d");
    $$(".mark, .big").forEach((el) => {
      const text = el.textContent, style = getComputedStyle(el);
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const m = ctx.measureText(text);
      const dx = m.width / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
      const dy = (m.fontBoundingBoxDescent - m.fontBoundingBoxAscent) / 2 - (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
      if (isFinite(dx) && isFinite(dy)) el.innerHTML = `<span style="position:relative;left:${dx}px;top:${dy}px">${text}</span>`;
    });
  }

  function populateCountryFilter() {
    [...new Set(opportunities.map((o) => o.country))].sort()
      .forEach((c) => $("#fd").insertAdjacentHTML("beforeend", `<option>${c}</option>`));
  }

  function bindEvents() {
    FILTER_IDS.forEach((id) => $(id).addEventListener("input", renderBoard));
    $("#clr").onclick = () => { FILTER_IDS.forEach((id) => ($(id).value = "")); renderBoard(); };

    $$("#pf input, #pf select").forEach((el) => el.addEventListener("input", () => { saveProfileFromForm(); renderBoard(); updateClosingSoon(); }));

    $("#grid").addEventListener("click", (e) => {
      const name = e.target.dataset.track;
      if (!name) return;
      if (!tracked.some((t) => t.name === name)) {
        tracked.push({ name, status: "Saved", deadline: "", docs: DOCUMENTS.map(() => 0), notes: "" });
        saveTracked();
        renderTracker();
        updateClosingSoon();
      }
      e.target.textContent = "✓ Tracked";
      location.hash = "#tracker";
    });

    $("#tb").addEventListener("change", (e) => {
      const { i, field, doc } = e.target.dataset;
      const item = tracked[i];
      if (!item) return;
      if (doc !== undefined) item.docs[doc] = e.target.checked ? 1 : 0;
      else item[field] = e.target.value;
      saveTracked();
      if (field !== "notes") renderTracker();
      updateClosingSoon();
    });
    $("#tb").addEventListener("click", (e) => {
      if (e.target.dataset.remove === undefined) return;
      tracked.splice(e.target.dataset.remove, 1);
      saveTracked();
      renderTracker();
      updateClosingSoon();
    });
    $("#exp").onclick = exportTrackerCsv;
    $("#th").onclick = toggleTheme;
  }

  /* ---------- Tabs: show one section at a time ---------- */

  const VIEWS = ["home", "scholarships", "destinations", "tracker", "toolkit", "academy", "about"];
  const VIEW_OF = { soon: "home", match: "scholarships", board: "scholarships", unis: "destinations", portals: "destinations" };

  /** Reads the URL hash (for example #tracker) and shows only that tab. */
  function route() {
    const id = location.hash.slice(1);
    const view = VIEWS.includes(id) ? id : VIEW_OF[id] || "home";
    $$("[data-view]").forEach((el) => { el.hidden = !el.dataset.view.split(" ").includes(view); });
    $$("nav a").forEach((link) => link.classList.toggle("on", link.getAttribute("href") === "#" + view));
    const target = id && !VIEWS.includes(id) ? document.getElementById(id) : null;
    if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
  }

  function start() {
    applySavedTheme();
    $("#n1").textContent = opportunities.length;
    populateCountryFilter();
    loadProfileIntoForm();
    setupDestinations();
    bindEvents();
    renderBoard();
    renderTracker();
    updateClosingSoon();
    window.addEventListener("hashchange", route);
    route();
    document.fonts.load("700 28px 'Poppins'").then(() => document.fonts.ready).then(centerLogoGlyphs).catch(() => {});
  }

  start();
})();
