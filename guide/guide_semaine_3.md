# Semaine 3 — Frontend PWA et affichage des routines

> Projet : Application Bien-être & Micro-habitudes  
> Stack : FastAPI · PostgreSQL · Redis · Auth.js · Stripe · Scaleway  
> Dernière mise à jour : mai 2026

---

## Objectif de la semaine

À la fin de cette semaine, l'utilisateur peut **voir et lire les routines sur son téléphone**. Concrètement :

- La PWA est installable sur iOS et Android
- La page d'accueil affiche les routines sous forme de cartes
- La page de détail affiche les étapes une par une avec un minuteur
- L'interface est responsive et fonctionne sur toutes les tailles d'écran
- Un Service Worker basique permet un premier fonctionnement hors ligne

---

## Prérequis

Avant de commencer, vérifie que la semaine 2 est bien terminée :

- [ ] `GET /api/routines/` retourne 15 routines en JSON
- [ ] `GET /api/routines/{id}` retourne le détail complet avec les étapes
- [ ] Le serveur FastAPI tourne sans erreur sur `http://localhost:8000`
- [ ] Le fichier `.env` est configuré

---

## Étape 1 — Structure de la PWA

Le frontend est une application HTML/CSS/JS pure, sans framework — c'est le choix le plus simple pour le MVP. On la place dans un dossier `frontend/` à la racine du projet.

### 1.1 Créer la structure de dossiers

```bash
mkdir -p frontend/{css,js,icons}
touch frontend/index.html
touch frontend/routine.html
touch frontend/css/style.css
touch frontend/js/api.js
touch frontend/js/home.js
touch frontend/js/routine.js
touch frontend/manifest.json
touch frontend/sw.js
```

### 1.2 Structure finale attendue

```
frontend/
├── index.html          ← page d'accueil (liste des routines)
├── routine.html        ← page de détail d'une routine
├── manifest.json       ← configuration PWA
├── sw.js               ← Service Worker
├── css/
│   └── style.css       ← styles globaux
├── js/
│   ├── api.js          ← fonctions d'appel à l'API FastAPI
│   ├── home.js         ← logique de la page d'accueil
│   └── routine.js      ← logique de la page de détail
└── icons/
    ├── icon-192.png    ← icône PWA (à créer ou télécharger)
    └── icon-512.png    ← icône PWA grande taille
```

> **Pour les icônes :** Utilise un service gratuit comme https://favicon.io/favicon-generator/ ou crée deux images PNG simples de 192×192 et 512×512 pixels. Elles sont obligatoires pour que la PWA soit installable.

---

## Étape 2 — Fichier `manifest.json`

Le manifest est ce qui transforme un site web en PWA installable sur mobile.

### 2.1 Contenu de `frontend/manifest.json`

```json
{
  "name": "Inspir — Bien-être quotidien",
  "short_name": "Inspir",
  "description": "Micro-routines de bien-être en français",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f8f5f0",
  "theme_color": "#4a7c59",
  "orientation": "portrait",
  "lang": "fr",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

---

## Étape 3 — Service Worker

Le Service Worker permet à l'app de fonctionner partiellement hors ligne et d'être installable.

### 3.1 Contenu de `frontend/sw.js`

```javascript
const CACHE_NAME = 'inspir-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/routine.html',
  '/css/style.css',
  '/js/api.js',
  '/js/home.js',
  '/js/routine.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Installation : mise en cache des ressources statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : stratégie "network first, cache fallback"
