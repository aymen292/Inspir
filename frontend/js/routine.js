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
  document.getElementById('btn-play').textContent = 'Pause';

  minuteurInterval = setInterval(() => {
    secondesRestantes--;
    document.getElementById('minuteur-affichage').textContent = formaterTemps(secondesRestantes);

    if (secondesRestantes <= 0) {
      clearInterval(minuteurInterval);
      minuteurActif = false;
      document.getElementById('btn-play').textContent = 'Démarrer';
      document.getElementById('minuteur-affichage').textContent = '00:00';
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, 1000);
}

function pauseMinuteur() {
  clearInterval(minuteurInterval);
  minuteurActif = false;
  document.getElementById('btn-play').textContent = 'Reprendre';
}

function reinitialiserMinuteur(dureeMinutes) {
  clearInterval(minuteurInterval);
  minuteurActif = false;
  secondesRestantes = dureeMinutes * 60;
  document.getElementById('minuteur-affichage').textContent = formaterTemps(secondesRestantes);
  document.getElementById('btn-play').textContent = 'Démarrer';
}

// ── Affichage de la routine ────────────────────────────────────────
function construireContenu(routine) {
  const badges = [
    `<span class="badge">${routine.duree_minutes} min</span>`,
    `<span class="badge">${routine.moment || 'Tout moment'}</span>`,
    `<span class="badge">${routine.niveau}</span>`,
    `<span class="badge">${routine.profil_cible}</span>`,
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

    <div class="minuteur-bloc">
      <div class="minuteur-label">Durée de la séance</div>
      <div class="minuteur-affichage" id="minuteur-affichage">
        ${formaterTemps(routine.duree_minutes * 60)}
      </div>
      <div class="minuteur-controles">
        <button class="btn-minuteur btn-secondaire" id="btn-reset">Réinitialiser</button>
        <button class="btn-minuteur btn-principal" id="btn-play">Démarrer</button>
      </div>
    </div>

    <div class="etapes-container">
      <div class="etapes-titre">Étapes — ${routine.etapes.length} au total</div>
      <div id="liste-etapes">${etapesHTML}</div>
    </div>

    <div class="progression-container" id="progression-container">
      <div class="progression-barre">
        <div class="progression-remplissage" id="progression-remplissage" style="width: 0%"></div>
      </div>
      <span class="progression-texte" id="progression-texte">0 / ${routine.etapes.length}</span>
    </div>

    <button class="btn-commencer" id="btn-etape-suivante">
      Marquer l'étape 1 comme faite
    </button>
  `;
}

function initialiserInteractions(routine) {
  secondesRestantes = routine.duree_minutes * 60;
  let etapeActuelle = 1;
  const totalEtapes = routine.etapes.length;

  document.getElementById('btn-play').addEventListener('click', () => {
    minuteurActif ? pauseMinuteur() : demarrerMinuteur();
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    reinitialiserMinuteur(routine.duree_minutes);
  });

  const btnSuivant = document.getElementById('btn-etape-suivante');
  const progressionRemplissage = document.getElementById('progression-remplissage');
  const progressionTexte = document.getElementById('progression-texte');

  btnSuivant.addEventListener('click', () => {
    const etapeEl = document.getElementById(`etape-${etapeActuelle}`);
    if (etapeEl) etapeEl.classList.add('completee');

    const pct = Math.round((etapeActuelle / totalEtapes) * 100);
    progressionRemplissage.style.width = `${pct}%`;
    progressionTexte.textContent = `${etapeActuelle} / ${totalEtapes}`;

    etapeActuelle++;

    if (etapeActuelle > totalEtapes) {
      btnSuivant.textContent = 'Routine terminée';
      btnSuivant.disabled = true;
      progressionRemplissage.style.width = '100%';
      progressionTexte.textContent = `${totalEtapes} / ${totalEtapes}`;
      clearInterval(minuteurInterval);
    } else {
      btnSuivant.textContent = `Marquer l'étape ${etapeActuelle} comme faite`;
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
