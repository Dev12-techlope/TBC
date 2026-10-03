/* ==========================================================================
   TBC — Interactions
   ========================================================================== */

/* ============================================================================
   ADRESSE DE RÉCEPTION DES FORMULAIRES DU SITE
   ============================================================================
   Cette seule ligne contrôle où partent TOUS les messages envoyés depuis :
     - le formulaire de contact (page d'accueil)
     - les formulaires d'inscription aux formations (page Formation)
     - les formulaires de candidature avec CV (page Recrutement)

   Remplacez l'adresse ci-dessous par votre adresse professionnelle,
   puis enregistrez le fichier. Rien d'autre à modifier dans ce fichier.
   ============================================================================ */
const TBC_CONTACT_EMAIL = "contact@it-tbc.com";

/* ============================================================================
   FORMULAIRE DE CONTACT — clé Web3Forms
   ============================================================================
   Le formulaire de contact (page d'accueil) envoie ses messages via
   Web3Forms, un service différent de FormSubmit, sans passer par la
   messagerie du visiteur. Il faut une clé d'accès gratuite, propre à
   contact@it-tbc.com, à récupérer une seule fois :

     1. Allez sur https://web3forms.com
     2. Entrez contact@it-tbc.com puis cliquez sur "Create Access Key"
     3. Ouvrez l'e-mail reçu, copiez la clé (elle ressemble à
        "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
     4. Collez-la ci-dessous, entre les guillemets, à la place du texte
        REMPLACEZ_PAR_VOTRE_CLE

   Tant que la clé n'est pas renseignée, le formulaire affiche un message
   d'erreur au lieu d'essayer d'envoyer — pas de risque d'échec silencieux.
   ============================================================================ */
const WEB3FORMS_ACCESS_KEY = "8e61cc61-a383-4d4d-b7b3-5d9b8f2eeb46";

