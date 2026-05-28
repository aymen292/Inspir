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