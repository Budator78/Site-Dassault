/* ==========================================================================
   Fonctions du site : thème clair/sombre, recherche, comparateur,
   et quelques secrets (code Konami, tonneau).
   ========================================================================== */
(() => {
  const PRODUITS = window.PRODUITS || [];
  const parId = new Map(PRODUITS.map((p) => [p.id, p]));
  const racine = (document.querySelector(".cart-link")?.getAttribute("href") || "Panier.html").replace("Panier.html", "");
  const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  const lire = (cle, defaut) => {
    try {
      return JSON.parse(localStorage.getItem(cle)) ?? defaut;
    } catch {
      return defaut;
    }
  };
  const ecrire = (cle, valeur) => {
    try {
      localStorage.setItem(cle, JSON.stringify(valeur));
    } catch {
      /* stockage indisponible */
    }
  };
  const notifier = (html) => (window.notifier ? window.notifier(html) : null);
  const echapper = (t) => {
    const d = document.createElement("div");
    d.textContent = t ?? "";
    return d.innerHTML;
  };
  const normaliser = (t) =>
    (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9-]+/g, " ").trim(); // on garde « air-air » entier

  /* Vignette d'un produit : photo pour les avions, dessin SVG pour les missiles */
  const visuel = (p, classe = "media") =>
    p.svg
      ? `<div class="${classe} media-drawing">${p.svg}</div>`
      : `<div class="${classe}"><span class="media-missing">Photo à ajouter</span>` +
        `<div class="media-photo" style="background-image: url('${racine}${p.img}')"></div></div>`;

  /* ---------- Thème clair / sombre ---------- */
  const boutonTheme = document.querySelector("[data-theme-toggle]");
  if (boutonTheme) {
    boutonTheme.hidden = false;
    const sombreSysteme = window.matchMedia("(prefers-color-scheme: dark)");
    const themeActuel = () => document.documentElement.dataset.theme || (sombreSysteme.matches ? "dark" : "light");
    boutonTheme.addEventListener("click", () => {
      const nouveau = themeActuel() === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = nouveau;
      try {
        localStorage.setItem("dassault-theme", nouveau);
      } catch {
        /* rien */
      }
    });
  }

  /* ---------- Recherche ---------- */
  const index = PRODUITS.map((p) => ({
    p,
    nom: normaliser(p.name),
    mots: normaliser([p.name, p.role, p.maker, p.keywords, p.text, p.cond, ...p.mini.map((m) => m.join(" "))].join(" ")).split(" "),
  }));
  /* Chaque mot cherché doit commencer un mot du produit (« air » ne trouve pas « affaires ») */
  const correspond = (e, m) => e.mots.some((w) => w.startsWith(m));
  const TONNEAU = ["tonneau", "barrel roll", "do a barrel roll", "fais un tonneau", "faire un tonneau"];
  let fenetreRecherche;

  function chercher(requete) {
    const q = normaliser(requete);
    if (!q) return PRODUITS.slice(0, 6);
    const mots = q.split(" ");
    return index
      .filter((e) => mots.every((m) => correspond(e, m)))
      .map((e) => ({ p: e.p, score: (e.nom.startsWith(q) ? 3 : 0) + (e.nom.includes(q) ? 2 : 0) + (mots.every((m) => e.nom.includes(m)) ? 1 : 0) }))
      .sort((a, b) => b.score - a.score)
      .map((e) => e.p)
      .slice(0, 8);
  }

  function ouvrirRecherche() {
    if (!fenetreRecherche) {
      fenetreRecherche = document.createElement("dialog");
      fenetreRecherche.className = "search";
      fenetreRecherche.setAttribute("aria-label", "Rechercher un produit");
      fenetreRecherche.innerHTML = `
        <div class="search-field">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>
          <input type="search" placeholder="Rafale, missile air-air, Falcon…" aria-label="Rechercher" autocomplete="off" data-search-input />
          <kbd>Échap</kbd>
        </div>
        <ul class="search-results" role="listbox" data-search-results></ul>
        <p class="search-hint">↑ ↓ pour naviguer · Entrée pour ouvrir · Astuce : essayez « tonneau »</p>`;
      document.body.append(fenetreRecherche);
      fenetreRecherche.addEventListener("click", (e) => {
        if (e.target === fenetreRecherche) fenetreRecherche.close();
      });
      const champ = fenetreRecherche.querySelector("[data-search-input]");
      champ.addEventListener("input", () => afficherResultats(champ.value));
      champ.addEventListener("keydown", naviguer);
    }
    const champ = fenetreRecherche.querySelector("[data-search-input]");
    champ.value = "";
    afficherResultats("");
    fenetreRecherche.showModal();
    champ.focus();
  }

  function afficherResultats(requete) {
    const liste = fenetreRecherche.querySelector("[data-search-results]");
    if (TONNEAU.includes(normaliser(requete))) {
      liste.innerHTML = `<li class="search-empty">✈ Accrochez-vous…</li>`;
      setTimeout(() => {
        fenetreRecherche.close();
        faireUnTonneau();
      }, 350);
      return;
    }
    const resultats = chercher(requete);
    if (!resultats.length) {
      liste.innerHTML = `<li class="search-empty">Aucun résultat. Même nos radars ne trouvent rien.</li>`;
      return;
    }
    liste.innerHTML = resultats
      .map(
        (p, i) => `<li><a href="${racine}${p.href}" role="option" aria-selected="${i === 0}">
          <span class="search-thumb${p.svg ? " drawing" : ""}"${p.img ? ` style="background-image: url('${racine}${p.img}')"` : ""}>${p.svg || ""}</span>
          <span><strong>${echapper(p.name)}</strong><small>${echapper(p.role)} · ${echapper(p.cond)}</small></span>
          <span class="search-price">${p.price ? euros.format(p.price) : "Indisponible"}</span></a></li>`,
      )
      .join("");
  }

  function naviguer(e) {
    const liens = [...fenetreRecherche.querySelectorAll(".search-results a")];
    if (!liens.length) return;
    let i = liens.findIndex((a) => a.getAttribute("aria-selected") === "true");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      i = (i + (e.key === "ArrowDown" ? 1 : -1) + liens.length) % liens.length;
      liens.forEach((a, j) => a.setAttribute("aria-selected", String(j === i)));
      liens[i].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      window.location.href = liens[Math.max(i, 0)].href;
    }
  }

  document.querySelectorAll("[data-search-open]").forEach((b) => {
    b.hidden = false;
    b.addEventListener("click", ouvrirRecherche);
  });

  document.addEventListener("keydown", (e) => {
    const cible = e.target;
    const saisie = cible.closest?.("input, textarea, select, [contenteditable]");
    if ((e.key === "/" && !saisie) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
      if (document.querySelector("dialog[open]")) return;
      e.preventDefault();
      ouvrirRecherche();
    }
  });

  function faireUnTonneau() {
    const page = document.body;
    page.classList.remove("tonneau");
    void page.offsetWidth; // relance l'animation
    page.classList.add("tonneau");
    page.addEventListener("animationend", () => page.classList.remove("tonneau"), { once: true });
  }

  /* ---------- Comparateur ---------- */
  const CLE_COMP = "dassault-comparer";
  const MAX_COMP = 3;
  let selection = lire(CLE_COMP, []).filter((id) => parId.has(id));

  function enregistrerSelection() {
    ecrire(CLE_COMP, selection);
    majBoutonsComparer();
    majBarre();
    if (pageComparer) afficherComparaison();
  }

  function basculer(id) {
    if (selection.includes(id)) {
      selection = selection.filter((x) => x !== id);
    } else if (selection.length >= MAX_COMP) {
      notifier(`Trois articles maximum dans le comparateur. <a href="${racine}Recherche.html#comparer">Voir la comparaison</a>`);
      return;
    } else {
      selection = [...selection, id];
    }
    enregistrerSelection();
  }

  document.querySelectorAll("[data-compare-id]").forEach((carte) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "compare-toggle";
    bouton.dataset.compareToggle = carte.dataset.compareId;
    bouton.addEventListener("click", () => basculer(carte.dataset.compareId));
    (carte.querySelector(".mcard-reveal") || carte).append(bouton);
  });

  function majBoutonsComparer() {
    document.querySelectorAll("[data-compare-toggle]").forEach((b) => {
      const actif = selection.includes(b.dataset.compareToggle);
      b.setAttribute("aria-pressed", String(actif));
      b.textContent = actif ? "✓ Comparé" : "+ Comparer";
    });
  }

  const pageComparer = document.querySelector("[data-compare]");
  let barre;

  function majBarre() {
    if (pageComparer) return; // la page Comparatif affiche déjà la comparaison
    if (!barre) {
      barre = document.createElement("div");
      barre.className = "compare-bar";
      barre.setAttribute("role", "region");
      barre.setAttribute("aria-label", "Comparateur");
      document.body.append(barre);
    }
    barre.hidden = selection.length === 0;
    barre.innerHTML = `<p><strong>Comparer (${selection.length}/${MAX_COMP})</strong> : ${selection
      .map((id) => echapper(parId.get(id).name))
      .join(", ")}</p>
      <a class="btn" href="${racine}Recherche.html#comparer">Voir la comparaison</a>
      <button class="link-button" type="button" data-compare-clear>Vider</button>`;
    barre.querySelector("[data-compare-clear]").addEventListener("click", () => {
      selection = [];
      enregistrerSelection();
    });
  }

  function afficherComparaison() {
    const zone = pageComparer.querySelector("[data-compare-pickers]");
    const grille = pageComparer.querySelector("[data-compare-grid]");
    const options = (choisi) =>
      `<option value="">— Choisir un article —</option>` +
      [
        ["avion", "Avions"],
        ["missile", "Missiles"],
      ]
        .map(
          ([type, label]) =>
            `<optgroup label="${label}">${PRODUITS.filter((p) => p.type === type)
              .map((p) => `<option value="${p.id}"${p.id === choisi ? " selected" : ""}>${echapper(p.name)}</option>`)
              .join("")}</optgroup>`,
        )
        .join("");
    zone.innerHTML = [0, 1, 2]
      .map((i) => `<label><span class="sr-only">Article ${i + 1}</span><select data-slot="${i}">${options(selection[i])}</select></label>`)
      .join("");
    zone.querySelectorAll("select").forEach((s) =>
      s.addEventListener("change", () => {
        const choix = [...zone.querySelectorAll("select")].map((x) => x.value).filter(Boolean);
        selection = [...new Set(choix)];
        enregistrerSelection();
      }),
    );

    const choisis = selection.map((id) => parId.get(id));
    const cles = [];
    choisis.forEach((p) => p.specs.forEach(([k]) => !cles.includes(k) && cles.push(k)));
    const prixMin = Math.min(...choisis.filter((p) => p.price).map((p) => p.price));
    const noteMax = Math.max(...choisis.map((p) => p.rating));

    grille.innerHTML = [0, 1, 2]
      .map((i) => {
        const p = choisis[i];
        if (!p) return `<div class="compare-col vide"><p>Emplacement libre<br />Choisissez un article ci-dessus.</p></div>`;
        const valeur = (k) => (p.specs.find(([cle]) => cle === k) || [, "—"])[1];
        const meilleur = (cond) => (cond && choisis.length > 1 ? ' class="meilleur"' : "");
        return `<article class="compare-col">
          ${visuel(p)}
          <div class="compare-body">
            <div class="tags"><span class="tag">${echapper(p.role)}</span></div>
            <h3><a href="${racine}${p.href}">${echapper(p.name)}</a></h3>
            <dl class="compare-rows">
              <div${meilleur(p.price && p.price === prixMin)}><dt>Prix</dt><dd>${p.price ? euros.format(p.price) : "Indisponible"}</dd></div>
              <div><dt>État</dt><dd>${echapper(p.cond)}</dd></div>
              <div${meilleur(p.reviews && p.rating === noteMax)}><dt>Note</dt><dd>${p.reviews ? `${String(p.rating).replace(".", ",")} / 5` : "—"}</dd></div>
              ${cles.map((k) => `<div><dt>${echapper(k)}</dt><dd>${echapper(valeur(k))}</dd></div>`).join("")}
            </dl>
          </div>
        </article>`;
      })
      .join("");
  }

  if (pageComparer) {
    pageComparer.hidden = false;
    afficherComparaison();
    if (location.hash === "#comparer") pageComparer.scrollIntoView();
  }
  majBoutonsComparer();
  majBarre();

  /* ---------- Code Konami : la Patrouille de France ---------- */
  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let progression = 0;
  document.addEventListener("keydown", (e) => {
    const touche = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    progression = touche === KONAMI[progression] ? progression + 1 : touche === KONAMI[0] ? 1 : 0;
    if (progression === KONAMI.length) {
      progression = 0;
      patrouille();
    }
  });

  const JET = `<svg viewBox="0 0 54 22" aria-hidden="true">
    <path d="M52 11 L40 8.5 L30 8 L22 1 L18 1 L22 8 L8 8.5 L4 4 L1 4 L3 11 L1 18 L4 18 L8 13.5 L22 14 L18 21 L22 21 L30 14 L40 13.5 Z" fill="#e8edf2" stroke="#1d2a3a" stroke-width="0.8"/>
    <path d="M22 8 L30 8 L30 14 L22 14 Z" fill="#1f5fd1"/>
    <path d="M30 8 L36 8.3 L36 13.7 L30 14 Z" fill="#d1343f"/>
    <ellipse cx="44" cy="11" rx="4" ry="1.6" fill="#3a5a7a"/></svg>`;

  function patrouille() {
    if (document.querySelector(".patrouille")) return;
    const positions = [
      [360, 115], [305, 80], [305, 150], [250, 45], [250, 185], [195, 10], [195, 220], [250, 115],
    ];
    const couleur = (y) => (y < 90 ? "bleu" : y > 140 ? "rouge" : "blanc");
    const scene = document.createElement("div");
    scene.className = "patrouille";
    scene.setAttribute("aria-hidden", "true");
    scene.innerHTML = `<div class="patrouille-formation">${positions
      .map(([x, y]) => `<div class="jet" style="left:${x}px;top:${y}px"><span class="fumee ${couleur(y)}"></span>${JET}</div>`)
      .join("")}</div>`;
    document.body.append(scene);
    setTimeout(() => scene.remove(), 6000);
    notifier("🇫🇷 La Patrouille de France vous salue ! Code promo débloqué : <strong>PATROUILLE</strong> (−20 %)");
  }
})();
