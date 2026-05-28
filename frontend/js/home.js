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