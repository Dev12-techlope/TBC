/* ==========================================================================
   Éditeur d'articles TBC — outil interne
   Génère un fichier article-xxx.html autonome (même gabarit que le site)
   et le code de carte à coller dans blog.html. Tout se passe dans le
   navigateur : aucune donnée n'est envoyée où que ce soit.
   ========================================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "tbc_article_draft_v1";
  const LIBRARY_KEY = "tbc_article_library_v1";
  const MOIS_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];

  // Les 3 articles d'exemple déjà présents dans blog.html au départ.
  // Utilisés uniquement pour régénérer blog.html si la case correspondante
  // reste cochée. Décochez-la (ou supprimez ces 3 fichiers de votre site)
  // le jour où vous voulez vous en séparer.
  const EXAMPLE_ARTICLES = [
    {
      filename: "article-nis2-dora.html",
      titre: "Guide stratégique NIS 2 et DORA pour les consultants IT seniors",
      date: "2025-08-05",
      resume: "L'année 2025 marque un tournant majeur dans l'écosystème de la cybersécurité européenne, avec DORA et NIS 2...",
      cover: "https://it-tbc.com/wp-content/uploads/2025/07/NIS2-DORA-1024x1024.png",
    },
    {
      filename: "article-lowcode-nocode.html",
      titre: "Low-Code & No-Code : le guide stratégique pour les freelances IT (2025)",
      date: "2025-07-31",
      resume: "Comment transformer l'émergence des plateformes sans code en avantage concurrentiel pour votre activité de freelance.",
      cover: "https://it-tbc.com/wp-content/uploads/2025/07/Lowcode_Nocode-1024x1024.png",
    },
    {
      filename: "article-cloud-souverain.html",
      titre: "La révolution du cloud souverain français",
      date: "2025-07-28",
      resume: "La souveraineté numérique devient un enjeu stratégique national pour les freelances IT seniors.",
      cover: "https://it-tbc.com/wp-content/uploads/2025/07/Le-cloud-souverain-2-1024x1024.png",
    },
  ];

  let blockSeq = 0;
  const newBlockId = () => "b" + (++blockSeq) + "_" + Math.random().toString(36).slice(2, 7);
  const newId = () => "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function defaultState() {
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: null,
      titre: "",
      date: today,
      resume: "",
      cover: null, // { dataUrl }
      prevLink: "blog.html",
      nextLink: "blog.html",
      blocks: [
        { id: newBlockId(), type: "paragraph", text: "" },
        { id: newBlockId(), type: "heading", text: "" },
        { id: newBlockId(), type: "paragraph", text: "" },
      ],
    };
  }

  let state = loadDraft() || defaultState();

  function loadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.blocks)) return null;
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
    const entry = JSON.parse(JSON.stringify(state)); // copie indépendante
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

  function paragraphsFromText(text) {
    return String(text || "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  function resizeImageFile(file, maxWidth) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Image illisible"));
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const isPng = /png/i.test(file.type);
          const dataUrl = isPng
            ? canvas.toDataURL("image/png")
            : canvas.toDataURL("image/jpeg", 0.82);
          resolve(dataUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
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

  /* ------------------------ Construction du HTML ------------------------ */

  function buildArticleBodyInner(withCover) {
    let html = "";
    if (withCover && state.cover && state.cover.dataUrl) {
      html += `        <div class="article-cover">\n          <img src="${state.cover.dataUrl}" alt="${escapeHtml(state.titre)}">\n        </div>\n\n`;
    }
    state.blocks.forEach((block) => {
      if (block.type === "paragraph") {
        paragraphsFromText(block.text).forEach((p) => {
          html += `        <p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>\n\n`;
        });
      } else if (block.type === "heading") {
        if ((block.text || "").trim()) {
          html += `        <h2>${escapeHtml(block.text.trim())}</h2>\n\n`;
        }
      } else if (block.type === "image") {
        if (block.dataUrl) {
          html += `        <figure class="article-figure">\n          <img src="${block.dataUrl}" alt="${escapeHtml(block.caption || state.titre)}" loading="lazy">\n`;
          if ((block.caption || "").trim()) {
            html += `          <figcaption>${escapeHtml(block.caption.trim())}</figcaption>\n`;
          }
          html += `        </figure>\n\n`;
        }
      } else if (block.type === "quote") {
        if ((block.text || "").trim()) {
          html += `        <div class="notice"><p>${escapeHtml(block.text.trim()).replace(/\n/g, "<br>")}</p></div>\n\n`;
        }
      }
    });
    return html;
  }

  function buildFullArticleHTML(opts) {
    opts = opts || {};
    const titre = state.titre.trim() || "Titre de l'article";
    const resume = state.resume.trim();
    const dateFr = formatDateFr(state.date);
    const prev = (state.prevLink || "blog.html").trim() || "blog.html";
    const next = (state.nextLink || "blog.html").trim() || "blog.html";
    const inlineAssets = opts.forPreview ? window.__TBC_INLINE_ASSETS__ : null;
    const baseTag = opts.forPreview
      ? '\n  <base href="./">\n  <style>.reveal{opacity:1 !important;transform:none !important;}</style>'
      : "";
    const styleTag = inlineAssets
      ? `<style>${inlineAssets.css}</style>`
      : `<link href="css/style.css" rel="stylesheet">`;
    const mainJsTag = inlineAssets
      ? `<script>${inlineAssets.mainJs}</script>`
      : `<script src="js/main.js"></script>`;
    const bodyInner = buildArticleBodyInner(true);

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(titre)} – Blog TBC</title>${resume ? `\n  <meta name="description" content="${escapeHtml(resume)}">` : ""}${baseTag}
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
        ${inlineAssets && inlineAssets.logoSvg ? inlineAssets.logoSvg : '<img src="https://it-tbc.com/wp-content/uploads/2025/02/cropped-log_tbc-1-270x270.jpg" alt="TBC">'}
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
          <li class="nav-item"><a class="nav-link" href="recrutement.html">Recrutement</a></li>
          <li class="nav-item"><a class="nav-link active" href="blog.html">Blog</a></li>
          <li class="nav-item"><a class="nav-link" href="index.html#contact">Contact</a></li>
        </ul>
      </div>
    </div>
  </nav>

  <header class="page-header">
    <div class="container">
      <div class="row align-items-center">
        <div class="col-lg-7">
        <div class="eyebrow">${escapeHtml(dateFr)}</div>
        <h1>${escapeHtml(titre)}</h1>
        </div>
        <div class="col-lg-5 d-none d-lg-block">
          <img class="page-header-art" src="${inlineAssets && inlineAssets.headerArt ? inlineAssets.headerArt : "img/header-article.svg"}" alt="" width="480" height="300" aria-hidden="true">
        </div>
      </div>
    </div>
  </header>

  <section class="section">
    <div class="container">
      <div class="article-body">