document.addEventListener("DOMContentLoaded", function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Barre de navigation : état compact au défilement ---------- */
  const navbar = document.querySelector(".navbar-tbc");
  if (navbar) {
    const setStuck = () => navbar.classList.toggle("is-stuck", window.scrollY > 24);
    setStuck();
    window.addEventListener("scroll", setStuck, { passive: true });
  }

  /* ---------- Fermeture du menu mobile après un clic ---------- */
  const navMenu = document.getElementById("navMenu");
  if (navMenu) {
    navMenu.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        if (navMenu.classList.contains("show") && window.bootstrap) {
          bootstrap.Collapse.getOrCreateInstance(navMenu).hide();
        }
      });
    });
  }

  /* ---------- Progression de lecture ---------- */
  const progress = document.querySelector(".read-progress");
  if (progress) {
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = h > 0 ? (window.scrollY / h) * 100 + "%" : "0%";
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* ---------- Bouton retour en haut ---------- */
  const toTop = document.querySelector(".to-top");
  if (toTop) {
    const toggle = () => toTop.classList.toggle("is-visible", window.scrollY > 600);
    toggle();
    window.addEventListener("scroll", toggle, { passive: true });
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- Révélation des blocs au défilement ---------- */
  const revealTargets = document.querySelectorAll(
    ".section > .container > *, .metrics .metric"
  );

  if (!reduceMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (!entry.isIntersecting) return;
          const delay = Math.min(i * 70, 280);
          setTimeout(() => entry.target.classList.add("is-visible"), delay);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    revealTargets.forEach((el) => {
      el.classList.add("reveal");
      observer.observe(el);
    });
  }

  /* ---------- Compteurs du bandeau chiffres ---------- */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = Number(el.dataset.count);
          const suffix = el.dataset.suffix || "";

          if (reduceMotion) {
            el.textContent = target + suffix;
          } else {
            const duration = 1400;
            const start = performance.now();
            const tick = (now) => {
              const p = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - p, 3);
              el.textContent = Math.round(target * eased) + suffix;
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
          countObserver.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => countObserver.observe(el));
  }

  /* ---------- Hero : rail de phases (texte + illustration + progression) ---------- */
  const nodes = document.querySelectorAll("#pipeline .pipeline-node");
  const fill = document.getElementById("pipeline-fill");
  const stageCopies = document.querySelectorAll(".stage-copy");
  const illustrations = document.querySelectorAll("#hero-visual .hero-illustration");
  const watermark = document.getElementById("stage-watermark");

  if (nodes.length) {
    let current = 0;
    let timer = null;
    const total = nodes.length;
    const AUTOPLAY_DELAY = 5200;

    function goTo(index) {
      current = index;
      nodes.forEach((n) => n.classList.toggle("active", Number(n.dataset.index) === index));
      stageCopies.forEach((c) => c.classList.toggle("active", Number(c.dataset.index) === index));
      illustrations.forEach((i) => i.classList.toggle("active", Number(i.dataset.index) === index));
      if (fill) fill.style.width = ((index + 1) / total) * 100 + "%";
      if (watermark) watermark.textContent = String(index + 1).padStart(2, "0");
    }

    function next() { goTo((current + 1) % total); }
    function startAutoplay() { if (!reduceMotion) timer = setInterval(next, AUTOPLAY_DELAY); }
    function resetAutoplay() { clearInterval(timer); startAutoplay(); }

    nodes.forEach((node) => {
      node.addEventListener("click", () => {
        goTo(Number(node.dataset.index));
        resetAutoplay();
      });
    });

    const pipeline = document.getElementById("pipeline");
    if (pipeline) {
      pipeline.addEventListener("mouseenter", () => clearInterval(timer));
      pipeline.addEventListener("mouseleave", resetAutoplay);
    }

    goTo(0);
    startAutoplay();
  }

  /* ---------- Panneau du hero : léger effet de parallaxe à la souris ---------- */
  const frame = document.getElementById("hero-visual");
  if (frame && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    const stage = frame.closest(".hero-stage-visual") || frame.parentElement;
    stage.addEventListener("mousemove", (e) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      frame.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    });
    stage.addEventListener("mouseleave", () => { frame.style.transform = ""; });
  }

  /* ---------- Expertise : le visuel suit l'onglet ouvert ---------- */
  const expertiseAccordion = document.getElementById("expertiseAccordion");
  const expertiseImages = document.querySelectorAll("#expertise-visual img");
  if (expertiseAccordion && expertiseImages.length) {
    const panels = Array.from(expertiseAccordion.querySelectorAll(".accordion-collapse"));
    expertiseAccordion.addEventListener("show.bs.collapse", function (e) {
      const index = panels.indexOf(e.target);
      if (index === -1) return;
      expertiseImages.forEach((img, i) => img.classList.toggle("active", i === index));
    });
  }

  /* ==========================================================================
     ENVOI DES FORMULAIRES
     ==========================================================================
     - Formulaires d'inscription (formation) : envoi automatique et silencieux
       via FormSubmit.co, en AJAX (aucun fichier joint, donc l'AJAX suffit).
     - Formulaires de candidature (recrutement, avec CV) : envoi automatique
       via FormSubmit.co aussi, mais via un vrai POST de formulaire (à travers
       un iframe caché) et non en AJAX. C'est nécessaire pour que la pièce
       jointe (le CV) soit bien transmise : le point d'entrée AJAX de
       FormSubmit ignore les pièces jointes, seul un envoi de formulaire
       classique les relaie correctement.
     - Formulaire de contact (page d'accueil) : n'utilise PAS FormSubmit.
       Il ouvre la messagerie du visiteur (mailto), pré-remplie, comme avant.

     Dans tous les cas, la destination est TBC_CONTACT_EMAIL, définie tout en
     haut de ce fichier.

     IMPORTANT (formulaires FormSubmit uniquement) — étape unique à faire une
     seule fois : la toute première fois qu'un formulaire est envoyé vers une
     nouvelle adresse, FormSubmit envoie un e-mail de confirmation à cette
     adresse avec un lien à cliquer. Tant que ce lien n'est pas cliqué, les
     messages suivants ne sont pas délivrés. Il suffit de le faire une fois.
     ========================================================================== */

  function submitFormViaAjax(form, feedback, extraFields, successMessage) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const data = new FormData(form);

    Object.keys(extraFields || {}).forEach((key) => data.append(key, extraFields[key]));
    data.append("_template", "table");
    data.append("_captcha", "false");

    if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.originalText = submitBtn.textContent; submitBtn.textContent = "Envoi en cours…"; }

    fetch(`https://formsubmit.co/ajax/${encodeURIComponent(TBC_CONTACT_EMAIL)}`, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Réponse serveur invalide");
        if (feedback) {
          feedback.classList.remove("d-none", "alert-danger");
          feedback.classList.add("alert-success");
          feedback.textContent = successMessage;
        }
        form.reset();
      })
      .catch(() => {
        if (feedback) {
          feedback.classList.remove("d-none", "alert-success");
          feedback.classList.add("alert-danger");
          feedback.textContent =
            "L'envoi a échoué (connexion internet ou service momentanément indisponible). " +
            "Vous pouvez réessayer, ou nous écrire directement à " + TBC_CONTACT_EMAIL + ".";
        }
      })
      .finally(() => {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
      });
  }

  /* ---------- Formulaires d'inscription par formation (AJAX, sans pièce jointe) ---------- */
  document.querySelectorAll(".inscription-form").forEach((form) => {
    const feedback = form.querySelector(".enroll-feedback");

    // Message d'erreur en français, propre à chaque formation, quand le
    // nombre de participants saisi est inférieur au minimum requis
    // (50 pour la Sécurité informatique, 10 pour les autres formations).
    const participantsInput = form.querySelector('input[name="participants"]');
    if (participantsInput && participantsInput.dataset.minMessage) {
      const checkParticipantsValidity = () => {
        participantsInput.setCustomValidity(
          participantsInput.validity.rangeUnderflow ? participantsInput.dataset.minMessage : ""
        );
      };
      participantsInput.addEventListener("input", checkParticipantsValidity);
      participantsInput.addEventListener("invalid", checkParticipantsValidity);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const formationLabel = form.dataset.formation || "Formation TBC";
      const moduleChecked = form.querySelector('input[name="module"]:checked');

      submitFormViaAjax(
        form,
        feedback,
        {
          _subject: `Inscription formation – ${formationLabel}`,
          Formation: formationLabel,
          "Module souhaité": moduleChecked ? moduleChecked.value : "—",
        },
        "Votre demande a bien été envoyée à " + TBC_CONTACT_EMAIL + ". Nous revenons vers vous rapidement."
      );
    });
  });

  /* ---------- Formulaires de candidature (recrutement, avec CV) ----------
     Envoi via un vrai POST de formulaire ciblant un iframe caché, pour que
     FormSubmit reçoive et relaie correctement la pièce jointe. */
  const applicationForms = document.querySelectorAll(".application-form");
  if (applicationForms.length) {
    let targetFrame = document.getElementById("formsubmit-target-frame");
    if (!targetFrame) {
      targetFrame = document.createElement("iframe");
      targetFrame.id = "formsubmit-target-frame";
      targetFrame.name = "formsubmit-target-frame";
      targetFrame.style.display = "none";
      targetFrame.setAttribute("aria-hidden", "true");
      document.body.appendChild(targetFrame);
    }

    function ensureHiddenField(form, name, value) {
      let el = form.querySelector('input[name="' + name + '"]');
      if (!el) {
        el = document.createElement("input");
        el.type = "hidden";
        el.name = name;
        form.appendChild(el);
      }
      el.value = value;
    }

    applicationForms.forEach((form) => {
      const feedback = form.querySelector(".enroll-feedback");
      const fileInput = form.querySelector('input[type="file"]');
      const submitBtn = form.querySelector('button[type="submit"]');

      // Configuration du formulaire pour un vrai POST multipart vers FormSubmit,
      // livré dans l'iframe caché (le visiteur ne quitte jamais la page).
      form.setAttribute("action", "https://formsubmit.co/" + encodeURIComponent(TBC_CONTACT_EMAIL));
      form.setAttribute("method", "POST");
      form.setAttribute("enctype", "multipart/form-data");
      form.setAttribute("target", "formsubmit-target-frame");

      form.addEventListener("submit", function (e) {
        if (!form.checkValidity()) {
          e.preventDefault();
          form.reportValidity();
          return;
        }

        const file = fileInput && fileInput.files && fileInput.files[0];

        if (file) {
          const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
          if (!isPdf) {
            e.preventDefault();
            if (feedback) {
              feedback.classList.remove("d-none", "alert-success");
              feedback.classList.add("alert-danger");
              feedback.textContent = "Merci de joindre votre CV au format PDF uniquement.";
            }
            return;
          }
          if (file.size > 8 * 1024 * 1024) {
            e.preventDefault();
            if (feedback) {
              feedback.classList.remove("d-none", "alert-success");
              feedback.classList.add("alert-danger");
              feedback.textContent = "Le fichier dépasse 8 Mo : merci de réduire sa taille avant de l'envoyer.";
            }
            return;
          }
        }

        const poste = form.dataset.poste || "Candidature spontanée";
        ensureHiddenField(form, "_subject", `Candidature – ${poste}`);
        ensureHiddenField(form, "_template", "table");
        ensureHiddenField(form, "_captcha", "false");
        ensureHiddenField(form, "Offre", poste);

        // Le formulaire part réellement ici (pas de preventDefault) : le
        // navigateur POST vers FormSubmit et charge la réponse dans l'iframe
        // caché, sans jamais quitter la page visible.
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.dataset.originalText = submitBtn.textContent;
          submitBtn.textContent = "Envoi en cours…";
        }

        let done = false;
        const finish = (success) => {
          if (done) return;
          done = true;
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
          if (feedback) {
            feedback.classList.remove("d-none", "alert-success", "alert-danger");
            if (success) {
              feedback.classList.add("alert-success");
              feedback.textContent =
                "Votre candidature" + (file ? " et votre CV ont" : " a") +
                " bien été envoyés à " + TBC_CONTACT_EMAIL + ".";
              form.reset();
            } else {
              feedback.classList.add("alert-danger");
              feedback.textContent =
                "L'envoi semble avoir pris trop de temps (connexion lente ou service momentanément " +
                "indisponible). Si vous ne recevez pas de confirmation, écrivez-nous directement à " +
                TBC_CONTACT_EMAIL + ".";
            }
          }
        };

        targetFrame.addEventListener("load", function onLoad() {
          targetFrame.removeEventListener("load", onLoad);
          finish(true);
        });
        // Filet de sécurité si l'iframe ne déclenche jamais son évènement "load"
        setTimeout(() => finish(false), 15000);
      });
    });
  }

  /* ---------- Formulaire de contact (page d'accueil) ----------
     Envoi automatique et silencieux via Web3Forms (pas FormSubmit, et pas
     de messagerie à ouvrir : le visiteur reste sur la page). */
  const form = document.getElementById("contact-form");
  if (form) {
    const feedback = document.getElementById("contact-feedback");
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (!WEB3FORMS_ACCESS_KEY || WEB3FORMS_ACCESS_KEY === "REMPLACEZ_PAR_VOTRE_CLE") {
        feedback.classList.remove("d-none", "alert-success");
        feedback.classList.add("alert-danger");
        feedback.textContent =
          "Le formulaire n'est pas encore configuré (clé Web3Forms manquante dans js/main.js). " +
          "En attendant, écrivez-nous directement à " + TBC_CONTACT_EMAIL + ".";
        return;
      }

      const nom = document.getElementById("nom").value.trim();
      const email = document.getElementById("email").value.trim();
      const telephone = document.getElementById("telephone").value.trim();
      const objet = document.getElementById("objet").value.trim();
      const message = document.getElementById("message").value.trim();

      const payload = {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `Contact site TBC${objet ? " – " + objet : ""}`,
        from_name: "Formulaire de contact — site TBC",
        Nom: nom,
        "E-mail": email,
        Téléphone: telephone || "—",
        Objet: objet || "—",
        Message: message,
        replyto: email,
      };

      if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.originalText = submitBtn.textContent; submitBtn.textContent = "Envoi en cours…"; }

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          if (!ok || !data.success) throw new Error(data && data.message ? data.message : "Échec de l'envoi");
          feedback.classList.remove("d-none", "alert-danger");
          feedback.classList.add("alert-success");
          feedback.textContent =
            "Votre message a bien été envoyé à " + TBC_CONTACT_EMAIL + ". Nous revenons vers vous rapidement.";
          form.reset();
        })
        .catch(() => {
          feedback.classList.remove("d-none", "alert-success");
          feedback.classList.add("alert-danger");
          feedback.textContent =
            "L'envoi a échoué (connexion internet ou service momentanément indisponible). " +
            "Vous pouvez réessayer, ou nous écrire directement à " + TBC_CONTACT_EMAIL + ".";
        })
        .finally(() => {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
        });
    });
  }

  /* ---------- Recrutement : filtres ---------- */
  const jobList = document.getElementById("job-list");
  if (jobList) {
    const keywordInput = document.getElementById("job-keyword");
    const locationInput = document.getElementById("job-location");
    const typeChecks = document.querySelectorAll(".job-type-filter");

    function applyFilters() {
      const keyword = keywordInput.value.trim().toLowerCase();
      const location = locationInput.value.trim().toLowerCase();
      const activeTypes = Array.from(typeChecks).filter((c) => c.checked).map((c) => c.value);

      document.querySelectorAll(".job-card").forEach((card) => {
        const title = card.dataset.title.toLowerCase();
        const loc = card.dataset.location.toLowerCase();
        const type = card.dataset.type;

        const matchKeyword = !keyword || title.includes(keyword);
        const matchLocation = !location || loc.includes(location);
        const matchType = activeTypes.length === 0 || activeTypes.includes(type);

        card.style.display = matchKeyword && matchLocation && matchType ? "" : "none";
      });
    }

    keywordInput.addEventListener("input", applyFilters);
    locationInput.addEventListener("input", applyFilters);
    typeChecks.forEach((c) => c.addEventListener("change", applyFilters));
  }
});
