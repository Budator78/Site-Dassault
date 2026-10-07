/* ==========================================================================
   Panier — enregistré dans le navigateur (localStorage), partagé entre pages.
   Le reste du site fonctionne sans JavaScript.
   ========================================================================== */

const CLE_PANIER = "dassault-panier";
const formatEuro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function lirePanier() {
  try {
    return JSON.parse(localStorage.getItem(CLE_PANIER)) || [];
  } catch {
    return [];
  }
}

function enregistrerPanier(articles) {
  try {
    localStorage.setItem(CLE_PANIER, JSON.stringify(articles));
  } catch {
    /* stockage indisponible (navigation privée…) : on ignore */
  }
  majCompteur(articles);
}

function totalLigne(article) {
  const options = article.options.reduce((somme, o) => somme + o.price, 0);
  return article.unit * article.qty + options;
}

function echapper(texte) {
  const div = document.createElement("div");
  div.textContent = texte;
  return div.innerHTML;
}

/* Pastille du nombre d'articles dans l'en-tête */
function majCompteur(articles = lirePanier()) {
  const nombre = articles.reduce((somme, a) => somme + a.qty, 0);
  document.querySelectorAll("[data-cart-count]").forEach((pastille) => {
    pastille.textContent = nombre;
    pastille.hidden = nombre === 0;
  });
}

/* Chemin vers la racine du site (les fiches sont dans un sous-dossier) */
const racine = (document.querySelector(".cart-link")?.getAttribute("href") || "Panier.html").replace("Panier.html", "");

function lireQuantite(champ) {
  const n = Math.round(Number(champ.value));
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 999) : 1;
}

function ajouterAuPanier(article) {
  enregistrerPanier([...lirePanier(), article]);
  afficherNotification(`✓ ${article.qty} × ${echapper(article.name)} ajouté au panier. <a href="${racine}Panier.html">Voir le panier</a>`);
}

/* Petite notification en bas de l'écran */
function afficherNotification(html) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("p");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.append(toast);
  }
  toast.innerHTML = html;
  toast.classList.add("is-visible");
  clearTimeout(afficherNotification.minuteur);
  afficherNotification.minuteur = setTimeout(() => toast.classList.remove("is-visible"), 4000);
}

window.notifier = afficherNotification;

/* ---------- Codes promo ---------- */
const CLE_PROMO = "dassault-promo";
const CODES = {
  ESCADRON: { taux: 0.1, min: 12, texte: "−10 % dès 12 articles" },
  DEFILE14JUILLET: { taux: 0.14, texte: "−14 %, comme le 14 juillet" },
  MACH2: { taux: 0.02, texte: "−2 %, comme Mach 2" },
  PATROUILLE: { taux: 0.2, texte: "−20 %, avec les compliments de la Patrouille de France" },
  LIVREUR: { taux: 0.15, texte: "−15 % pour les as de la livraison" },
};

function lireCode() {
  try {
    return localStorage.getItem(CLE_PROMO) || "";
  } catch {
    return "";
  }
}

/* Sous-total, remise éventuelle et total à payer */
function calculer(articles) {
  const sousTotal = articles.reduce((somme, a) => somme + totalLigne(a), 0);
  const nombre = articles.reduce((somme, a) => somme + a.qty, 0);
  const code = lireCode();
  const regle = CODES[code];
  const valide = regle && nombre >= (regle.min || 0);
  const remise = valide ? Math.round(sousTotal * regle.taux) : 0;
  return { sousTotal, nombre, code, regle, valide, remise, total: sousTotal - remise };
}

/* ---------- Cartes (accueil, listes) : ajout rapide ---------- */
document.querySelectorAll("[data-quick]").forEach((carte) => {
  const boite = carte.querySelector("[data-quick-box]");
  const champ = carte.querySelector("[data-quick-qty]");
  boite.hidden = false;

  carte.querySelector("[data-quick-add]").addEventListener("click", () => {
    champ.value = lireQuantite(champ);
    ajouterAuPanier({
      id: carte.dataset.id,
      name: carte.dataset.name,
      href: carte.dataset.href,
      img: carte.dataset.img,
      version: carte.dataset.version,
      unit: Number(carte.dataset.price),
      qty: lireQuantite(champ),
      options: [],
    });
  });
});

