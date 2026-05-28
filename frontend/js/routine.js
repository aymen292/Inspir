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