self.addEventListener('fetch', (event) => {
  // Ne pas intercepter les appels à l'API
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

---

## Étape 4 — Feuille de style globale

### 4.1 Contenu de `frontend/css/style.css`

```css
/* ── Variables de couleur ─────────────────────────────────────────── */
:root {
  --couleur-principale: #4a7c59;
  --couleur-principale-claire: #6aab7e;
  --couleur-fond: #f8f5f0;
  --couleur-fond-carte: #ffffff;
  --couleur-texte: #2d2d2d;
  --couleur-texte-doux: #6b6b6b;
  --couleur-bordure: #e8e3dc;
  --couleur-premium: #c9a227;
  --ombre-carte: 0 2px 12px rgba(0, 0, 0, 0.07);
  --rayon-bordure: 14px;
  --police: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
}

/* ── Reset et base ────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--police);
  background-color: var(--couleur-fond);
  color: var(--couleur-texte);
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
}

/* ── En-tête ──────────────────────────────────────────────────────── */
.app-header {
  background-color: var(--couleur-principale);
  color: white;
  padding: 20px 20px 16px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-header h1 {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.app-header p {
  font-size: 0.85rem;
  opacity: 0.85;
  margin-top: 2px;
}

/* ── Contenu principal ────────────────────────────────────────────── */
.app-content {
  padding: 20px 16px;
}

/* ── Filtres ──────────────────────────────────────────────────────── */
.filtres {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 20px;
  scrollbar-width: none;
}

.filtres::-webkit-scrollbar { display: none; }

.filtre-btn {
  background: var(--couleur-fond-carte);
  border: 1.5px solid var(--couleur-bordure);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 0.82rem;
  color: var(--couleur-texte-doux);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.filtre-btn.actif,
.filtre-btn:hover {
  background: var(--couleur-principale);
  color: white;
  border-color: var(--couleur-principale);
}

/* ── Cartes de routines ───────────────────────────────────────────── */
.section-titre {
  font-size: 1rem;
  font-weight: 600;
  color: var(--couleur-texte);
  margin-bottom: 12px;
}

.routines-grille {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.carte-routine {
  background: var(--couleur-fond-carte);
  border-radius: var(--rayon-bordure);
  padding: 16px;
  box-shadow: var(--ombre-carte);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  text-decoration: none;
  color: inherit;
  display: block;
  border: 1.5px solid transparent;
}

.carte-routine:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.11);
  border-color: var(--couleur-principale-claire);
}

.carte-entete {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.carte-categorie {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--couleur-principale);
  background: #eef4f0;
  padding: 3px 8px;
  border-radius: 10px;
}

.carte-premium {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--couleur-premium);
  background: #fdf8e7;
  padding: 3px 8px;
  border-radius: 10px;
}

.carte-titre {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 6px;
  line-height: 1.3;
}

.carte-description {
  font-size: 0.84rem;
  color: var(--couleur-texte-doux);
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.carte-meta {
  display: flex;
  gap: 12px;
  font-size: 0.78rem;
  color: var(--couleur-texte-doux);
}

.carte-meta span::before { margin-right: 4px; }

/* ── État de chargement ───────────────────────────────────────────── */
.chargement {
  text-align: center;
  padding: 40px 20px;
  color: var(--couleur-texte-doux);
  font-size: 0.9rem;
}

.erreur {
  text-align: center;
  padding: 30px 20px;
  color: #c0392b;
  background: #fdf0ef;
  border-radius: var(--rayon-bordure);
  font-size: 0.88rem;
}

/* ── Page de détail d'une routine ─────────────────────────────────── */
.retour-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: white;
  text-decoration: none;
  font-size: 0.88rem;
  opacity: 0.9;
  margin-bottom: 4px;
}

.routine-titre {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.25;
}

.routine-meta-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}

.badge {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 20px;
  background: #eef4f0;
  color: var(--couleur-principale);
}

.routine-description {
  font-size: 0.92rem;
  color: var(--couleur-texte-doux);
  line-height: 1.6;
  margin-bottom: 24px;
  padding: 14px 16px;
  background: var(--couleur-fond-carte);
  border-radius: 10px;
  border-left: 3px solid var(--couleur-principale);
}

/* ── Étapes ───────────────────────────────────────────────────────── */
.etapes-container { margin-bottom: 30px; }

.etapes-titre {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 14px;
  color: var(--couleur-texte);
}

.etape {
  display: flex;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--couleur-bordure);
  transition: opacity 0.2s ease;
}

.etape:last-child { border-bottom: none; }

.etape.completee { opacity: 0.45; }

.etape-numero {
  width: 30px;
  height: 30px;
  min-width: 30px;
  border-radius: 50%;
  background: var(--couleur-principale);
  color: white;
  font-size: 0.82rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.etape.completee .etape-numero { background: #b0c9b8; }

.etape-texte {
  font-size: 0.93rem;
  line-height: 1.55;
  padding-top: 4px;
}

/* ── Minuteur ─────────────────────────────────────────────────────── */
.minuteur-bloc {
  background: var(--couleur-fond-carte);
  border-radius: var(--rayon-bordure);
  padding: 20px;
  text-align: center;
  box-shadow: var(--ombre-carte);
  margin-bottom: 20px;
  border: 1.5px solid var(--couleur-bordure);
}

.minuteur-affichage {
  font-size: 3rem;
  font-weight: 700;
  color: var(--couleur-principale);
  letter-spacing: 2px;
  margin-bottom: 16px;
  font-variant-numeric: tabular-nums;
}

.minuteur-controles {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.btn-minuteur {
  padding: 10px 24px;
  border-radius: 24px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-principal {
  background: var(--couleur-principale);
  color: white;
  min-width: 110px;
}

.btn-principal:hover { background: var(--couleur-principale-claire); }

.btn-secondaire {
  background: var(--couleur-fond);
  color: var(--couleur-texte-doux);
  border: 1.5px solid var(--couleur-bordure);
}

.btn-secondaire:hover { background: var(--couleur-bordure); }

/* ── Bouton commencer ─────────────────────────────────────────────── */
.btn-commencer {
  display: block;
  width: 100%;
  padding: 16px;
  background: var(--couleur-principale);
  color: white;
  border: none;
  border-radius: var(--rayon-bordure);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  margin-top: 24px;
  transition: background 0.15s ease;
}

.btn-commencer:hover { background: var(--couleur-principale-claire); }

/* ── Responsive ───────────────────────────────────────────────────── */
@media (max-width: 380px) {
  .app-content { padding: 16px 12px; }
  .minuteur-affichage { font-size: 2.4rem; }
}
```

---

## Étape 5 — Fichier `api.js` — Appels à l'API

### 5.1 Contenu de `frontend/js/api.js`

```javascript
const API_BASE = 'http://localhost:8000/api';

/**
 * Récupère la liste des routines avec filtres optionnels.
 * @param {Object} filtres - { categorie, moment, duree_max, profil }
 * @returns {Promise<Array>}
 */
async function getRoutines(filtres = {}) {
  const params = new URLSearchParams();
  if (filtres.categorie) params.append('categorie', filtres.categorie);
  if (filtres.moment)    params.append('moment', filtres.moment);
  if (filtres.duree_max) params.append('duree_max', filtres.duree_max);
  if (filtres.profil)    params.append('profil', filtres.profil);

  const url = `${API_BASE}/routines/${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);

  if (!response.ok) throw new Error(`Erreur API : ${response.status}`);
  return response.json();
}

/**
 * Récupère le détail complet d'une routine par son ID.
 * @param {string} id - UUID de la routine
 * @returns {Promise<Object>}
 */
async function getRoutine(id) {
  const response = await fetch(`${API_BASE}/routines/${id}`);
  if (!response.ok) throw new Error(`Routine introuvable : ${response.status}`);
  return response.json();
}
```

---

## Étape 6 — Page d'accueil `index.html` et `home.js`

### 6.1 Contenu de `frontend/index.html`

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="description" content="Micro-routines de bien-être en français — Inspir" />
  <meta name="theme-color" content="#4a7c59" />
  <title>Inspir — Bien-être quotidien</title>
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/icons/icon-192.png" />
</head>
<body>

  <header class="app-header">
    <h1>🌿 Inspir</h1>
    <p>Ton moment de bien-être</p>
  </header>

  <main class="app-content">

    <!-- Filtres par catégorie -->
    <div class="filtres" id="filtres-categorie">
      <button class="filtre-btn actif" data-categorie="">Tout</button>
      <button class="filtre-btn" data-categorie="Stress">Stress</button>
      <button class="filtre-btn" data-categorie="Sommeil">Sommeil</button>
      <button class="filtre-btn" data-categorie="Concentration">Concentration</button>
      <button class="filtre-btn" data-categorie="Mouvement">Mouvement</button>
      <button class="filtre-btn" data-categorie="Émotions">Émotions</button>
      <button class="filtre-btn" data-categorie="Énergie">Énergie</button>
    </div>

    <!-- Liste des routines -->
    <h2 class="section-titre">Toutes les routines</h2>
    <div class="routines-grille" id="liste-routines">
      <p class="chargement">Chargement des routines…</p>
    </div>

  </main>

  <script src="/js/api.js"></script>
  <script src="/js/home.js"></script>
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  </script>
</body>
</html>
```

### 6.2 Contenu de `frontend/js/home.js`

```javascript
const emojisCategorie = {
  Stress: '😮‍💨',
  Sommeil: '🌙',
  Concentration: '🎯',
  Mouvement: '🤸',
  Émotions: '💚',
  Énergie: '⚡',
};

function construireCarte(routine) {
  const emoji = emojisCategorie[routine.categorie] || '✨';
  const premiumBadge = routine.is_premium
    ? `<span class="carte-premium">⭐ Premium</span>`
    : '';

  return `
    <a class="carte-routine" href="/routine.html?id=${routine.id}">
      <div class="carte-entete">
        <span class="carte-categorie">${emoji} ${routine.categorie}</span>
        ${premiumBadge}
      </div>
      <div class="carte-titre">${routine.titre}</div>
      <div class="carte-description">${routine.description || ''}</div>
      <div class="carte-meta">
        <span>⏱ ${routine.duree_minutes} min</span>
        <span>📍 ${routine.moment || 'N\'importe quand'}</span>
        <span>📊 ${routine.niveau}</span>
      </div>
    </a>
  `;
}

async function afficherRoutines(categorie = '') {
  const conteneur = document.getElementById('liste-routines');
  conteneur.innerHTML = '<p class="chargement">Chargement…</p>';

  try {
    const filtres = categorie ? { categorie } : {};
    const routines = await getRoutines(filtres);

    if (routines.length === 0) {
      conteneur.innerHTML = '<p class="chargement">Aucune routine dans cette catégorie.</p>';
      return;
    }

    conteneur.innerHTML = routines.map(construireCarte).join('');
  } catch (err) {
    conteneur.innerHTML = `<p class="erreur">Impossible de charger les routines.<br>Vérifie que le serveur FastAPI est démarré.</p>`;
    console.error(err);
  }
}

// Gestion des filtres
document.getElementById('filtres-categorie').addEventListener('click', (e) => {
  const btn = e.target.closest('.filtre-btn');
  if (!btn) return;

  document.querySelectorAll('.filtre-btn').forEach((b) => b.classList.remove('actif'));
  btn.classList.add('actif');

  afficherRoutines(btn.dataset.categorie);
});

// Chargement initial
afficherRoutines();
```

---

## Étape 7 — Page de détail `routine.html` et `routine.js`

### 7.1 Contenu de `frontend/routine.html`

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#4a7c59" />
  <title>Routine — Inspir</title>
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="manifest" href="/manifest.json" />
</head>
<body>

  <header class="app-header">
    <a href="/index.html" class="retour-btn">← Retour</a>
    <h1 class="routine-titre" id="routine-titre">Chargement…</h1>
  </header>

  <main class="app-content" id="contenu-routine">
    <p class="chargement">Chargement de la routine…</p>
  </main>

  <script src="/js/api.js"></script>
  <script src="/js/routine.js"></script>
</body>
</html>
```

### 7.2 Contenu de `frontend/js/routine.js`

```javascript
// ── Minuteur ───────────────────────────────────────────────────────
let minuteurInterval = null;
let secondesRestantes = 0;
let minuteurActif = false;

function formaterTemps(secondes) {
  const m = Math.floor(secondes / 60).toString().padStart(2, '0');
  const s = (secondes % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function demarrerMinuteur() {
  if (minuteurActif) return;
  minuteurActif = true;
  document.getElementById('btn-play').textContent = '⏸ Pause';

  minuteurInterval = setInterval(() => {
    secondesRestantes--;
    document.getElementById('minuteur-affichage').textContent = formaterTemps(secondesRestantes);

    if (secondesRestantes <= 0) {
      clearInterval(minuteurInterval);
      minuteurActif = false;
      document.getElementById('btn-play').textContent = '▶ Démarrer';
      document.getElementById('minuteur-affichage').textContent = '00:00';
      // Vibration de fin sur mobile
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, 1000);
}

function pauseMinuteur() {
  clearInterval(minuteurInterval);
  minuteurActif = false;
  document.getElementById('btn-play').textContent = '▶ Reprendre';
}

function reinitialiserMinuteur(dureeMinutes) {
  clearInterval(minuteurInterval);
  minuteurActif = false;
  secondesRestantes = dureeMinutes * 60;
  document.getElementById('minuteur-affichage').textContent = formaterTemps(secondesRestantes);
  document.getElementById('btn-play').textContent = '▶ Démarrer';
}

// ── Affichage de la routine ────────────────────────────────────────
function construireContenu(routine) {
  const badges = [
    `<span class="badge">⏱ ${routine.duree_minutes} min</span>`,
    `<span class="badge">📍 ${routine.moment || 'N\'importe quand'}</span>`,
    `<span class="badge">📊 ${routine.niveau}</span>`,
    `<span class="badge">👤 ${routine.profil_cible}</span>`,
  ].join('');

  const etapesHTML = routine.etapes
    .map(
      (e) => `
      <div class="etape" id="etape-${e.numero}">
        <div class="etape-numero">${e.numero}</div>
        <div class="etape-texte">${e.texte}</div>
      </div>`
    )
    .join('');

  return `
    <div class="routine-meta-badges">${badges}</div>

    <div class="routine-description">${routine.description || ''}</div>

    <!-- Minuteur -->
    <div class="minuteur-bloc">
      <div class="minuteur-affichage" id="minuteur-affichage">
        ${formaterTemps(routine.duree_minutes * 60)}
      </div>
      <div class="minuteur-controles">
        <button class="btn-minuteur btn-secondaire" id="btn-reset">↺ Réinitialiser</button>
        <button class="btn-minuteur btn-principal" id="btn-play">▶ Démarrer</button>
      </div>
    </div>

    <!-- Étapes -->
    <div class="etapes-container">
      <div class="etapes-titre">Les étapes (${routine.etapes.length})</div>
      <div id="liste-etapes">${etapesHTML}</div>
    </div>

    <button class="btn-commencer" id="btn-etape-suivante">
      Marquer l'étape 1 comme faite ✓
    </button>
  `;
}

function initialiserInteractions(routine) {
  secondesRestantes = routine.duree_minutes * 60;
  let etapeActuelle = 1;

  // Minuteur
  document.getElementById('btn-play').addEventListener('click', () => {
    minuteurActif ? pauseMinuteur() : demarrerMinuteur();
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    reinitialiserMinuteur(routine.duree_minutes);
  });

  // Navigation par étapes
  const btnSuivant = document.getElementById('btn-etape-suivante');

  btnSuivant.addEventListener('click', () => {
    const etapeEl = document.getElementById(`etape-${etapeActuelle}`);
    if (etapeEl) etapeEl.classList.add('completee');

    etapeActuelle++;

    if (etapeActuelle > routine.etapes.length) {
      btnSuivant.textContent = '🎉 Routine terminée !';
      btnSuivant.disabled = true;
      btnSuivant.style.background = '#b0c9b8';
      clearInterval(minuteurInterval);
    } else {
      btnSuivant.textContent = `Marquer l'étape ${etapeActuelle} comme faite ✓`;
      // Défilement vers la prochaine étape
      document.getElementById(`etape-${etapeActuelle}`)?.scrollIntoView({
        behavior: 'smooth', block: 'center'
      });
    }
  });
}

// ── Chargement principal ───────────────────────────────────────────
async function chargerRoutine() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    document.getElementById('contenu-routine').innerHTML =
      '<p class="erreur">Aucun identifiant de routine fourni.</p>';
    return;
  }

  try {
    const routine = await getRoutine(id);

    document.title = `${routine.titre} — Inspir`;
    document.getElementById('routine-titre').textContent = routine.titre;
    document.getElementById('contenu-routine').innerHTML = construireContenu(routine);

    initialiserInteractions(routine);
  } catch (err) {
    document.getElementById('contenu-routine').innerHTML =
      '<p class="erreur">Impossible de charger cette routine.</p>';
    console.error(err);
  }
}

chargerRoutine();
```

---

## Étape 8 — Servir le frontend avec FastAPI

Pour éviter d'avoir à gérer deux serveurs séparément en développement, on configure FastAPI pour servir les fichiers statiques du frontend.

### 8.1 Installer le support des fichiers statiques

`aiofiles` est nécessaire pour que FastAPI serve des fichiers statiques :

```bash
pip install aiofiles
echo "aiofiles==23.2.1" >> requirements.txt
```

### 8.2 Mettre à jour `app/main.py`

Ajoute ces lignes après les imports existants :

```python
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
```

Et ajoute ces lignes **après** tous les `app.include_router(...)` :

```python
# Servir les fichiers statiques du frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

if os.path.exists(FRONTEND_DIR):
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
    app.mount("/icons", StaticFiles(directory=os.path.join(FRONTEND_DIR, "icons")), name="icons")

    @app.get("/manifest.json")
    async def manifest():
        return FileResponse(os.path.join(FRONTEND_DIR, "manifest.json"))

    @app.get("/sw.js")
    async def service_worker():
        return FileResponse(os.path.join(FRONTEND_DIR, "sw.js"))

    @app.get("/routine.html")
    async def routine_page():
        return FileResponse(os.path.join(FRONTEND_DIR, "routine.html"))

    @app.get("/", include_in_schema=False)
    async def frontend_home():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
```

### 8.3 Redémarrer et tester

```bash
uvicorn app.main:app --reload
```

Ouvre `http://localhost:8000` dans ton navigateur → tu dois voir la liste des routines.

---

## Étape 9 — Tester sur mobile

### 9.1 Accéder depuis le téléphone sur le même réseau Wi-Fi

Récupère l'adresse IP de ton ordinateur :

**Mac / Linux :**
```bash
ipconfig getifaddr en0
# ou
hostname -I
```

**Windows :**
```bash
ipconfig
# Cherche "Adresse IPv4"
```

Sur ton téléphone, ouvre le navigateur et va sur `http://TON_IP:8000` (ex: `http://192.168.1.42:8000`).

### 9.2 Installer la PWA

**Sur Android (Chrome) :** Une bannière "Ajouter à l'écran d'accueil" devrait apparaître. Sinon, menu ⋮ → "Ajouter à l'écran d'accueil".

**Sur iOS (Safari) :** Bouton partage → "Sur l'écran d'accueil".

> ⚠️ Sur iOS, le Service Worker ne fonctionne qu'avec HTTPS. Pour le développement local, l'installation PWA est disponible mais le hors-ligne ne sera actif qu'en production avec SSL.

### 9.3 Points à vérifier manuellement

- [ ] La liste des routines s'affiche correctement
- [ ] Les filtres par catégorie fonctionnent
- [ ] Cliquer sur une carte ouvre le détail de la routine
- [ ] Le minuteur démarre, met en pause, et se réinitialise
- [ ] La navigation par étapes fonctionne (marquer comme faite)
- [ ] Le bouton retour ramène à la liste
- [ ] L'interface est lisible sur un écran de 375px de large (iPhone SE)

---

## Étape 10 — Commit Git

Une fois tout fonctionnel :

```bash
git add .
git commit -m "feat(semaine-3): frontend PWA, page d'accueil, page de détail, minuteur, Service Worker"
git push origin develop
```

---

## Récapitulatif — Ordre d'exécution

| # | Action | Fichier |
|---|--------|---------|
| 1 | Créer la structure frontend | `mkdir -p frontend/{css,js,icons}` |
| 2 | Créer `manifest.json` | `frontend/manifest.json` |
| 3 | Créer le Service Worker | `frontend/sw.js` |
| 4 | Créer la feuille de style | `frontend/css/style.css` |
| 5 | Créer les fonctions API | `frontend/js/api.js` |
| 6 | Créer la page d'accueil | `frontend/index.html` + `js/home.js` |
| 7 | Créer la page de détail | `frontend/routine.html` + `js/routine.js` |
| 8 | Installer `aiofiles` | `pip install aiofiles` |
| 9 | Mettre à jour `main.py` | Montage des fichiers statiques |
| 10 | Ajouter les icônes | `frontend/icons/icon-192.png` et `icon-512.png` |
| 11 | Tester dans le navigateur | `http://localhost:8000` |
| 12 | Tester sur mobile | Via l'IP locale du PC |
| 13 | Commit Git | `git commit -m "feat(semaine-3): ..."` |

---

## Livrable de fin de semaine 3

✅ Page d'accueil affichant les 15 routines sous forme de cartes  
✅ Filtres par catégorie fonctionnels  
✅ Page de détail d'une routine avec étapes et minuteur  
✅ Navigation par étapes (marquer comme faite)  
✅ `manifest.json` et Service Worker configurés  
✅ Interface responsive testée sur mobile  
✅ Commit pushé sur la branche `develop`

---

## Points d'attention

**CORS en développement.** Si le frontend est servi depuis un autre port que FastAPI, le navigateur bloquera les requêtes. En servant tout depuis FastAPI (étape 8), ce problème est évité pour le MVP. En production, le domaine sera le même.

**Le minuteur ne sauvegarde pas l'état.** Si l'utilisateur quitte la page, le minuteur repart de zéro. C'est acceptable pour le MVP — la persistance sera ajoutée avec les sessions en semaine 6.

**Les icônes sont obligatoires.** Sans `icon-192.png` et `icon-512.png`, le navigateur ne proposera pas l'installation de la PWA. Crée deux images simples si tu n'en as pas.

**`API_BASE` pointe sur `localhost`.** En production, il faudra changer cette valeur. On la rendra configurable en semaine 10 lors du déploiement.

---

*Prochaine étape : Semaine 4 — Authentification et profil utilisateur*