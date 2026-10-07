/* ==========================================================================
   Mini-jeu caché « Livreur en vol » — se lance en cliquant le logo Vitality.
   Modes : Classique (10 livraisons), Infini (une erreur et c'est fini),
   Escorte (contourner les orages — mode secret à débloquer).
   Carte : d3-geo + topojson + world-atlas, chargés à la demande depuis un CDN.
   ========================================================================== */
(() => {
  const boutons = document.querySelectorAll("[data-jeu-open]");
  if (!boutons.length) return;

  const LIBS = [
    "https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js",
    "https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js",
  ];
  const CARTE = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
  const BASE = [2.2, 48.84]; // Saint-Cloud
  const CLE_CLASSEMENT = "dassault-jeu-classement";
  const CLE_PSEUDO = "dassault-jeu-pseudo";
  const CLE_ESCORTE = "dassault-jeu-escorte";

  const MODES = {
    classique: { nom: "Classique", manches: 10, duree: () => 15000, desc: "10 livraisons, 15 secondes chacune." },
    infini: {
      nom: "Infini",
      manches: Infinity,
      duree: (m) => Math.max(6000, 15000 - (m - 1) * 600),
      desc: "Livrez jusqu'à la première erreur. Le chrono raccourcit à chaque livraison.",
    },
    escorte: {
      nom: "Escorte",
      manches: 8,
      duree: () => 25000,
      desc: "Des orages barrent la route : cliquez des points de passage pour les contourner, puis le pays du client.",
    },
  };

  /* Pays à livrer (code ISO numérique de world-atlas → nom français) */
  const CIBLES = {
    "076": "Brésil", "032": "Argentine", "152": "Chili", "604": "Pérou", "170": "Colombie",
    "484": "Mexique", "840": "États-Unis", "124": "Canada", "304": "Groenland", "250": "France",
    "724": "Espagne", "380": "Italie", "276": "Allemagne", "826": "Royaume-Uni", "578": "Norvège",
    "752": "Suède", "246": "Finlande", "616": "Pologne", "804": "Ukraine", "300": "Grèce",
    "792": "Turquie", "643": "Russie", "398": "Kazakhstan", "496": "Mongolie", "156": "Chine",
    "356": "Inde", "364": "Iran", "682": "Arabie saoudite", "818": "Égypte", "012": "Algérie",
    "504": "Maroc", "466": "Mali", "566": "Nigeria", "180": "RD Congo", "710": "Afrique du Sud",
    "404": "Kenya", "231": "Éthiopie", "450": "Madagascar", "360": "Indonésie", "392": "Japon",
    "410": "Corée du Sud", "764": "Thaïlande", "704": "Viêt Nam", "036": "Australie",
    "554": "Nouvelle-Zélande", "608": "Philippines", "024": "Angola", "368": "Irak",
    "862": "Venezuela", "620": "Portugal", "634": "Qatar", "784": "Émirats arabes unis",
    "191": "Croatie", "688": "Serbie", "352": "Islande", "586": "Pakistan", "434": "Libye",
  };
  /* Noms français supplémentaires pour les mauvais clics */
  const AUTRES = {
    "068": "Bolivie", "600": "Paraguay", "858": "Uruguay", "218": "Équateur", "328": "Guyana",
    "740": "Suriname", "192": "Cuba", "332": "Haïti", "320": "Guatemala", "340": "Honduras",
    "558": "Nicaragua", "188": "Costa Rica", "591": "Panama", "372": "Irlande", "056": "Belgique",
    "528": "Pays-Bas", "756": "Suisse", "040": "Autriche", "203": "Tchéquie", "703": "Slovaquie",
    "348": "Hongrie", "642": "Roumanie", "100": "Bulgarie", "112": "Biélorussie", "440": "Lituanie",
    "428": "Lettonie", "233": "Estonie", "208": "Danemark", "498": "Moldavie", "008": "Albanie",
    "070": "Bosnie-Herzégovine", "807": "Macédoine du Nord", "499": "Monténégro", "705": "Slovénie",
    "268": "Géorgie", "051": "Arménie", "031": "Azerbaïdjan", "760": "Syrie", "400": "Jordanie",
    "376": "Israël", "422": "Liban", "887": "Yémen", "512": "Oman", "414": "Koweït",
    "860": "Ouzbékistan", "795": "Turkménistan", "762": "Tadjikistan", "417": "Kirghizistan",
    "004": "Afghanistan", "050": "Bangladesh", "524": "Népal", "064": "Bhoutan", "144": "Sri Lanka",
    "104": "Birmanie", "418": "Laos", "116": "Cambodge", "458": "Malaisie", "408": "Corée du Nord",
    "598": "Papouasie-Nouvelle-Guinée", "788": "Tunisie", "729": "Soudan", "728": "Soudan du Sud",
    "148": "Tchad", "562": "Niger", "478": "Mauritanie", "686": "Sénégal", "324": "Guinée",
    "384": "Côte d'Ivoire", "288": "Ghana", "854": "Burkina Faso", "120": "Cameroun",
    "140": "Centrafrique", "178": "Congo", "266": "Gabon", "706": "Somalie", "834": "Tanzanie",
    "800": "Ouganda", "508": "Mozambique", "894": "Zambie", "716": "Zimbabwe", "072": "Botswana",
    "516": "Namibie", "454": "Malawi", "232": "Érythrée", "262": "Djibouti", "010": "Antarctique",
    "260": "Terres australes françaises", "540": "Nouvelle-Calédonie", "242": "Fidji",
  };

  const PRODUITS = [
    "Rafale", "Falcon 6X", "Falcon 8X", "Mirage 2000", "Mirage F1", "Super Étendard",
    "missiles MICA", "missiles Meteor", "missiles Exocet", "kits AASM", "Mirage III de collection",
  ];
  const QUANTITES = [1, 2, 3, 6, 12, 37];
  const CLIENTS = [
    "une mamie qui en a marre des bouchons",
    "un collectionneur un peu trop passionné",
    "une start-up de livraison de pizzas",
    "un club d'aéromodélisme très ambitieux",
    "un milliardaire pressé",
    "un influenceur en manque de contenu",
    "une école de pilotage",
    "un ministère qui ne veut pas donner son nom",
    "un fan de Top Gun",
    "un agriculteur qui veut épater ses voisins",
  ];

  const hasard = (liste) => liste[Math.floor(Math.random() * liste.length)];
  const nombre = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
  const echapper = (t) => {
    const d = document.createElement("div");
    d.textContent = t ?? "";
    return d.innerHTML;
  };
  const notifier = (html) => (window.notifier ? window.notifier(html) : null);

  const MSG_OK = [
    (c) => `✓ Livré ! Le client (${c.client}) vous laisse 5 étoiles : « Rapide, et le pilote était poli. »`,
    (c) => `✓ Pile au bon endroit. Le client a déjà recommandé ${c.qte} ${c.produit} de plus.`,
    () => `✓ Livraison parfaite : le colis est arrivé avant même la confirmation de commande.`,
  ];
  const MSG_KO = [
    (c, ici, d) => `✗ Raté ! Atterrissage : ${ici}, à ${nombre(d)} km du client. Un berger local est désormais l'heureux propriétaire de ${c.qte} ${c.produit}.`,
    (c, ici, d) => `✗ Livré à côté : ${ici} au lieu de ${c.nom} (${nombre(d)} km d'écart). Le service client prépare déjà un bon d'achat.`,
    (c, ici, d) => `✗ Oups, ${ici}. Le vrai client a reçu une lettre d'excuse et un porte-clés Rafale. (${nombre(d)} km d'écart)`,
    (c, ici, d) => `✗ ${ici} ? Le GPS a bon dos. ${nombre(d)} km d'écart, le pilote dit que « c'était tout comme ».`,
  ];
  const MSG_OCEAN = (c, d) =>
    `✗ Plouf ! Livraison en plein océan, à ${nombre(d)} km du client. Les poissons n'ont pas les licences d'exportation.`;
  const MSG_TEMPS = (c) =>
    `⏱ Trop lent : ${c.client} a annulé et commandé chez la concurrence. Il fallait livrer ici : ${c.nom}.`;
  const MSG_FOUDRE = [
    "⚡ Foudroyé ! Le colis a traversé un orage et arrive en pièces détachées.",
    "⚡ L'orage a gagné. Le pilote rentre à pied, le client attend toujours.",
    "⚡ Zone orageuse ! Les 37 parapluies offerts n'ont pas suffi.",
  ];

  const GRADES = ["Stagiaire du tarmac", "Pilote de convoyage", "As de la livraison", "Légende du fret supersonique"];
  const grade = (mode, score, livraisons) => {
    const seuils = mode === "infini" ? [3, 7, 12] : mode === "escorte" ? [3000, 6000, 9000] : [3000, 7000, 11000];
    const valeur = mode === "infini" ? livraisons : score;
    return GRADES[seuils.filter((s) => valeur >= s).length];
  };

  let dialog, monde, projection, chemin, svg, couchePays, coucheMeteo, coucheVol;
  let etat = {};
  let minuteur = null;
  let clicsBase = 0;

  /* ---------- Stockage local ---------- */
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
  const escorteDebloquee = () => lire(CLE_ESCORTE, false) === true;
  const classement = () => lire(CLE_CLASSEMENT, { classique: [], infini: [], escorte: [] });

  /* ---------- Chargement des bibliothèques ---------- */
  const chargerScript = (src) =>
    new Promise((ok, ko) => {
      if (document.querySelector(`script[src="${src}"]`)) return ok();
      const s = document.createElement("script");
      s.src = src;
      s.onload = ok;
      s.onerror = ko;
      document.head.append(s);
    });

  async function chargerCarte() {
    if (monde) return;
    for (const src of LIBS) await chargerScript(src);
    const topo = await fetch(CARTE).then((r) => r.json());
    monde = topojson.feature(topo, topo.objects.countries).features;
  }

  /* ---------- Fenêtre ---------- */
  function creerFenetre() {
    dialog = document.createElement("dialog");
    dialog.className = "jeu";
    dialog.setAttribute("aria-label", "Mini-jeu Livreur en vol");
    dialog.innerHTML = `
      <div class="jeu-top">
        <h2>✈ Livreur en vol</h2>
        <div class="jeu-stats">
          <span>Mode <strong data-j-mode>–</strong></span>
          <span>Livraison <strong data-j-manche>–</strong></span>
          <span>Score <strong data-j-score>0</strong></span>
          <button class="jeu-close" type="button" data-j-fermer aria-label="Fermer le jeu">✕</button>
        </div>
      </div>
      <div data-j-contenu></div>`;
    document.body.append(dialog);
    dialog.querySelector("[data-j-fermer]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", arreterMinuteur);
  }

  const contenu = () => dialog.querySelector("[data-j-contenu]");
  const majEntete = () => {
    dialog.querySelector("[data-j-mode]").textContent = etat.mode ? MODES[etat.mode].nom : "–";
    const total = etat.mode && Number.isFinite(MODES[etat.mode].manches) ? `/${MODES[etat.mode].manches}` : "";
    dialog.querySelector("[data-j-manche]").textContent = etat.manche ? `${etat.manche}${total}` : "–";
    dialog.querySelector("[data-j-score]").textContent = nombre(etat.score || 0);
  };

  function htmlClassement(mode, surligner) {
    const liste = classement()[mode] || [];
    if (!liste.length) return `<p>Aucun score pour l'instant. À vous de jouer !</p>`;
    return `<ol>${liste
      .slice(0, 5)
      .map(
        (e) => `<li class="${surligner && e.id === surligner ? "moi" : ""}"><span>${echapper(e.pseudo)}</span>` +
          `<strong>${nombre(e.score)} pts${mode === "infini" ? ` · ${e.livraisons} liv.` : ""}</strong></li>`,
      )
      .join("")}</ol>`;
  }

  function blocClassement(modeActif, surligner) {
    const bloc = document.createElement("div");
    bloc.className = "jeu-classement";
    const rendu = (mode) => {
      bloc.innerHTML = `<h4>Classement local</h4>
        <div class="jeu-tabs">${Object.entries(MODES)
          .map(([id, m]) => `<button type="button" data-tab="${id}" aria-pressed="${id === mode}">${m.nom}</button>`)
          .join("")}</div>
        ${htmlClassement(mode, surligner)}`;
      bloc.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => rendu(b.dataset.tab)));
    };
    rendu(modeActif);
    return bloc;
  }

  function ecranAccueil() {
    etat = {};
    majEntete();
    const debloque = escorteDebloquee();
    contenu().innerHTML = `
      <div class="jeu-ecran">
        <h3>Bienvenue, pilote</h3>
        <p>Les commandes de la boutique s'accumulent ! Pour chacune, cliquez sur le pays du client sur la carte.
        Plus vous êtes rapide, plus vous gagnez de points. Départ : Saint-Cloud.</p>
        <div class="jeu-modes">
          ${Object.entries(MODES)
            .map(([id, m]) => {
              const verrou = id === "escorte" && !debloque;
              return `<button class="jeu-mode" type="button" data-j-mode-choix="${id}"${verrou ? " disabled" : ""}>
                <strong>${verrou ? "🔒 " : ""}${m.nom}</strong>
                <span>${verrou ? "Mode secret. Indice : tout commence au point de départ…" : m.desc}</span></button>`;
            })
            .join("")}
        </div>
      </div>`;
    contenu().querySelector(".jeu-ecran").append(blocClassement("classique"));
    contenu().querySelectorAll("[data-j-mode-choix]").forEach((b) =>
      b.addEventListener("click", () => demarrer(b.dataset.jModeChoix)),
    );
  }

  async function demarrer(mode) {
    contenu().innerHTML = `<div class="jeu-ecran"><p>Chargement de la carte du monde…</p></div>`;
    try {
      await chargerCarte();
    } catch {
      contenu().innerHTML = `<div class="jeu-ecran"><h3>Pas de carte</h3>
        <p>Impossible de charger la carte du monde. Le mini-jeu a besoin d'une connexion Internet.</p></div>`;
      return;
    }
    etat = { mode, manche: 0, score: 0, livraisons: 0, verrou: true, deja: new Set() };
    construireCarte();
    mancheSuivante();
  }

  function tirerCible() {
    let dispo = monde.filter((p) => CIBLES[p.id] && !etat.deja.has(p.id));
    if (!dispo.length) {
      etat.deja.clear();
      dispo = monde.filter((p) => CIBLES[p.id]);
    }
    const choix = hasard(dispo);
    etat.deja.add(choix.id);
    return choix;
  }

  function construireCarte() {
    contenu().innerHTML = `
      <p class="jeu-ordre" data-j-ordre></p>
      <div class="jeu-timer"><span data-j-timer></span></div>
      <div class="jeu-carte"><svg viewBox="0 0 960 500" data-j-svg></svg></div>
      <p class="jeu-msg" data-j-msg aria-live="polite"></p>
      <div class="jeu-actions"><button class="btn" type="button" data-j-suivant hidden>Livraison suivante →</button></div>`;

    projection = d3.geoNaturalEarth1().fitExtent([[8, 8], [952, 492]], { type: "Sphere" });
    chemin = d3.geoPath(projection);
    svg = d3.select(contenu().querySelector("[data-j-svg]"));

    svg.append("path").datum({ type: "Sphere" }).attr("d", chemin).attr("fill", "#0b2238");
    svg.append("path").datum(d3.geoGraticule10()).attr("d", chemin)
      .attr("fill", "none").attr("stroke", "rgb(255 255 255 / 6%)");
    couchePays = svg.append("g");
    couchePays.selectAll("path").data(monde).join("path").attr("class", "pays").attr("d", chemin);
    coucheMeteo = svg.append("g").attr("pointer-events", "none");
    coucheVol = svg.append("g").attr("pointer-events", "none");

    /* Point de départ : cliquable 3 fois pour débloquer le mode escorte */
    const [bx, by] = projection(BASE);
    const base = svg.append("g").attr("class", "base-zone");
    base.append("circle").attr("cx", bx).attr("cy", by).attr("r", 12).attr("class", "base-hit");
    base.append("circle").attr("cx", bx).attr("cy", by).attr("r", 4.5).attr("class", "base").attr("pointer-events", "none");
    base.on("click", (event) => {
      event.stopPropagation();
      clicsBase += 1;
      if (clicsBase >= 3 && !escorteDebloquee()) {
        ecrire(CLE_ESCORTE, true);
        message("🔓 Secret trouvé ! Le mode Escorte est débloqué dans le menu du jeu.", "ok");
        notifier("🔓 Mode <strong>Escorte</strong> débloqué dans le mini-jeu !");
      } else if (!escorteDebloquee()) {
        message(clicsBase === 1 ? "Saint-Cloud, le point de départ. Hmm…" : "Encore une fois…", "");
      }
    });

    svg.on("click", (event) => cliquer(event));
    contenu().querySelector("[data-j-suivant]").addEventListener("click", () => {
      if (etat.fini) ecranFin();
      else mancheSuivante();
    });
  }

  function message(texte, classe) {
    const msg = contenu().querySelector("[data-j-msg]");
    if (!msg) return;
    msg.className = `jeu-msg ${classe || ""}`;
    msg.textContent = texte;
  }

  function mancheSuivante() {
    const mode = MODES[etat.mode];
    if (etat.manche >= mode.manches) return ecranFin();
    etat.manche += 1;
    etat.etapes = [];
    const pays = tirerCible();
    etat.commande = {
      pays,
      nom: CIBLES[pays.id],
      produit: hasard(PRODUITS),
      qte: hasard(QUANTITES),
      client: hasard(CLIENTS),
      numero: "DA-" + String(Math.floor(Math.random() * 1e6)).padStart(6, "0"),
    };
    const c = etat.commande;
    majEntete();
    contenu().querySelector("[data-j-ordre]").innerHTML =
      `Commande ${c.numero} : <strong>${c.qte} × ${c.produit}</strong> pour ${c.client}. Destination : <strong>${c.nom}</strong>`;
    message(
      etat.mode === "escorte"
        ? "Cliquez des points de passage pour éviter les orages (3 maximum), puis le pays du client."
        : "Cliquez sur le pays de destination.",
    );
    contenu().querySelector("[data-j-suivant]").hidden = true;
    couchePays.selectAll("path").classed("cible", false).classed("rate", false);
    coucheVol.selectAll("*").remove();
    coucheMeteo.selectAll("*").remove();
    if (etat.mode === "escorte") genererOrages();
    etat.verrou = false;
    lancerMinuteur(mode.duree(etat.manche));
  }

  /* ---------- Orages (mode escorte) ---------- */
  function genererOrages() {
    const cible = centrePrincipal(etat.commande.pays);
    const loin = (centre, rayon) =>
      d3.geoDistance(centre, BASE) * (180 / Math.PI) > rayon + 4 &&
      d3.geoDistance(centre, cible) * (180 / Math.PI) > rayon + 4;
    const orages = [];
    const route = d3.geoInterpolate(BASE, cible);
    for (let essai = 0; orages.length < 2 && essai < 40; essai++) {
      const rayon = 5 + Math.random() * 4;
      const centre = route(0.3 + Math.random() * 0.4);
      if (loin(centre, rayon)) orages.push({ centre, rayon });
    }
    for (let essai = 0; orages.length < 6 && essai < 80; essai++) {
      const rayon = 5 + Math.random() * 6;
      const centre = [-160 + Math.random() * 320, -50 + Math.random() * 115];
      if (loin(centre, rayon)) orages.push({ centre, rayon });
    }
    etat.orages = orages;
    orages.forEach((o) => {
      coucheMeteo.append("path").attr("class", "orage")
        .attr("d", chemin(d3.geoCircle().center(o.centre).radius(o.rayon)()));
      const [x, y] = projection(o.centre);
      coucheMeteo.append("text").attr("class", "eclair").attr("x", x).attr("y", y)
        .attr("text-anchor", "middle").attr("dominant-baseline", "central").text("⚡");
    });
  }

  /* Points d'un trajet passant par les étapes, et premier point dans un orage */
  function echantillonner(points) {
    const sortie = [];
    for (let i = 0; i < points.length - 1; i++) {
      const interp = d3.geoInterpolate(points[i], points[i + 1]);
      for (let k = 0; k <= 60; k++) sortie.push(interp(k / 60));
    }
    return sortie;
  }

  function premierImpact(echantillons) {
    if (etat.mode !== "escorte") return -1;
    return echantillons.findIndex((pt) =>
      etat.orages.some((o) => d3.geoDistance(pt, o.centre) < (o.rayon * Math.PI) / 180),
    );
  }

  function dessinerApercu() {
    coucheVol.selectAll(".apercu").remove();
    const points = [BASE, ...etat.etapes];
    if (points.length < 2) return;
    const ech = echantillonner(points);
    coucheVol.append("path").attr("class", `trajet apercu${premierImpact(ech) >= 0 ? " danger" : ""}`)
      .attr("d", chemin({ type: "LineString", coordinates: ech }));
    etat.etapes.forEach((e, i) => {
      const [x, y] = projection(e);
      coucheVol.append("circle").attr("class", "etape apercu").attr("cx", x).attr("cy", y).attr("r", 5);
      coucheVol.append("text").attr("class", "apercu").attr("x", x).attr("y", y - 9).attr("text-anchor", "middle")
        .attr("fill", "#f3c845").attr("font-size", 11).attr("font-weight", 700).text(i + 1);
    });
  }

  /* ---------- Chrono ---------- */
  function lancerMinuteur(duree) {
    arreterMinuteur();
    const barre = contenu().querySelector("[data-j-timer]");
    const debut = performance.now();
    const tic = (t) => {
      const reste = Math.max(0, 1 - (t - debut) / duree);
      etat.reste = reste;
      barre.style.transform = `scaleX(${reste})`;
      if (reste <= 0) return tempsEcoule();
      minuteur = requestAnimationFrame(tic);
    };
    minuteur = requestAnimationFrame(tic);
  }

  function arreterMinuteur() {
    if (minuteur) cancelAnimationFrame(minuteur);
    minuteur = null;
  }

  function tempsEcoule() {
    etat.verrou = true;
    montrerCible();
    finManche(0, MSG_TEMPS(etat.commande), false);
  }

  /* ---------- Clic sur la carte ---------- */
  function cliquer(event) {
    if (etat.verrou) return;
    const pt = svg.node().createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const p = pt.matrixTransform(svg.node().getScreenCTM().inverse());
    const lonlat = projection.invert([p.x, p.y]);
    if (!lonlat || Number.isNaN(lonlat[0])) return;
    const touche = monde.find((f) => d3.geoContains(f, lonlat));

    if (etat.mode === "escorte" && touche !== etat.commande.pays && etat.etapes.length < 3) {
      etat.etapes.push(lonlat);
      dessinerApercu();
      message(`Point de passage n°${etat.etapes.length} ajouté. ${etat.etapes.length < 3 ? "Ajoutez-en d'autres ou cliquez" : "Cliquez maintenant"} le pays du client.`);
      return;
    }

    etat.verrou = true;
    arreterMinuteur();
    voler([BASE, ...(etat.etapes || []), lonlat], (impact) => resultat(lonlat, touche, impact));
  }

  function voler(points, ensuite) {
    const ech = echantillonner(points);
    const impact = premierImpact(ech);
    const fin = impact >= 0 ? impact : ech.length - 1;
    coucheVol.selectAll(".apercu").remove();
    const trajet = coucheVol.append("path").attr("class", "trajet");
    const avion = coucheVol.append("text").attr("class", "avion")
      .attr("text-anchor", "middle").attr("dominant-baseline", "central").text("✈");
    const duree = 700 + points.length * 250;
    const debut = performance.now();
    const anim = (t) => {
      const k = Math.min(1, (t - debut) / duree);
      const i = Math.round(k * fin);
      trajet.attr("d", chemin({ type: "LineString", coordinates: ech.slice(0, i + 1) }));
      const [x, y] = projection(ech[i]);
      const [x2, y2] = projection(ech[Math.min(i + 1, ech.length - 1)]);
      avion.attr("transform", `translate(${x},${y}) rotate(${(Math.atan2(y2 - y, x2 - x) * 180) / Math.PI})`);
      if (k < 1) return requestAnimationFrame(anim);
      avion.remove();
      coucheVol.append("text").attr("class", "colis").attr("text-anchor", "middle")
        .attr("x", x).attr("y", y).text(impact >= 0 ? "💥" : "📦");
      ensuite(impact >= 0);
    };
    requestAnimationFrame(anim);
  }

  function centrePrincipal(feature) {
    if (feature.geometry.type !== "MultiPolygon") return d3.geoCentroid(feature);
    const polys = feature.geometry.coordinates.map((c) => ({ type: "Polygon", coordinates: c }));
    return d3.geoCentroid(polys.reduce((a, b) => (d3.geoArea(a) > d3.geoArea(b) ? a : b)));
  }

  function montrerCible() {
    couchePays.selectAll("path").classed("cible", (d) => d === etat.commande.pays);
  }

  function resultat(lonlat, touche, foudroye) {
    const c = etat.commande;
    montrerCible();
    if (foudroye) return finManche(0, hasard(MSG_FOUDRE), false);
    if (touche === c.pays) {
      const malus = (etat.etapes || []).length * 100;
      const pts = Math.max(300, 1000 + Math.round((etat.reste || 0) * 500) - malus);
      return finManche(pts, `${hasard(MSG_OK)(c)} (+${pts} pts)`, true);
    }
    const distance = d3.geoDistance(lonlat, centrePrincipal(c.pays)) * 6371;
    const pts = etat.mode === "infini" ? 0 : Math.max(0, Math.round(600 * (1 - distance / 6000)));
    if (!touche) return finManche(pts, `${MSG_OCEAN(c, distance)} (+${pts} pts)`, false);
    couchePays.selectAll("path").classed("rate", (d) => d === touche);
    const ici = CIBLES[touche.id] || AUTRES[touche.id] || touche.properties.name;
    finManche(pts, `${hasard(MSG_KO)(c, ici, distance)} (+${pts} pts)`, false);
  }

  function finManche(points, texte, reussi) {
    etat.score += points;
    if (reussi) etat.livraisons += 1;
    majEntete();
    message(texte, reussi ? "ok" : "ko");
    const mode = MODES[etat.mode];
    etat.fini = (etat.mode === "infini" && !reussi) || etat.manche >= mode.manches;
    const suivant = contenu().querySelector("[data-j-suivant]");
    suivant.textContent = etat.fini ? (etat.mode === "infini" ? "Fin de partie — voir mon score →" : "Voir mon score →") : "Livraison suivante →";
    suivant.hidden = false;
    suivant.focus();
  }

  /* ---------- Fin de partie et classement ---------- */
  function ecranFin() {
    arreterMinuteur();
    const mode = etat.mode;
    const liste = classement()[mode] || [];
    const record = !liste.length || etat.score > liste[0].score;
    const recompense =
      (mode === "classique" && etat.score >= 10000) || (mode === "infini" && etat.livraisons >= 10) || (mode === "escorte" && etat.score >= 6000);
    contenu().innerHTML = `
      <div class="jeu-ecran">
        <h3>Fin de service</h3>
        <p class="jeu-score">${nombre(etat.score)} pts</p>
        <p>${etat.livraisons} livraison${etat.livraisons > 1 ? "s" : ""} réussie${etat.livraisons > 1 ? "s" : ""} · Grade : <strong>${grade(mode, etat.score, etat.livraisons)}</strong></p>
        ${record && etat.score > 0 ? "<p>🏆 Meilleur score de ce mode !</p>" : ""}
        ${recompense ? "<p>🎁 Bravo ! Code promo débloqué : <strong>LIVREUR</strong> (−15 % sur votre panier).</p>" : ""}
        <form class="jeu-pseudo" data-j-pseudo>
          <label class="sr-only" for="jeu-pseudo">Votre nom de pilote</label>
          <input id="jeu-pseudo" maxlength="20" placeholder="Votre nom de pilote" value="${echapper(lire(CLE_PSEUDO, ""))}" required />
          <button class="btn" type="submit">Enregistrer mon score</button>
        </form>
        <div data-j-classement></div>
        <p style="margin-top:18px">
          <button class="btn btn-buy" type="button" data-j-rejouer style="width:auto">Rejouer (${MODES[mode].nom})</button>
          <button class="btn btn-ghost" type="button" data-j-menu>Changer de mode</button>
        </p>
      </div>`;
    const zone = contenu().querySelector("[data-j-classement]");
    zone.append(blocClassement(mode));

    contenu().querySelector("[data-j-pseudo]").addEventListener("submit", (e) => {
      e.preventDefault();
      const pseudo = e.target.querySelector("input").value.trim().slice(0, 20) || "Pilote anonyme";
      ecrire(CLE_PSEUDO, pseudo);
      const tous = classement();
      const entree = { id: Date.now(), pseudo, score: etat.score, livraisons: etat.livraisons };
      tous[mode] = [...(tous[mode] || []), entree].sort((a, b) => b.score - a.score).slice(0, 10);
      ecrire(CLE_CLASSEMENT, tous);
      e.target.innerHTML = `<p>✓ Score enregistré, ${echapper(pseudo)} !</p>`;
      zone.replaceChildren(blocClassement(mode, entree.id));
    });
    contenu().querySelector("[data-j-rejouer]").addEventListener("click", () => demarrer(mode));
    contenu().querySelector("[data-j-menu]").addEventListener("click", ecranAccueil);
  }

  boutons.forEach((b) =>
    b.addEventListener("click", () => {
      if (!dialog) creerFenetre();
      ecranAccueil();
      dialog.showModal();
    }),
  );
})();