${bodyInner}        <div class="article-nav">
          <a href="${escapeHtml(prev)}" class="btn-ghost">← Article précédent</a>
          <a href="${escapeHtml(next)}" class="btn-ghost">Article suivant →</a>
        </div>
      </div>
    </div>
  </section>

  <footer class="footer-tbc">
    <div class="container">
      <div class="footer-bottom d-flex justify-content-between flex-wrap gap-2">
        <span>© ${state.date ? state.date.slice(0, 4) : "2026"} TBC</span>
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

  function articleFilename(article) {
    return "article-" + slugify(article.titre) + ".html";
  }

  function blogCardHTML(cover, filename, dateFr, titre, resume) {
    return `        <div class="col-md-6 col-lg-4">
          <div class="blog-card">
            <img src="${cover}" alt="${escapeHtml(titre)}">
            <div class="blog-body">
              <div class="blog-date">${escapeHtml(dateFr)}</div>
              <h3><a href="${escapeHtml(filename)}" class="stretched-link text-decoration-none">${escapeHtml(titre)}</a></h3>
              <p>${escapeHtml(resume)}</p>
            </div>
          </div>
        </div>
`;
  }

  function buildBlogHTML(opts) {
    opts = opts || {};
    const includeExamples = opts.includeExamples !== false;
    const library = loadLibrary().filter((a) => a.titre && a.titre.trim());

    const libraryCards = library
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .map((a) =>
        blogCardHTML(
          a.cover && a.cover.dataUrl ? a.cover.dataUrl : "img/header-blog.svg",
          articleFilename(a),
          formatDateFr(a.date),
          a.titre.trim(),
          (a.resume || "").trim()
        )
      )
      .join("\n");

    const exampleCards = includeExamples
      ? EXAMPLE_ARTICLES.map((a) =>
          blogCardHTML(a.cover, a.filename, formatDateFr(a.date), a.titre, a.resume)
        ).join("\n")
      : "";

    const allCards = (libraryCards + "\n" + exampleCards).trim();
    const total = library.length + (includeExamples ? EXAMPLE_ARTICLES.length : 0);

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Blog – TBC</title>
  <meta name="description" content="Actualités, analyses et guides pratiques de TBC sur la cybersécurité, le cloud, le développement et les tendances IT pour les entreprises et les freelances.">
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
          <li class="nav-item"><a class="nav-link" href="recrutement.html">Recrutement</a></li>
          <li class="nav-item"><a class="nav-link active" href="blog.html">Blog</a></li>
          <li class="nav-item"><a class="nav-link" href="index.html#contact">Contact</a></li>
        </ul>
      </div>
    </div>
  </nav>

  <header class="page-header">
    <div class="container">
      <div class="row align-items-center">
        <div class="col-lg-7">
        <div class="eyebrow">Expertise et conseil en technologie de l'information</div>
        <h1>Blog</h1>
        </div>
        <div class="col-lg-5 d-none d-lg-block">
          <img class="page-header-art" src="img/header-blog.svg" alt="" width="480" height="300" aria-hidden="true">
        </div>
      </div>
    </div>
  </header>

  <section class="section">
    <div class="container">
      <!--
        Cette page est générée automatiquement par editeur-articles.html.
        Pour ajouter, modifier ou retirer un article, utilisez l'éditeur
        plutôt que de modifier ce fichier à la main : vos changements
        seraient écrasés au prochain export.
      -->
      <div class="row g-4">

${allCards}

      </div>
${total === 0 ? `      <p class="text-muted small">Aucun article pour le moment. Créez-en un avec l'éditeur d'articles.</p>\n` : ""}    </div>
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

  function buildBlogCardSnippet(filename) {
    const titre = state.titre.trim() || "Titre de l'article";
    const resume = state.resume.trim();
    const dateFr = formatDateFr(state.date);
    const coverSrc = state.cover && state.cover.dataUrl ? state.cover.dataUrl : "img/header-blog.svg";

    return `<div class="col-md-6 col-lg-4">
  <div class="blog-card">
    <img src="${coverSrc}" alt="${escapeHtml(titre)}">
    <div class="blog-body">
      <div class="blog-date">${escapeHtml(dateFr)}</div>
      <h3><a href="${escapeHtml(filename)}" class="stretched-link text-decoration-none">${escapeHtml(titre)}</a></h3>
      <p>${escapeHtml(resume)}</p>
    </div>
  </div>
</div>`;
  }

  /* ----------------------------- Rendu UI ------------------------------- */

  const blockLabels = {
    paragraph: "Paragraphe",
    heading: "Titre de section",
    image: "Photo",
    quote: "Encadré / citation",
  };

  function iconFor(type) {
    const icons = {
      paragraph: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/></svg>',
      heading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 4v16M18 4v16M6 12h12"/></svg>',
      image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4.5 18 9 13l3 3 4-5 3.5 4.5"/></svg>',
      quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h4v6H7c0 2-1 3-3 3v-2c1 0 2-.5 2-2V7z"/><path d="M15 7h4v6h-4c0 2-1 3-3 3v-2c1 0 2-.5 2-2V7z"/></svg>',
    };
    return icons[type] || "";
  }

  const blockList = document.getElementById("block-list");

  function renderBlocks() {
    blockList.innerHTML = "";
    state.blocks.forEach((block, index) => {
      const item = document.createElement("div");
      item.className = "block-item";
      item.dataset.id = block.id;

      const head = document.createElement("div");
      head.className = "block-item-head";
      head.innerHTML = `
        <span class="block-item-type">${iconFor(block.type)} ${blockLabels[block.type]}</span>
        <span class="block-item-actions">
          <button type="button" class="block-btn" data-action="up" ${index === 0 ? "disabled" : ""} aria-label="Monter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
          </button>
          <button type="button" class="block-btn" data-action="down" ${index === state.blocks.length - 1 ? "disabled" : ""} aria-label="Descendre">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <button type="button" class="block-btn danger" data-action="delete" aria-label="Supprimer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12"/></svg>
          </button>
        </span>`;

      const body = document.createElement("div");
      body.className = "block-item-body";

      if (block.type === "paragraph" || block.type === "quote") {
        const ta = document.createElement("textarea");
        ta.className = "form-control";
        ta.placeholder = block.type === "quote"
          ? "Une citation, un chiffre clé ou un rappel important…"
          : "Votre texte. Laissez une ligne vide pour créer un nouveau paragraphe.";
        ta.value = block.text || "";
        ta.addEventListener("input", () => {
          block.text = ta.value;
          saveDraft();
          schedulePreview();
        });
        body.appendChild(ta);
      } else if (block.type === "heading") {
        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "form-control";
        inp.placeholder = "Titre de cette partie";
        inp.value = block.text || "";
        inp.addEventListener("input", () => {
          block.text = inp.value;
          saveDraft();
          schedulePreview();
        });
        body.appendChild(inp);
      } else if (block.type === "image") {
        const drop = document.createElement("div");
        drop.className = "block-image-drop";
        drop.textContent = "Cliquez pour choisir une photo";
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";

        const preview = document.createElement("div");
        preview.className = "block-image-preview" + (block.dataUrl ? " has-image" : "");
        const img = document.createElement("img");
        if (block.dataUrl) img.src = block.dataUrl;
        preview.appendChild(img);

        drop.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", () => {
          const file = fileInput.files[0];
          if (!file) return;
          resizeImageFile(file, 1400).then((dataUrl) => {
            block.dataUrl = dataUrl;
            img.src = dataUrl;
            preview.classList.add("has-image");
            saveDraft();
            schedulePreview();
          }).catch(() => setStatus("Impossible de lire cette image.", "error"));
        });

        const caption = document.createElement("input");
        caption.type = "text";
        caption.className = "form-control";
        caption.placeholder = "Légende (optionnelle)";
        caption.value = block.caption || "";
        caption.style.marginTop = "0.1rem";
        caption.addEventListener("input", () => {
          block.caption = caption.value;
          saveDraft();
          schedulePreview();
        });

        body.appendChild(drop);
        body.appendChild(fileInput);
        body.appendChild(preview);
        body.appendChild(caption);
      }

      item.appendChild(head);
      item.appendChild(body);
      blockList.appendChild(item);

      head.querySelector('[data-action="up"]').addEventListener("click", () => moveBlock(index, -1));
      head.querySelector('[data-action="down"]').addEventListener("click", () => moveBlock(index, 1));
      head.querySelector('[data-action="delete"]').addEventListener("click", () => deleteBlock(index));
    });
  }

  function moveBlock(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= state.blocks.length) return;
    const tmp = state.blocks[index];
    state.blocks[index] = state.blocks[target];
    state.blocks[target] = tmp;
    saveDraft();
    renderBlocks();
    schedulePreview();
  }

  function deleteBlock(index) {
    state.blocks.splice(index, 1);
    saveDraft();
    renderBlocks();
    schedulePreview();
  }

  document.querySelectorAll(".block-add-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.add;
      const block = { id: newBlockId(), type };
      if (type === "image") { block.dataUrl = null; block.caption = ""; }
      else { block.text = ""; }
      state.blocks.push(block);
      saveDraft();
      renderBlocks();
      schedulePreview();
    });
  });

  /* ------------------------------ Aperçu -------------------------------- */

  let previewTimer = null;
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 350);
  }

  function updatePreview() {
    const frame = document.getElementById("preview-frame");
    frame.srcdoc = buildFullArticleHTML({ forPreview: true });
    const slug = slugify(state.titre);
    document.getElementById("preview-url").textContent = "article-" + slug + ".html";
  }

  /* --------------------------- Champs généraux --------------------------- */

  const fTitre = document.getElementById("f-titre");
  const fDate = document.getElementById("f-date");
  const fResume = document.getElementById("f-resume");
  const fPrev = document.getElementById("f-prev");
  const fNext = document.getElementById("f-next");
  const resumeCount = document.getElementById("resume-count");

  fTitre.value = state.titre;
  fDate.value = state.date;
  fResume.value = state.resume;
  fPrev.value = state.prevLink;
  fNext.value = state.nextLink;
  resumeCount.textContent = state.resume.length;

  fTitre.addEventListener("input", () => { state.titre = fTitre.value; saveDraft(); schedulePreview(); });
  fDate.addEventListener("input", () => { state.date = fDate.value; saveDraft(); schedulePreview(); });
  fResume.addEventListener("input", () => {
    state.resume = fResume.value;
    resumeCount.textContent = fResume.value.length;
    saveDraft();
    schedulePreview();
  });
  fPrev.addEventListener("input", () => { state.prevLink = fPrev.value; saveDraft(); schedulePreview(); });
  fNext.addEventListener("input", () => { state.nextLink = fNext.value; saveDraft(); schedulePreview(); });

  /* ------------------------- Image de couverture -------------------------- */

  const coverDrop = document.getElementById("cover-drop");
  const coverInput = document.getElementById("f-cover");
  const coverPreview = document.getElementById("cover-preview");
  const coverPreviewImg = document.getElementById("cover-preview-img");
  const coverRemove = document.getElementById("cover-remove");

  function applyCoverPreview() {
    if (state.cover && state.cover.dataUrl) {
      coverPreviewImg.src = state.cover.dataUrl;
      coverPreview.classList.add("has-image");
      coverRemove.classList.add("is-visible");
    } else {
      coverPreview.classList.remove("has-image");
      coverRemove.classList.remove("is-visible");
    }
  }
  applyCoverPreview();

  coverDrop.addEventListener("click", () => coverInput.click());
  coverDrop.addEventListener("dragover", (e) => { e.preventDefault(); coverDrop.classList.add("is-dragover"); });
  coverDrop.addEventListener("dragleave", () => coverDrop.classList.remove("is-dragover"));
  coverDrop.addEventListener("drop", (e) => {
    e.preventDefault();
    coverDrop.classList.remove("is-dragover");
    const file = e.dataTransfer.files[0];
    if (file) handleCoverFile(file);
  });
  coverInput.addEventListener("change", () => {
    const file = coverInput.files[0];
    if (file) handleCoverFile(file);
  });
  coverRemove.addEventListener("click", () => {
    state.cover = null;
    coverInput.value = "";
    applyCoverPreview();
    saveDraft();
    schedulePreview();
  });

  function handleCoverFile(file) {
    if (!/^image\//.test(file.type)) {
      setStatus("Ce fichier n'est pas une image.", "error");
      return;
    }
    resizeImageFile(file, 1600).then((dataUrl) => {
      state.cover = { dataUrl };
      applyCoverPreview();
      saveDraft();
      schedulePreview();
    }).catch(() => setStatus("Impossible de lire cette image.", "error"));
  }

  /* ------------------------------ Bibliothèque ------------------------------ */

  const libraryList = document.getElementById("library-list");
  const chkExamples = document.getElementById("chk-examples");

  function renderLibrary() {
    const list = loadLibrary();
    libraryList.innerHTML = "";

    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.className = "library-empty";
      empty.textContent = "Aucun article enregistré pour l'instant. Téléchargez un article pour qu'il apparaisse ici.";
      libraryList.appendChild(empty);
      return;
    }

    list
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .forEach((entry) => {
        const row = document.createElement("div");
        row.className = "library-item";

        const thumb = document.createElement("div");
        thumb.className = "library-item-thumb";
        if (entry.cover && entry.cover.dataUrl) {
          const img = document.createElement("img");
          img.src = entry.cover.dataUrl;
          thumb.appendChild(img);
        }

        const info = document.createElement("div");
        info.className = "library-item-info";
        const title = document.createElement("div");
        title.className = "library-item-title";
        title.textContent = entry.titre || "(sans titre)";
        const date = document.createElement("div");
        date.className = "library-item-date";
        date.textContent = formatDateFr(entry.date) + " · " + articleFilename(entry);
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
        dupBtn.title = "Dupliquer comme nouvel article";
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

        row.appendChild(thumb);
        row.appendChild(info);
        row.appendChild(actions);
        libraryList.appendChild(row);
      });
  }

  function applyStateToForm() {
    fTitre.value = state.titre;
    fDate.value = state.date;
    fResume.value = state.resume;
    fPrev.value = state.prevLink || "blog.html";
    fNext.value = state.nextLink || "blog.html";
    resumeCount.textContent = state.resume.length;
    applyCoverPreview();
    document.getElementById("snippet-box").style.display = "none";
    renderBlocks();
    schedulePreview();
  }

  function loadFromLibrary(id) {
    const entry = loadLibrary().find((a) => a.id === id);
    if (!entry) return;
    state = JSON.parse(JSON.stringify(entry));
    applyStateToForm();
    saveDraft();
    setStatus("« " + state.titre + " » chargé pour modification.", "ok");
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
    if (!window.confirm("Retirer « " + titre + " » de la bibliothèque ?\n\nLe fichier déjà déposé sur votre site ne sera pas supprimé automatiquement : pensez à le retirer aussi via votre hébergeur si besoin, puis téléchargez à nouveau blog.html.")) return;
    const list = loadLibrary().filter((a) => a.id !== id);
    saveLibrary(list);
    if (state.id === id) {
      state = defaultState();
      applyStateToForm();
      saveDraft();
    }
    renderLibrary();
    setStatus("Article retiré de la bibliothèque.", "ok");
  }

  /* -------------------------------- Actions -------------------------------- */

  document.getElementById("btn-download").addEventListener("click", () => {
    if (!state.titre.trim()) {
      setStatus("Ajoutez un titre avant de télécharger.", "error");
      fTitre.focus();
      return;
    }
    if (!state.resume.trim()) {
      setStatus("Ajoutez un résumé avant de télécharger (utilisé sur la carte du blog).", "error");
      fResume.focus();
      return;
    }
    const filename = articleFilename(state);
    downloadFile(filename, buildFullArticleHTML({ forPreview: false }));
    const savedOk = upsertCurrentIntoLibrary();
    renderLibrary();
    setStatus(
      savedOk
        ? filename + " téléchargé et ajouté à la bibliothèque."
        : filename + " téléchargé (bibliothèque non sauvegardée : stockage du navigateur plein).",
      savedOk ? "ok" : "error"
    );
  });

  document.getElementById("btn-download-blog").addEventListener("click", () => {
    const html = buildBlogHTML({ includeExamples: chkExamples.checked });
    downloadFile("blog.html", html);
    setStatus("blog.html téléchargé — à déposer à la racine du site.", "ok");
  });

  document.getElementById("btn-snippet").addEventListener("click", () => {
    if (!state.titre.trim() || !state.resume.trim()) {
      setStatus("Le titre et le résumé sont nécessaires pour la carte du blog.", "error");
      return;
    }
    const filename = articleFilename(state);
    const snippet = buildBlogCardSnippet(filename);
    const box = document.getElementById("snippet-box");
    const textarea = document.getElementById("snippet-text");
    textarea.value = snippet;
    box.style.display = "block";
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  document.getElementById("btn-copy-snippet").addEventListener("click", () => {
    const textarea = document.getElementById("snippet-text");
    textarea.select();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textarea.value).then(
        () => setStatus("Code copié dans le presse-papiers.", "ok"),
        () => fallbackCopy()
      );
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      try {
        document.execCommand("copy");
        setStatus("Code copié.", "ok");
      } catch (e) {
        setStatus("Sélectionnez le texte et copiez-le manuellement (Ctrl/Cmd+C).", "error");
      }
    }
  });

  document.getElementById("btn-new").addEventListener("click", () => {
    if (!window.confirm("Vider le formulaire pour commencer un nouvel article ?\n\n(Les articles déjà téléchargés restent dans la bibliothèque ci-dessous.)")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    applyStateToForm();
    setStatus("Formulaire vidé, prêt pour un nouvel article.", "ok");
  });

  /* --------------------------------- Départ --------------------------------- */

  renderBlocks();
  renderLibrary();
  updatePreview();
})();