/* ---------- Fiches produit : quantité exacte et « Ajouter au panier » ---------- */
document.querySelectorAll("[data-buy]").forEach((encart) => {
  const bouton = encart.querySelector("[data-add-to-cart]");
  const champ = encart.querySelector("[data-qty-input]");
  const raccourcis = [...encart.querySelectorAll('input[name="quantite"]')];
  bouton.hidden = false;
  encart.querySelector("[data-qty-exact]").hidden = false;

  /* Avec JS, le total est calculé ici (la version CSS ne gère que 1, 2, 6 et 12) */
  encart.classList.add("js-calc");

  const options = () =>
    [...encart.querySelectorAll('input[type="checkbox"]:checked')].map((o) => ({
      label: o.dataset.label,
      price: Number(o.dataset.price),
    }));

  const recalculer = () => {
    const version = encart.querySelector('input[name="version"]:checked');
    const total = Number(version.dataset.price) * lireQuantite(champ) + options().reduce((s, o) => s + o.price, 0);
    encart.querySelectorAll(".total").forEach((el) => {
      el.textContent = formatEuro.format(total);
    });
  };

  raccourcis.forEach((radio) =>
    radio.addEventListener("change", () => {
      champ.value = radio.dataset.qty;
      recalculer();
    }),
  );

  champ.addEventListener("input", () => {
    const n = lireQuantite(champ);
    raccourcis.forEach((radio) => {
      radio.checked = Number(radio.dataset.qty) === n;
    });
    recalculer();
  });
  champ.addEventListener("change", () => {
    champ.value = lireQuantite(champ);
  });

  encart.addEventListener("change", recalculer);
  recalculer();

  bouton.addEventListener("click", () => {
    const version = encart.querySelector('input[name="version"]:checked');
    champ.value = lireQuantite(champ);
    ajouterAuPanier({
      id: encart.dataset.id,
      name: encart.dataset.name,
      href: encart.dataset.href,
      img: encart.dataset.img,
      version: version.dataset.label,
      unit: Number(version.dataset.price),
      qty: lireQuantite(champ),
      options: options(),
    });
  });
});

/* ---------- Page Panier ---------- */
const liste = document.querySelector("[data-cart-list]");

function vignette(a) {
  const produit = (window.PRODUITS || []).find((p) => p.id === a.id);
  if (produit && produit.svg) {
    return `<a class="media cart-thumb media-drawing" href="${echapper(a.href)}" tabindex="-1" aria-hidden="true">${produit.svg}</a>`;
  }
  return `<a class="media cart-thumb" href="${echapper(a.href)}" tabindex="-1" aria-hidden="true">
          <span class="media-missing"></span>
          <span class="media-photo" style="background-image: url('${echapper(a.img)}')"></span>
        </a>`;
}

