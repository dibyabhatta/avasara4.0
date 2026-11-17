/*
 * Application toolkit: destination-aware CV builder and cold email templates.
 * Edit the CV object (formats per destination) and DP object (email paragraph per country).
 * Everything runs in the browser; details are saved only in localStorage.
 */
(function () {
    const $ = s => document.querySelector(s), esc = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const ls = t => (t || "").split("\n").map(x => x.trim()).filter(Boolean);
    const CV = { "Academic CV (default)": { ph: 0, pd: 0, pg: "2–4 pages", t: "Lead with education and research. Add publications, thesis and supervisors." },
        "USA": { ph: 0, pd: 0, pg: "1-page resume for internships and bachelor’s; a longer academic CV for PhD", t: "Do not include a photo, age, nationality or marital status." },
        "UK": { ph: 0, pd: 0, pg: "2 pages (longer academic CV for PhD)", t: "No photo or date of birth. Open with a short personal profile." },
        "Canada": { ph: 0, pd: 0, pg: "1–2 pages", t: "Keep to contact details only. Highlight research, awards and skills." },
        "Australia / New Zealand": { ph: 0, pd: 0, pg: "2–3 pages", t: "No photo. Add citizenship or visa status if the form asks. Include referees." },
        "Germany / Europe": { ph: 1, pd: 1, pg: "2 pages, tabular and reverse-chronological", t: "A photo and date of birth are common but optional. Europass format is accepted." },
        "Japan": { ph: 1, pd: 1, pg: "Use the university’s or MEXT’s own form where required", t: "Many Japanese applications use set forms. Use this as your base content." },
        "South Korea": { ph: 1, pd: 1, pg: "The program’s form (for example GKS) plus a 2-page CV", t: "A photo and personal details are often expected. Follow the application form." },
        "China": { ph: 1, pd: 1, pg: "1–2 pages plus the online application form", t: "A photo and personal details are commonly accepted. Check CSC and university rules." },
        "Nepal / India": { ph: 1, pd: 1, pg: "1–2 pages", t: "Photo, date of birth and nationality are common locally. For international programs follow their rules." } };
    const D = Object.keys(CV);
    const CF = [["name", "Full name"], ["email", "Email"], ["phone", "Phone"], ["loc", "City, country"], ["links", "Links (LinkedIn, ORCID, website)"], ["dob", "Date of birth"], ["nat", "Nationality"], ["sum", "Profile summary (2–3 lines)", "t"], ["edu", "Education: one per line (Degree, University, Years, detail)", "t"], ["exp", "Research and work experience: one per line", "t"], ["pub", "Publications, projects and thesis: one per line", "t"], ["awd", "Awards and scholarships: one per line", "t"], ["skl", "Skills (comma separated)"], ["lng", "Languages (comma separated)"], ["ref", "Referees: one per line (Name, position, email)", "t"]];
    const EF = [["nm", "Your name"], ["deg", "Your degree (e.g. BSc, MSc)"], ["fld", "Your field"], ["uni", "Your university"], ["prof", "Professor’s surname"], ["pu", "Professor’s university"], ["topic", "Research topic you are interested in"], ["paper", "Title of one of their papers (optional)"], ["prog", "Scholarship you plan to apply for (optional)"], ["intake", "Intake (e.g. 2027)"]];
    const mk = (a, p) => a.map(([k, l, t]) => `<div class="f${t ? " w" : ""}"><label>${l}</label>` + (t ? `<textarea id="${p}${k}" rows="2"></textarea>` : `<input id="${p}${k}">`) + `</div>`).join("");
    const opt = a => a.map(d => `<option>${d}</option>`).join("");
    $("#cvdest").innerHTML = opt(D);
    $("#emdest").innerHTML = opt(D.slice(1));
    $("#cvfields").innerHTML = mk(CF, "cv_");
    $("#emfields").innerHTML = mk(EF, "em_");
    let S = {}, photo = "";
    try {
        S = JSON.parse(localStorage.getItem("avtk") || "{}");
    }
    catch (e) { }
    document.querySelectorAll("#tk-cv input:not([type=file]):not([type=checkbox]),#tk-cv textarea,#tk-cv select,#tk-em input,#tk-em textarea:not(#emout),#tk-em select").forEach(el => { if (S[el.id] != null)
        el.value = S[el.id]; });
    function cvTip() { const c = CV[$("#cvdest").value]; $("#cvtip").innerHTML = `<b>Typical format:</b> ${c.pg}. ${c.t}`; }
    function cv() {
        const g = k => ($("#cv_" + k) || {}).value || "", d = $("#cvdest").value;
        const sec = (t, h) => h ? `<h4>${t}</h4>${h}` : "", bl = t => ls(t).length ? "<ul>" + ls(t).map(x => `<li>${esc(x)}</li>`).join("") + "</ul>" : "", pa = t => t ? `<p>${esc(t)}</p>` : "";
        const contact = [g("email"), g("phone"), g("loc"), g("links")].filter(Boolean).map(esc).join(" · ");
        const pers = $("#cvpd").checked ? [g("dob") && "Born: " + g("dob"), g("nat") && "Nationality: " + g("nat")].filter(Boolean).map(esc).join(" · ") : "";
        const ph = $("#cvph").checked ? (photo ? `<img src="${photo}" alt="">` : `<div class="ph">Photo</div>`) : "";
        const E = sec("Education", bl(g("edu"))), X = sec("Research and work experience", bl(g("exp"))), o = d == "Germany / Europe" ? X + E : E + X;
        $("#cvprev").innerHTML = `<div class="cvh">${ph}<div><h3>${esc(g("name")) || "Your name"}</h3><p>${contact}</p><p>${pers}</p></div></div>` + sec("Profile", pa(g("sum"))) + o + sec("Publications and projects", bl(g("pub"))) + sec("Awards and scholarships", bl(g("awd"))) + sec("Skills", pa(g("skl"))) + sec("Languages", pa(g("lng"))) + sec("Referees", bl(g("ref")));
    }
    const DP = { "USA": "I plan to apply to the PhD program in your department for {it}, and would like to know whether your group expects to admit students. I understand the department makes the admission decision.",
        "UK": "I am looking for funded PhD opportunities at your university for {it}. Could you tell me whether studentships are available in your group, and whether a supervisor’s support is needed before I apply?",
        "Canada": "I plan to apply to the graduate program at your university for {it} and would like to know whether you have funding for a new student.",
        "Australia / New Zealand": "I plan to apply for a research degree (HDR) for {it}, including government RTP or university scholarships. I understand a supervisor’s agreement is usually needed before applying, so I would appreciate your guidance.",
        "Germany / Europe": "I would like to know whether doctoral positions are available in your group for {it}, or whether I should apply with an external scholarship such as DAAD.",
        "Japan": "I would like to ask whether you could accept me as a research or doctoral student from {it}, and whether you can advise on scholarship routes such as MEXT.",
        "South Korea": "I would like to ask whether you could accept me as a graduate student in your laboratory from {it}, including through a scholarship such as GKS.",
        "China": "I would like to ask whether you could accept me as a doctoral student from {it}, including through the CSC scholarship, which may require an acceptance letter from a supervisor.",
        "Nepal / India": "I would like to ask whether you have openings for research students from {it} and whether fellowships or other funding are available." };
    function em() {
        const g = k => ($("#em_" + k).value || "").trim(), t = $("#emtype").value, d = $("#emdest").value, p = (x, l) => x || "[" + l + "]";
        const nm = p(g("nm"), "Your name"), deg = p(g("deg"), "degree"), fld = p(g("fld"), "field"), uni = p(g("uni"), "your university"), pr = p(g("prof"), "Surname"), pu = p(g("pu"), "their university"), tp = p(g("topic"), "research topic"), pp = g("paper"), pg = g("prog"), it = p(g("intake"), "intake, e.g. 2027");
        const hi = `Dear Professor ${pr},\n\n`, bye = `\n\nThank you for your time and consideration.\n\nKind regards,\n${nm}`;
        const pap = pp ? `I read your paper “${pp}” with great interest, especially [one specific point you found interesting]. ` : "", prg = pg ? ` I plan to apply for ${pg}.` : "", dp = (DP[d] || "").replace("{it}", it) + prg;
        let s, b;
        if (t == "phd") {
            s = `Prospective PhD applicant in ${fld}: ${nm}`;
            b = hi + `I am ${nm}, a ${deg} graduate in ${fld} from ${uni}. I am writing to ask whether you are accepting PhD students, and whether you might supervise research on ${tp} at ${pu}.\n\n${pap}[Two sentences on your background: thesis or project, methods and results.]\n\n${dp}\n\nI have attached my CV and transcripts. I would be grateful for any advice, even if you are not taking students at present.` + bye;
        }
        else if (t == "master") {
            s = `Prospective research Master’s student in ${fld}: ${nm}`;
            b = hi + `I am ${nm}, studying ${fld} at ${uni}. I am interested in a research Master’s with your group at ${pu}, particularly on ${tp}.\n\n${pap}[One or two sentences on your relevant experience.]\n\nCould you tell me whether you have capacity for new students and what funding options exist?${prg} I have attached my CV.` + bye;
        }
        else if (t == "intern") {
            s = `Summer research internship enquiry: ${nm}`;
            b = hi + `I am ${nm}, a ${deg} student in ${fld} at ${uni}. I am looking for a research internship and was drawn to your work on ${tp} at ${pu}.\n\n${pap}[Skills you can contribute, for example methods, software or lab techniques.]\n\nWould it be possible to join your group for [number] weeks from [month]? I am happy to arrange my own funding${pg ? " through " + pg : ""} where possible. My CV is attached.` + bye;
        }
        else if (t == "follow") {
            s = `Re: Prospective applicant in ${fld}: ${nm}`;
            b = hi + `I wrote to you on [date] about ${tp} and wanted to follow up briefly, as I know you receive many emails. I remain very interested in your work at ${pu}.\n\nIf you are not taking students, I would still be grateful for a pointer to colleagues whose work is close to yours. My CV is attached again for convenience.` + bye;
        }
        else if (t == "scholar") {
            s = `Question about eligibility${pg ? " for " + pg : ""}`;
            b = `Dear Scholarship Team,\n\nI am ${nm}, a citizen of [country], currently studying ${fld} at ${uni}. I am considering applying${pg ? " for " + pg : ""} for ${it}.\n\nMy question is: [your specific question]. I have read the official guidelines at [link] but could not find the answer.\n\nThank you for your help.\n\nKind regards,\n${nm}`;
        }
        else {
            s = `Request for a reference: ${nm}`;
            b = hi + `I hope you are well. I am applying${pg ? " for " + pg : ""} to ${pu != "[their university]" ? pu : "[university or program]"} for ${it}, and I would be honoured if you could write a strong reference for me. The deadline is [date].\n\nI can send my CV, statement of purpose, transcript and a short summary of our work together [project or course], and I am happy to meet if useful.` + bye;
        }
        $("#emout").value = "Subject: " + s + "\n\n" + b;
    }
    function save(e) { const el = e.target; if (el.id && el.id != "emout" && el.type != "file" && el.type != "checkbox") {
        S[el.id] = el.value;
        try {
            localStorage.setItem("avtk", JSON.stringify(S));
        }
        catch (x) { }
    } }
    $("#cvdest").addEventListener("change", () => { const c = CV[$("#cvdest").value]; $("#cvph").checked = !!c.ph; $("#cvpd").checked = !!c.pd; cvTip(); cv(); });
    $("#tk-cv").addEventListener("input", () => cv());
    $("#tk-em").addEventListener("input", e => { if (e.target.id != "emout")
        em(); });
    $("#toolkit").addEventListener("input", save);
    $("#cvphoto").addEventListener("change", e => { const f = e.target.files[0]; if (!f)
        return; const r = new FileReader(); r.onload = () => { photo = r.result; cv(); }; r.readAsDataURL(f); });
    $("#cvprint").onclick = () => window.print();
    $("#emcopy").onclick = async () => { const v = $("#emout"); try {
        await navigator.clipboard.writeText(v.value);
    }
    catch (e) {
        v.select();
        document.execCommand("copy");
    } const b = $("#emcopy"); b.textContent = "Copied ✓"; setTimeout(() => b.textContent = "Copy email", 1800); };
    $("#emmail").onclick = () => { const v = $("#emout").value, i = v.indexOf("\n\n"), s = v.slice(9, i); location.href = "mailto:?subject=" + encodeURIComponent(s) + "&body=" + encodeURIComponent(v.slice(i + 2)); };
    $("#tktabs").onclick = e => { const k = e.target.dataset.tk; if (!k)
        return; document.querySelectorAll("#tktabs button").forEach(b => b.classList.toggle("on", b == e.target)); $("#tk-cv").style.display = k == "cv" ? "" : "none"; $("#tk-em").style.display = k == "em" ? "" : "none"; };
    if (S.cvph == null) {
        const c = CV[$("#cvdest").value];
        $("#cvph").checked = !!c.ph;
        $("#cvpd").checked = !!c.pd;
    }
    cvTip();
    cv();
    em();
})();
