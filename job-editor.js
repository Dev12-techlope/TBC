/* ==========================================================================
   Éditeur d'offres d'emploi TBC — outil interne
   Génère un fichier emploi-xxx.html autonome (même gabarit que le site,
   formulaire de candidature inclus) et peut régénérer recrutement.html.
   Tout se passe dans le navigateur : aucune donnée n'est envoyée où que
   ce soit.
   ========================================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "tbc_job_draft_v1";
  const LIBRARY_KEY = "tbc_job_library_v1";
  const MOIS_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];

  const TYPE_LABELS = {
    "temps-plein": "TEMPS PLEIN",
    "freelance": "FREELANCE",
    "stage": "STAGE",
    "temps-partiel": "TEMPS PARTIEL",
    "saisonnier": "SAISONNIER",
  };

  // Les 5 offres d'exemple déjà présentes sur le site au départ.
  const EXAMPLE_JOBS = [
    { filename: "emploi-developpeur-full-stack-php-javascript.html", titre: "Développeur Full-Stack PHP / JavaScript", type: "temps-plein", lieu: "Combs-la-Ville, France", date: "2026-09-17", resume: "Rejoignez nos équipes pour concevoir et développer des applications métiers sur des stacks PHP, JS et SQL." },
    { filename: "emploi-consultant-devops-aws-kubernetes.html", titre: "Consultant DevOps AWS / Kubernetes", type: "freelance", lieu: "Télétravail", date: "2026-09-13", resume: "Mission de déploiement et d'industrialisation d'infrastructures cloud pour un client grand compte." },
    { filename: "emploi-chef-de-projet-technique.html", titre: "Chef de projet technique", type: "temps-plein", lieu: "Combs-la-Ville, France", date: "2026-08-30", resume: "Pilotage de projets de développement de bout en bout, de la spécification au déploiement." },
    { filename: "emploi-developpeur-java-senior.html", titre: "Développeur Java Senior", type: "temps-plein", lieu: "Paris, France", date: "2026-09-06", resume: "Participation à la conception et au développement de modules fonctionnels pour un projet industriel." },
    { filename: "emploi-stagiaire-developpement-web.html", titre: "Stagiaire développement web", type: "stage", lieu: "Combs-la-Ville, France", date: "2026-08-20", resume: "Stage de fin d'études au sein de nos équipes de développement HTML5/JS/PHP." },
  ];

  let blockSeq = 0;
  const newBlockId = () => "s" + (++blockSeq) + "_" + Math.random().toString(36).slice(2, 7);
  const newId = () => "j" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function defaultState() {
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: null,
      titre: "",
      type: "temps-plein",
      lieu: "",
      date: today,
      resume: "",
      intro: "",
      sections: [
        { id: newBlockId(), titre: "Vos missions", bullets: "" },
        { id: newBlockId(), titre: "Profil recherché", bullets: "" },
        { id: newBlockId(), titre: "Ce que nous proposons", bullets: "" },
      ],
    };
  }

  let state = loadDraft() || defaultState();

  function loadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.sections)) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* stockage indisponible : on continue sans bloquer l'utilisateur */
    }
  }

  function loadLibrary() {
    try {
      const raw = localStorage.getItem(LIBRARY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveLibrary(list) {
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  function upsertCurrentIntoLibrary() {
    const list = loadLibrary();
    if (!state.id) state.id = newId();
    const entry = JSON.parse(JSON.stringify(state));
    const idx = list.findIndex((a) => a.id === entry.id);
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
    const ok = saveLibrary(list);
    saveDraft();
    return ok;
  }

  /* ---------------------------- Utilitaires ---------------------------- */

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function slugify(str) {
    return String(str || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "sans-titre";
  }

  function formatDateFr(isoDate) {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-").map(Number);
    if (!y || !m || !d) return isoDate;
    return `${d} ${MOIS_FR[m - 1]} ${y}`;
  }

  function bulletsToLis(text) {
    return String(text || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => `          <li>${escapeHtml(l)}</li>`)
      .join("\n");
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function setStatus(msg, kind) {
    const el = document.getElementById("builder-status");
    el.textContent = msg;
    el.className = "builder-status" + (kind ? " is-" + kind : "");
    if (msg) {
      setTimeout(() => {
        if (el.textContent === msg) el.textContent = "";
      }, 4000);
    }
  }

  function jobFilename(job) {
    return "emploi-" + slugify(job.titre) + ".html";
  }

  function idPrefix(job) {
    return "apply-" + slugify(job.titre).slice(0, 24);
  }

  /* ------------------------ Construction du HTML ------------------------ */

  function buildSectionsInner() {
    return state.sections
      .filter((s) => (s.titre || "").trim())
      .map((s) => {
        const lis = bulletsToLis(s.bullets);
        if (!lis) return "";
        return `        <h2>${escapeHtml(s.titre.trim())}</h2>\n        <ul class="check-list">\n${lis}\n        </ul>\n`;
      })
      .filter(Boolean)
      .join("\n");
  }

  function buildApplyFormInner(prefix, titre) {
    return `        <div class="job-apply-panel">
          <h2>Postuler à cette offre</h2>
          <form class="application-form" data-poste="${escapeHtml(titre)}" novalidate>
            <div class="row g-3">
              <div class="col-sm-6">
                <label class="form-label" for="${prefix}-nom">Nom *</label>
                <input type="text" class="form-control" id="${prefix}-nom" name="nom" required>
              </div>
              <div class="col-sm-6">
                <label class="form-label" for="${prefix}-prenom">Prénom *</label>
                <input type="text" class="form-control" id="${prefix}-prenom" name="prenom" required>
              </div>
              <div class="col-sm-6">
                <label class="form-label" for="${prefix}-email">Adresse e-mail *</label>
                <input type="email" class="form-control" id="${prefix}-email" name="email" required>
              </div>
              <div class="col-sm-6">
                <label class="form-label" for="${prefix}-contact">Téléphone</label>
                <input type="tel" class="form-control" id="${prefix}-contact" name="contact">
              </div>
              <div class="col-12">
                <label class="form-label" for="${prefix}-cv">CV (PDF) *</label>
                <input type="file" class="form-control" id="${prefix}-cv" name="cv" accept="application/pdf,.pdf" required>
                <p class="field-hint">Format PDF uniquement, 8 Mo maximum.</p>
              </div>
              <div class="col-12">
                <label class="form-label" for="${prefix}-message">Message</label>
                <textarea class="form-control" id="${prefix}-message" name="message" rows="3" placeholder="Quelques mots de motivation, disponibilité…"></textarea>
              </div>
              <div class="col-12">
                <div class="alert d-none enroll-feedback" role="alert"></div>
                <button type="submit" class="btn btn-tbc">Envoyer ma candidature</button>
              </div>
            </div>
          </form>
        </div>
`;
  }

  function buildFullJobHTML(opts) {
    opts = opts || {};
    const titre = state.titre.trim() || "Intitulé du poste";
    const resume = state.resume.trim();
    const lieu = state.lieu.trim() || "Lieu à préciser";
    const dateFr = formatDateFr(state.date);
    const typeLabel = TYPE_LABELS[state.type] || "TEMPS PLEIN";
    const prefix = idPrefix(state);
    const inlineAssets = opts.forPreview ? window.__TBC_INLINE_ASSETS__ : null;
    const baseTag = opts.forPreview
      ? '\n  <base href="./">\n  <style>.reveal{opacity:1 !important;transform:none !important;}</style>'
      : "";
    const styleTag = inlineAssets ? `<style>${inlineAssets.css}</style>` : `<link href="css/style.css" rel="stylesheet">`;
    const mainJsTag = inlineAssets ? `<script>${inlineAssets.mainJs}</script>` : `<script src="js/main.js"></script>`;
    const logoMarkup = inlineAssets && inlineAssets.logoSvg
      ? inlineAssets.logoSvg
      : '<img src="https://it-tbc.com/wp-content/uploads/2025/02/cropped-log_tbc-1-270x270.jpg" alt="TBC">';
    const headerArtSrc = inlineAssets && inlineAssets.headerArt ? inlineAssets.headerArt : "img/header-recrutement.svg";

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(titre)} – Recrutement TBC</title>${resume ? `\n  <meta name="description" content="${escapeHtml(resume)}">` : ""}${baseTag}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..125,400..900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css" rel="stylesheet">
  ${styleTag}
</head>
<body>

  <nav class="navbar navbar-expand-lg navbar-tbc sticky-top py-3">
    <div class="container">
      <a class="navbar-brand" href="index.html">
        ${logoMarkup}
        <span class="brand-tag">IT · CONSEIL<br>DÉVELOPPEMENT</span>
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item"><a class="nav-link" href="index.html">Accueil</a></li>
          <li class="nav-item"><a class="nav-link" href="index.html#nos-services">Nos services</a></li>
          <li class="nav-item"><a class="nav-link" href="index.html#expertise">Expertise</a></li>
          <li class="nav-item"><a class="nav-link" href="formation.html">Formation</a></li>
          <li class="nav-item"><a class="nav-link active" href="recrutement.html">Recrutement</a></li>
          <li class="nav-item"><a class="nav-link" href="blog.html">Blog</a></li>
          <li class="nav-item"><a class="nav-link" href="index.html#contact">Contact</a></li>
        </ul>
      </div>
    </div>
  </nav>

  <header class="page-header">
    <div class="container">
      <div class="row align-items-center">
        <div class="col-lg-8">
        <div class="eyebrow">Recrutement</div>
        <h1>${escapeHtml(titre)}</h1>
        <div class="job-detail-meta">
          <span class="job-type">${escapeHtml(typeLabel)}</span>
          <span class="job-detail-location">${escapeHtml(lieu)}${dateFr ? " · Publié le " + escapeHtml(dateFr) : ""}</span>
        </div>
        </div>
        <div class="col-lg-4 d-none d-lg-block">
          <img class="page-header-art" src="${headerArtSrc}" alt="" width="480" height="300" aria-hidden="true">
        </div>
      </div>
    </div>
  </header>

  <section class="section">
    <div class="container">
      <div class="article-body">
        <p>${escapeHtml(state.intro.trim())}</p>

${buildSectionsInner()}
${buildApplyFormInner(prefix, titre)}
        <div class="article-nav">
          <a href="recrutement.html" class="btn-ghost">← Toutes les offres</a>
        </div>
      </div>
    </div>
  </section>

  <footer class="footer-tbc">
    <div class="container">
      <div class="row g-4">
        <div class="col-md-4">
          <h5>TBC</h5>
          <p>Expertise et conseil en technologie de l'information.</p>
          <a href="https://www.linkedin.com/in/diadie-sow-97581b8a/" target="_blank" rel="noopener">LinkedIn ↗</a>
        </div>
        <div class="col-md-4">
          <h5>Navigation</h5>
          <ul class="footer-links">
            <li><a href="index.html">Accueil</a></li>
            <li><a href="formation.html">Formation</a></li>
            <li><a href="recrutement.html">Recrutement</a></li>
            <li><a href="blog.html">Blog</a></li>
          </ul>
        </div>
        <div class="col-md-4">
          <h5>Contact</h5>
          <ul class="footer-links">
            <li>168 allée des mésanges, 77190, Dammarie-les-lys (France)</li>
            <li><a href="mailto:contact@it-tbc.com">contact@it-tbc.com</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom d-flex justify-content-between flex-wrap gap-2">
        <span>© ${new Date().getFullYear()} TBC</span>
        <a href="mentions-legales.html">Mentions légales</a>
      </div>
    </div>
  </footer>

  <div class="read-progress" aria-hidden="true"></div>
  <button class="to-top" type="button" aria-label="Revenir en haut de la page">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
  </button>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/js/bootstrap.bundle.min.js"></script>
  ${mainJsTag}
</body>
</html>
`;
  }

  function jobCardHTML(job) {
    const typeLabel = TYPE_LABELS[job.type] || "TEMPS PLEIN";
    const dateFr = formatDateFr(job.date);
    return `            <a href="${escapeHtml(jobFilename(job))}" class="job-card" data-title="${escapeHtml(job.titre)}" data-location="${escapeHtml(job.lieu)}" data-type="${escapeHtml(job.type)}">
              <span class="job-type">${escapeHtml(typeLabel)}</span>
              <h3>${escapeHtml(job.titre)}</h3>
              <p class="job-meta">${escapeHtml(job.lieu)}${dateFr ? " · Publié le " + escapeHtml(dateFr) : ""}</p>
              <p>${escapeHtml(job.resume || "")}</p>
              <span class="job-card-cta">Voir l'offre et postuler</span>
            </a>
`;
  }

  function buildRecrutementHTML(opts) {
    opts = opts || {};
    const includeExamples = opts.includeExamples !== false;
    const library = loadLibrary().filter((j) => j.titre && j.titre.trim());

    const libraryCards = library
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .map(jobCardHTML)
      .join("\n");

    const exampleCards = includeExamples ? EXAMPLE_JOBS.map(jobCardHTML).join("\n") : "";
    const allCards = (libraryCards + "\n" + exampleCards).trim();
    const total = library.length + (includeExamples ? EXAMPLE_JOBS.length : 0);

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Recrutement – TBC</title>
  <meta name="description" content="Découvrez nos offres d'emploi chez TBC et postulez en ligne avec votre CV.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..125,400..900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css" rel="stylesheet">
  <link href="css/style.css" rel="stylesheet">
</head>
<body>

  <nav class="navbar navbar-expand-lg navbar-tbc sticky-top py-3">
    <div class="container">
      <a class="navbar-brand" href="index.html">
        <img src="https://it-tbc.com/wp-content/uploads/2025/02/cropped-log_tbc-1-270x270.jpg" alt="TBC">
        <span class="brand-tag">IT · CONSEIL<br>DÉVELOPPEMENT</span>
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item"><a class="nav-link" href="index.html">Accueil</a></li>
          <li class="nav-item"><a class="nav-link" href="index.html#nos-services">Nos services</a></li>
          <li class="nav-item"><a class="nav-link" href="index.html#expertise">Expertise</a></li>
          <li class="nav-item"><a class="nav-link" href="formation.html">Formation</a></li>
          <li class="nav-item"><a class="nav-link active" href="recrutement.html">Recrutement</a></li>
          <li class="nav-item"><a class="nav-link" href="blog.html">Blog</a></li>
          <li class="nav-item"><a class="nav-link" href="index.html#contact">Contact</a></li>
        </ul>
      </div>
    </div>
  </nav>

  <header class="page-header">
    <div class="container">
      <div class="row align-items-center">
        <div class="col-lg-7">
        <div class="eyebrow">Rejoindre TBC</div>
        <h1>Recrutement</h1>
        <p class="mb-0" style="color:#CFE5E4; max-width:52ch;">
          Découvrez nos offres et postulez directement en ligne avec votre CV.
        </p>
        </div>
        <div class="col-lg-5 d-none d-lg-block">
          <img class="page-header-art" src="img/header-recrutement.svg" alt="" width="480" height="300" aria-hidden="true">
        </div>
      </div>
    </div>
  </header>

  <section class="section">
    <div class="container">
      <div class="row g-4">

        <div class="col-lg-3">
          <div class="job-filters">
            <div class="mb-3">
              <label class="form-label" for="job-keyword">Mots-clés</label>
              <input type="text" class="form-control" id="job-keyword" placeholder="Ex : développeur PHP">
            </div>
            <div class="mb-3">
              <label class="form-label" for="job-location">Localisation</label>
              <input type="text" class="form-control" id="job-location" placeholder="Ville ou région">
            </div>
            <div>
              <label class="form-label d-block">Type de contrat</label>
              <div class="form-check">
                <input class="form-check-input job-type-filter" type="checkbox" value="freelance" id="type-freelance">
                <label class="form-check-label" for="type-freelance">Freelance</label>
              </div>
              <div class="form-check">
                <input class="form-check-input job-type-filter" type="checkbox" value="saisonnier" id="type-saisonnier">
                <label class="form-check-label" for="type-saisonnier">Saisonnier</label>
              </div>
              <div class="form-check">
                <input class="form-check-input job-type-filter" type="checkbox" value="stage" id="type-stage">
                <label class="form-check-label" for="type-stage">Stage</label>
              </div>
              <div class="form-check">
                <input class="form-check-input job-type-filter" type="checkbox" value="temps-partiel" id="type-partiel">
                <label class="form-check-label" for="type-partiel">Temps partiel</label>
              </div>
              <div class="form-check">
                <input class="form-check-input job-type-filter" type="checkbox" value="temps-plein" id="type-plein">
                <label class="form-check-label" for="type-plein">Temps plein</label>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-9">
          <!--
            Cette page est générée automatiquement par editeur-offres.html.
            Pour ajouter, modifier ou retirer une offre, utilisez l'éditeur
            plutôt que de modifier ce fichier à la main.
          -->
          <div id="job-list">
${allCards}
          </div>
${total === 0 ? `          <p class="text-muted small">Aucune offre pour le moment. Créez-en une avec l'éditeur d'offres.</p>\n` : ""}        </div>

      </div>
    </div>
  </section>

  <footer class="footer-tbc">
    <div class="container">
      <div class="row g-4">
        <div class="col-md-4">
          <h5>TBC</h5>
          <p>Expertise et conseil en technologie de l'information.</p>
          <a href="https://www.linkedin.com/in/diadie-sow-97581b8a/" target="_blank" rel="noopener">LinkedIn ↗</a>
        </div>
        <div class="col-md-4">
          <h5>Navigation</h5>
          <ul class="footer-links">
            <li><a href="index.html">Accueil</a></li>
            <li><a href="formation.html">Formation</a></li>
            <li><a href="recrutement.html">Recrutement</a></li>
            <li><a href="blog.html">Blog</a></li>
          </ul>
        </div>
        <div class="col-md-4">
          <h5>Contact</h5>
          <ul class="footer-links">
            <li>168 allée des mésanges, 77190, Dammarie-les-lys (France)</li>
            <li><a href="mailto:contact@it-tbc.com">contact@it-tbc.com</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom d-flex justify-content-between flex-wrap gap-2">
        <span>© ${new Date().getFullYear()} TBC</span>
        <a href="mentions-legales.html">Mentions légales</a>
      </div>
    </div>
  </footer>

  <div class="read-progress" aria-hidden="true"></div>
  <button class="to-top" type="button" aria-label="Revenir en haut de la page">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
  </button>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/js/bootstrap.bundle.min.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
`;
  }

  /* ------------------------------ Rendu UI ------------------------------- */

  const blockList = document.getElementById("block-list");

  function renderSections() {
    blockList.innerHTML = "";
    state.sections.forEach((sec, index) => {
      const item = document.createElement("div");
      item.className = "block-item";

      const head = document.createElement("div");
      head.className = "block-item-head";
      head.innerHTML = `
        <span class="block-item-type">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/></svg>
          Rubrique
        </span>
        <span class="block-item-actions">
          <button type="button" class="block-btn" data-action="up" ${index === 0 ? "disabled" : ""} aria-label="Monter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
          </button>
          <button type="button" class="block-btn" data-action="down" ${index === state.sections.length - 1 ? "disabled" : ""} aria-label="Descendre">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <button type="button" class="block-btn danger" data-action="delete" aria-label="Supprimer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12"/></svg>
          </button>
        </span>`;

      const body = document.createElement("div");
      body.className = "block-item-body";

      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.className = "form-control";
      titleInput.placeholder = "Titre de la rubrique (ex. Vos missions)";
      titleInput.value = sec.titre || "";
      titleInput.style.marginBottom = "0.6rem";
      titleInput.addEventListener("input", () => {
        sec.titre = titleInput.value;
        saveDraft();
        schedulePreview();
      });

      const bulletsArea = document.createElement("textarea");
      bulletsArea.className = "form-control";
      bulletsArea.placeholder = "Une ligne = une puce.\nEx. : Concevoir et développer des applications web…";
      bulletsArea.value = sec.bullets || "";
      bulletsArea.rows = 4;
      bulletsArea.addEventListener("input", () => {
        sec.bullets = bulletsArea.value;
        saveDraft();
        schedulePreview();
      });

      body.appendChild(titleInput);
      body.appendChild(bulletsArea);
      item.appendChild(head);
      item.appendChild(body);
      blockList.appendChild(item);

      head.querySelector('[data-action="up"]').addEventListener("click", () => moveSection(index, -1));
      head.querySelector('[data-action="down"]').addEventListener("click", () => moveSection(index, 1));
      head.querySelector('[data-action="delete"]').addEventListener("click", () => deleteSection(index));
    });
  }

  function moveSection(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= state.sections.length) return;
    const tmp = state.sections[index];
    state.sections[index] = state.sections[target];
    state.sections[target] = tmp;
    saveDraft();
    renderSections();
    schedulePreview();
  }

  function deleteSection(index) {
    state.sections.splice(index, 1);
    saveDraft();
    renderSections();
    schedulePreview();
  }

  document.getElementById("btn-add-section").addEventListener("click", () => {
    state.sections.push({ id: newBlockId(), titre: "", bullets: "" });
    saveDraft();
    renderSections();
    schedulePreview();
  });

  /* ------------------------------ Aperçu -------------------------------- */

  let previewTimer = null;
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 350);
  }

  function updatePreview() {
    const frame = document.getElementById("preview-frame");
    frame.srcdoc = buildFullJobHTML({ forPreview: true });
    document.getElementById("preview-url").textContent = jobFilename(state);
  }

  /* --------------------------- Champs généraux --------------------------- */

  const fTitre = document.getElementById("f-titre");
  const fType = document.getElementById("f-type");
  const fLieu = document.getElementById("f-lieu");
  const fDate = document.getElementById("f-date");
  const fResume = document.getElementById("f-resume");
  const fIntro = document.getElementById("f-intro");
  const resumeCount = document.getElementById("resume-count");

  function applyStateToForm() {
    fTitre.value = state.titre;
    fType.value = state.type;
    fLieu.value = state.lieu;
    fDate.value = state.date;
    fResume.value = state.resume;
    fIntro.value = state.intro;
    resumeCount.textContent = state.resume.length;
    renderSections();
    schedulePreview();
  }
  applyStateToForm();

  fTitre.addEventListener("input", () => { state.titre = fTitre.value; saveDraft(); schedulePreview(); });
  fType.addEventListener("change", () => { state.type = fType.value; saveDraft(); schedulePreview(); });
  fLieu.addEventListener("input", () => { state.lieu = fLieu.value; saveDraft(); schedulePreview(); });
  fDate.addEventListener("input", () => { state.date = fDate.value; saveDraft(); schedulePreview(); });
  fIntro.addEventListener("input", () => { state.intro = fIntro.value; saveDraft(); schedulePreview(); });
  fResume.addEventListener("input", () => {
    state.resume = fResume.value;
    resumeCount.textContent = fResume.value.length;
    saveDraft();
    schedulePreview();
  });

  /* ------------------------------ Bibliothèque ------------------------------ */

  const libraryList = document.getElementById("library-list");
  const chkExamples = document.getElementById("chk-examples");

  function renderLibrary() {
    const list = loadLibrary();
    libraryList.innerHTML = "";

    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.className = "library-empty";
      empty.textContent = "Aucune offre enregistrée pour l'instant. Téléchargez une offre pour qu'elle apparaisse ici.";
      libraryList.appendChild(empty);
      return;
    }

    list
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .forEach((entry) => {
        const row = document.createElement("div");
        row.className = "library-item";

        const badge = document.createElement("div");
        badge.className = "library-item-thumb";
        badge.style.display = "flex";
        badge.style.alignItems = "center";
        badge.style.justifyContent = "center";
        badge.style.fontFamily = "'JetBrains Mono', monospace";
        badge.style.fontSize = "0.62rem";
        badge.style.textAlign = "center";
        badge.style.color = "var(--signal-deep)";
        badge.style.background = "rgba(23,224,192,0.1)";
        badge.textContent = (TYPE_LABELS[entry.type] || "").slice(0, 3);

        const info = document.createElement("div");
        info.className = "library-item-info";
        const title = document.createElement("div");
        title.className = "library-item-title";
        title.textContent = entry.titre || "(sans titre)";
        const date = document.createElement("div");
        date.className = "library-item-date";
        date.textContent = formatDateFr(entry.date) + " · " + jobFilename(entry);
        info.appendChild(title);
        info.appendChild(date);

        const actions = document.createElement("div");
        actions.className = "library-item-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "block-btn";
        editBtn.title = "Charger pour modifier";
        editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
        editBtn.addEventListener("click", () => loadFromLibrary(entry.id));

        const dupBtn = document.createElement("button");
        dupBtn.type = "button";
        dupBtn.className = "block-btn";
        dupBtn.title = "Dupliquer comme nouvelle offre";
        dupBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        dupBtn.addEventListener("click", () => duplicateFromLibrary(entry.id));

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "block-btn danger";
        delBtn.title = "Retirer de la bibliothèque";
        delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12"/></svg>';
        delBtn.addEventListener("click", () => deleteFromLibrary(entry.id, entry.titre));

        actions.appendChild(editBtn);
        actions.appendChild(dupBtn);
        actions.appendChild(delBtn);

        row.appendChild(badge);
        row.appendChild(info);
        row.appendChild(actions);
        libraryList.appendChild(row);
      });
  }

  function loadFromLibrary(id) {
    const entry = loadLibrary().find((a) => a.id === id);
    if (!entry) return;
    state = JSON.parse(JSON.stringify(entry));
    applyStateToForm();
    saveDraft();
    setStatus("« " + state.titre + " » chargée pour modification.", "ok");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function duplicateFromLibrary(id) {
    const entry = loadLibrary().find((a) => a.id === id);
    if (!entry) return;
    state = JSON.parse(JSON.stringify(entry));
    state.id = null;
    state.titre = state.titre + " (copie)";
    state.date = new Date().toISOString().slice(0, 10);
    applyStateToForm();
    saveDraft();
    setStatus("Copie créée. Modifiez-la puis téléchargez-la.", "ok");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteFromLibrary(id, titre) {
    if (!window.confirm("Retirer « " + titre + " » de la bibliothèque ?\n\nLe fichier déjà déposé sur votre site ne sera pas supprimé automatiquement : pensez à le retirer aussi via votre hébergeur si besoin, puis téléchargez à nouveau recrutement.html.")) return;
    const list = loadLibrary().filter((a) => a.id !== id);
    saveLibrary(list);
    if (state.id === id) {
      state = defaultState();
      applyStateToForm();
      saveDraft();
    }
    renderLibrary();
    setStatus("Offre retirée de la bibliothèque.", "ok");
  }

  /* -------------------------------- Actions -------------------------------- */

  document.getElementById("btn-download").addEventListener("click", () => {
    if (!state.titre.trim()) {
      setStatus("Ajoutez un intitulé de poste avant de télécharger.", "error");
      fTitre.focus();
      return;
    }
    if (!state.lieu.trim()) {
      setStatus("Ajoutez un lieu avant de télécharger.", "error");
      fLieu.focus();
      return;
    }
    if (!state.resume.trim()) {
      setStatus("Ajoutez un résumé avant de télécharger (utilisé sur la carte de la liste).", "error");
      fResume.focus();
      return;
    }
    const filename = jobFilename(state);
    downloadFile(filename, buildFullJobHTML({ forPreview: false }));
    const savedOk = upsertCurrentIntoLibrary();
    renderLibrary();
    setStatus(
      savedOk
        ? filename + " téléchargé et ajouté à la bibliothèque."
        : filename + " téléchargé (bibliothèque non sauvegardée : stockage du navigateur plein).",
      savedOk ? "ok" : "error"
    );
  });

  document.getElementById("btn-download-list").addEventListener("click", () => {
    const html = buildRecrutementHTML({ includeExamples: chkExamples.checked });
    downloadFile("recrutement.html", html);
    setStatus("recrutement.html téléchargé — à déposer à la racine du site.", "ok");
  });

  document.getElementById("btn-new").addEventListener("click", () => {
    if (!window.confirm("Vider le formulaire pour commencer une nouvelle offre ?\n\n(Les offres déjà téléchargées restent dans la bibliothèque ci-dessous.)")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    applyStateToForm();
    setStatus("Formulaire vidé, prêt pour une nouvelle offre.", "ok");
  });

  /* --------------------------------- Départ --------------------------------- */

  renderLibrary();
  updatePreview();
})();