function afficherPanier() {
  const articles = lirePanier();
  const resume = document.querySelector("[data-cart-summary]");

  if (articles.length === 0) {
    liste.innerHTML = `
      <div class="panel cart-empty">
        <p class="cart-empty-icon" aria-hidden="true">✈</p>
        <h2>Votre panier est vide</h2>
        <p>Pas encore d'avion de chasse ? Il n'est jamais trop tard.</p>
        <a class="btn" href="Avions.html">Voir les avions</a>
        <a class="btn btn-light" href="Missiles.html">Voir les missiles</a>
      </div>`;
    resume.hidden = true;
    return;
  }

  resume.hidden = false;
  liste.innerHTML = articles
    .map((a, i) => {
      const options = a.options.length
        ? `<ul class="cart-options">${a.options
            .map((o) => `<li>+ ${echapper(o.label)} <span>${formatEuro.format(o.price)}</span></li>`)
            .join("")}</ul>`
        : "";
      return `
      <article class="cart-item">
        ${vignette(a)}
        <div class="cart-info">
          <h3><a href="${echapper(a.href)}">${echapper(a.name)}</a></h3>
          <p class="muted">${echapper(a.version)} · ${formatEuro.format(a.unit)} l'unité</p>
          ${options}
          <div class="cart-actions">
            <div class="qty-control" aria-label="Quantité">
              <button type="button" data-action="moins" data-index="${i}" aria-label="Retirer un exemplaire">−</button>
              <input class="qty-input" type="number" min="1" max="999" value="${a.qty}" inputmode="numeric" data-index="${i}" aria-label="Quantité de ${echapper(a.name)}" />
              <button type="button" data-action="plus" data-index="${i}" aria-label="Ajouter un exemplaire">+</button>
            </div>
            <button class="link-button" type="button" data-action="supprimer" data-index="${i}">Supprimer</button>
          </div>
        </div>
        <p class="cart-line-total">${formatEuro.format(totalLigne(a))}</p>
      </article>`;
    })
    .join("");

  const c = calculer(articles);
  document.querySelector("[data-cart-qty]").textContent = c.nombre;
  document.querySelector("[data-cart-subtotal]").textContent = formatEuro.format(c.sousTotal);
  const ligne = document.querySelector("[data-promo-line]");
  ligne.hidden = !c.valide;
  if (c.valide) {
    ligne.querySelector("[data-promo-label]").textContent = `Code ${c.code}`;
    ligne.querySelector("[data-promo-amount]").textContent = "−" + formatEuro.format(c.remise);
  }
  const message = document.querySelector("[data-promo-msg]");
  if (c.code && c.regle) {
    message.className = `promo-msg ${c.valide ? "ok" : "ko"}`;
    message.textContent = c.valide
      ? `✓ ${c.code} : ${c.regle.texte}.`
      : `${c.code} demande au moins ${c.regle.min} articles (vous en avez ${c.nombre}).`;
  }
  document.querySelectorAll("[data-cart-total]").forEach((el) => {
    el.textContent = formatEuro.format(c.total);
  });
}

if (liste) {
  liste.addEventListener("click", (event) => {
    const bouton = event.target.closest("[data-action]");
    if (!bouton) return;
    const articles = lirePanier();
    const article = articles[Number(bouton.dataset.index)];
    if (!article) return;

    if (bouton.dataset.action === "plus") article.qty = Math.min(article.qty + 1, 999);
    if (bouton.dataset.action === "moins") article.qty -= 1;
    if (bouton.dataset.action === "supprimer" || article.qty < 1) {
      articles.splice(Number(bouton.dataset.index), 1);
    }
    enregistrerPanier(articles);
    afficherPanier();
  });

  liste.addEventListener("change", (event) => {
    const champ = event.target.closest("input[data-index]");
    if (!champ) return;
    const articles = lirePanier();
    articles[Number(champ.dataset.index)].qty = lireQuantite(champ);
    enregistrerPanier(articles);
    afficherPanier();
  });

  const formulairePromo = document.querySelector("[data-promo-form]");
  const champPromo = formulairePromo.querySelector("[data-promo-input]");
  champPromo.value = lireCode();
  formulairePromo.addEventListener("submit", (event) => {
    event.preventDefault();
    const code = champPromo.value.trim().toUpperCase().replace(/\s+/g, "");
    const message = document.querySelector("[data-promo-msg]");
    if (!code) {
      try {
        localStorage.removeItem(CLE_PROMO);
      } catch {
        /* rien */
      }
      message.textContent = "";
    } else if (!CODES[code]) {
      message.className = "promo-msg ko";
      message.textContent = "Code inconnu. Même nos radars ne le détectent pas.";
      return;
    } else {
      try {
        localStorage.setItem(CLE_PROMO, code);
      } catch {
        /* rien */
      }
    }
    champPromo.value = code;
    afficherPanier();
  });

  document.querySelector("[data-clear]").addEventListener("click", () => {
    enregistrerPanier([]);
    afficherPanier();
  });

  const fenetre = document.querySelector("[data-order-modal]");
  document.querySelector("[data-checkout]").addEventListener("click", () => {
    const articles = lirePanier();
    const { total } = calculer(articles);
    document.querySelector("[data-order-total]").textContent = formatEuro.format(total);
    document.querySelector("[data-order-number]").textContent =
      "DA-" + String(Math.floor(Math.random() * 1e6)).padStart(6, "0");
    enregistrerPanier([]);
    afficherPanier();
    fenetre.classList.add("is-open");
  });

  fenetre.querySelector("[data-close]").addEventListener("click", () => {
    fenetre.classList.remove("is-open");
  });

  afficherPanier();
}

majCompteur();
