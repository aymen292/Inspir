const categorieSlug = {
  Stress:         'stress',
  Sommeil:        'sommeil',
  Concentration:  'concentration',
  Mouvement:      'mouvement',
  Émotions:       'emotions',
  Énergie:        'energie',
};

function construireCarte(routine) {
  const slug = categorieSlug[routine.categorie] || '';
  const premiumBadge = routine.is_premium
    ? `<span class="carte-premium">Premium</span>`
    : '';

  return `
    <a class="carte-routine cat-${slug}" href="/routine.html?id=${routine.id}">
      <div class="carte-entete">
        <span class="carte-categorie cat-${slug}">${routine.categorie}</span>
        ${premiumBadge}
      </div>
      <div class="carte-titre">${routine.titre}</div>
      <div class="carte-description">${routine.description || ''}</div>
      <div class="carte-meta">
        <span class="meta-item">${routine.duree_minutes} min</span>
        <span class="meta-sep">·</span>
        <span class="meta-item">${routine.moment || 'Tout moment'}</span>
        <span class="meta-sep">·</span>
        <span class="meta-item">${routine.niveau}</span>
      </div>
    </a>
  `;
}

function squelette() {
  return `
    <div class="squelette">
      <div class="squelette-ligne squelette-ligne--courte"></div>
      <div class="squelette-ligne squelette-ligne--longue"></div>
      <div class="squelette-ligne squelette-ligne--milieu"></div>
    </div>
  `;
}

async function afficherRoutines(categorie = '') {
  const conteneur = document.getElementById('liste-routines');
  conteneur.innerHTML = [1, 2, 3, 4].map(squelette).join('');

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

document.getElementById('filtres-categorie').addEventListener('click', (e) => {
  const btn = e.target.closest('.filtre-btn');
  if (!btn) return;

  document.querySelectorAll('.filtre-btn').forEach((b) => b.classList.remove('actif'));
  btn.classList.add('actif');

  afficherRoutines(btn.dataset.categorie);
});

afficherRoutines();
