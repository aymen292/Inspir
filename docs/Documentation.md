# Projet — Application Bien-être & Micro-habitudes
> Application web progressive (PWA) en français, dédiée au bien-être quotidien du grand public

---

## Table des matières

1. [Vision du projet](#1-vision-du-projet)
2. [Le problème résolu](#2-le-problème-résolu)
3. [La solution](#3-la-solution)
4. [Public cible](#4-public-cible)
5. [Fonctionnalités](#5-fonctionnalités)
6. [Catalogue de contenu](#6-catalogue-de-contenu)
7. [Architecture technique](#7-architecture-technique)
8. [Modèle économique](#8-modèle-économique)
9. [Conformité RGPD & HDS](#9-conformité-rgpd--hds)
10. [Stratégie d'acquisition](#10-stratégie-dacquisition)
11. [Plan de développement — 10 semaines](#11-plan-de-développement--10-semaines)
12. [Roadmap long terme](#12-roadmap-long-terme)
13. [Risques et comment les anticiper](#13-risques-et-comment-les-anticiper)
14. [Les 15 routines du MVP](#14-les-15-routines-du-mvp)

---

## 1. Vision du projet

Créer la référence française du bien-être numérique quotidien. Une application accessible à tous — peu importe l'âge, la situation ou le niveau de revenu — qui aide chaque personne à mieux gérer son stress, améliorer son sommeil, retrouver de l'énergie et maintenir un équilibre mental durable.

L'app repose sur une philosophie de **micro-habitudes** : des exercices courts de 3 à 15 minutes, faisables n'importe où et par n'importe qui, qui s'intègrent naturellement dans une journée chargée. Pas besoin d'être sportif, méditant ou psychologue pour en bénéficier.

L'ambition à terme : devenir l'équivalent français de Calm ou Headspace, avec une identité plus accessible, plus honnête et une infrastructure souveraine conforme aux exigences européennes.

---

## 2. Le problème résolu

Le mal-être au quotidien touche une part massive de la population française, tous âges et tous milieux confondus :

- **Plus de 2 Français sur 3** déclarent ressentir du stress régulièrement (IFOP, 2023)
- **1 Français sur 5** souffre de troubles du sommeil chroniques
- **La procrastination et le manque de concentration** sont des plaintes universelles amplifiées par les réseaux sociaux
- **L'anxiété diffuse** touche aussi bien les lycéens que les cadres, les parents que les retraités actifs

Les solutions existantes ont des lacunes importantes :

| Problème | Détail |
|---|---|
| Langue | Les apps leaders mondiales (Calm, Headspace, Fabulous) sont en anglais ou mal traduites |
| Prix | 50 à 100€/an, perçu comme trop cher pour un usage quotidien |
| Complexité | Interfaces surchargées, trop de contenu, on ne sait pas par où commencer |
| Confiance | Hébergement aux États-Unis, opacité sur l'usage des données personnelles sensibles |
| Manque de personnalisation | Pas d'adaptation au contexte de vie de l'utilisateur (parent, salarié, étudiant, retraité) |

---

## 3. La solution

Une PWA (Progressive Web App) française avec :

- Des **micro-routines de 3 à 15 minutes** organisées par besoin, durée, moment de la journée et profil de vie
- Un **suivi d'humeur quotidien** en 5 secondes pour visualiser sa progression dans le temps
- Des **programmes structurés** de 7 à 21 jours pour créer de vraies habitudes durables
- Des **notifications intelligentes** adaptées aux préférences et aux habitudes de chaque utilisateur
- Une **personnalisation par profil** : parent, salarié, étudiant, senior actif, freelance
- Un **modèle freemium** accessible : gratuit pour commencer, abonnement raisonnable pour tout débloquer
- Une infrastructure **100% française et européenne** (Scaleway) conforme RGPD dès le premier jour

### Ce qui nous différencie

| Critère | Calm / Headspace | Notre app |
|---|---|---|
| Langue | Anglais principalement | Français natif |
| Prix | 60–100€/an | 39€/an |
| Hébergement | USA | France (Scaleway) |
| Personnalisation | Générique | Par profil de vie |
| Durée des exercices | 10–30 min | 3–15 min |
| Conformité RGPD | Partielle | Complète |

---

## 4. Public cible

Le bien-être est un besoin universel. L'app s'adresse à toute personne francophone souhaitant mieux gérer son quotidien émotionnel et physique.

### Segments principaux

| Segment | Âge | Problème principal | Message clé |
|---|---|---|---|
| Étudiants | 18–26 ans | Stress examens, manque de sommeil | "5 minutes suffisent entre deux cours" |
| Jeunes actifs | 25–35 ans | Burn-out, surcharge cognitive, anxiété | "Reprends le contrôle de ton énergie" |
| Parents | 30–45 ans | Fatigue, manque de temps pour soi | "Prends soin de toi pour mieux prendre soin des autres" |
| Salariés stressés | 35–55 ans | Pression professionnelle, troubles du sommeil | "Un outil discret, efficace, utilisable au bureau" |
| Seniors actifs | 55–70 ans | Maintien du bien-être, mobilité, sérénité | "Doux, guidé, à ton rythme" |

### Profils types détaillés

**Sarah, 28 ans, chargée de projet en startup**
Journées de 10 heures, réunions en continu, difficulté à décompresser le soir. Elle cherche quelque chose qu'elle peut faire dans le métro ou pendant sa pause déjeuner. Elle est prête à payer si ça l'aide vraiment.

**Mohamed, 21 ans, BTS informatique**
Stress des partiels, dort à 2h du matin, scroll son téléphone pour s'endormir. Il ne connaît pas la méditation mais est ouvert à essayer si c'est simple et court.

**Claire, 41 ans, mère de deux enfants, infirmière**
Épuisement professionnel et personnel. Elle n'a pas 30 minutes pour elle mais elle a 5 minutes. Elle veut quelque chose de concret, pas de la philosophie.

**Jean-Pierre, 62 ans, retraité récent**
Cherche à maintenir son équilibre mental et physique. Apprécie les instructions claires, les exercices doux, une interface simple sans surcharge visuelle.

---

## 5. Fonctionnalités

### MVP — Semaines 1 à 10

| Fonctionnalité | Description | Priorité |
|---|---|---|
| Onboarding personnalisé | 4 questions : profil de vie, objectif principal, disponibilité quotidienne, heure de rappel | 🔴 Indispensable |
| Catalogue de routines | 15 routines organisées par catégorie, durée et moment | 🔴 Indispensable |
| Lecteur de routine | Affichage étape par étape avec minuteur intégré | 🔴 Indispensable |
| Suivi d'humeur quotidien | Score 1 à 5 avec émoji + note libre optionnelle | 🔴 Indispensable |
| Recommandations contextuelles | Suggestions basées sur l'humeur du jour et le moment | 🔴 Indispensable |
| Système de streak | Compteur de jours consécutifs d'activité | 🟡 Important |
| Graphique de progression | Courbe d'humeur sur 7 et 30 jours | 🟡 Important |
| Notifications push | Rappel quotidien à l'heure choisie | 🟡 Important |
| Authentification | Inscription / connexion sécurisée via Auth.js | 🔴 Indispensable |
| Paiement | Abonnement mensuel et annuel via Stripe | 🔴 Indispensable |

### V2 — Mois 3 à 6

| Fonctionnalité | Description |
|---|---|
| Programmes structurés | Parcours de 7 et 21 jours avec progression logique |
| Analyse NLP des émotions | Analyse du journal de bord avec CamemBERT pour détecter les tendances émotionnelles |
| Audio guidé | Voix de guidage pour les routines de respiration et méditation |
| Contenu saisonnier | Routines spéciales périodes d'examens, rentrée, fêtes, hiver |
| Tableau de bord avancé | Statistiques détaillées sur l'historique, les catégories préférées, les progrès |

### V3 — Mois 9 à 18

| Fonctionnalité | Description |
|---|---|
| App native iOS & Android | Migration de la PWA vers une app native pour de meilleures performances |
| Transcription vocale | Journal de bord vocal avec Faster-Whisper |
| Espace professionnel | Tableau de bord pour thérapeutes, coachs, médecins qui prescrivent l'app |
| Contenu expert | Programmes rédigés par des psychologues et coachs certifiés |
| Mode hors ligne complet | Toutes les routines accessibles sans connexion internet |

---

## 6. Catalogue de contenu

### Organisation du contenu

Chaque routine est définie par les attributs suivants dans la base de données :

| Attribut | Valeurs possibles |
|---|---|
| Catégorie | Stress, Sommeil, Concentration, Mouvement, Émotions, Énergie, Respiration, Journaling |
| Durée | 3 min, 5 min, 10 min, 15 min |
| Moment | Matin, Après-midi, Soir, Nuit, N'importe quand |
| Niveau | Débutant, Intermédiaire, Avancé |
| Profil | Universel, Salarié, Parent, Senior, Étudiant |
| Humeur déclencheur | Anxieux, Fatigué, Démotivé, Tendu, Agité, N'arrive pas à dormir |
| Format | Texte guidé, Audio (V2), Vidéo (V3) |

### Catégories et volume de contenu prévu

| Catégorie | MVP | V2 | V3 |
|---|---|---|---|
| Stress & anxiété | 3 routines | 15 routines | 30 routines |
| Sommeil & récupération | 3 routines | 12 routines | 25 routines |
| Concentration & productivité | 2 routines | 10 routines | 20 routines |
| Mouvement & corps | 2 routines | 10 routines | 20 routines |
| Émotions & mental | 3 routines | 10 routines | 20 routines |
| Énergie & vitalité | 2 routines | 8 routines | 15 routines |
| **Total** | **15** | **65** | **130+** |

### Stratégie de production du contenu

**Phase MVP :** Rédaction manuelle des 15 premières routines par le fondateur. Format court, structuré, validé par des sources sérieuses (psychologie positive, sophrologie, pleine conscience).

**Phase V2 :** Collaboration avec des étudiants en psychologie, STAPS ou ostéopathie. Échange de visibilité ou petite rémunération par routine produite.

**Phase V3 :** Partenariats avec des professionnels certifiés (psychologues, coachs de vie, kinés) qui publient leurs propres programmes dans l'app contre une commission.

---

## 7. Architecture technique

### Vue d'ensemble

```
Utilisateur (téléphone / ordinateur)
        |
        | HTTPS
        v
   PWA Frontend
   (HTML/CSS/JS)
        |
        | API REST (JSON)
        v
  Backend FastAPI
     (Python)
        |
        |— PostgreSQL (données utilisateurs, routines, humeurs)
        |— Redis (sessions, streaks, cache)
        |— Auth.js (authentification)
        |— Stripe (paiements)
        |— HuggingFace API (NLP émotions — V2)
        |— Faster-Whisper (transcription vocale — V3)
        |
        v
  Scaleway (hébergement France)
```

### Stack technologique détaillée

| Couche | Technologie | Justification |
|---|---|---|
| Backend | FastAPI (Python) | Rapide, moderne, documentation automatique, idéal pour les APIs |
| Base de données principale | PostgreSQL | Fiable, relationnel, parfait pour les données structurées |
| Cache & sessions | Redis | Gestion rapide des streaks, sessions, notifications |
| Authentification | Auth.js | Déjà maîtrisé, supporte OAuth Google/Apple + email |
| Paiement | Stripe | Standard du marché, facile à intégrer, gère l'abonnement |
| Frontend | PWA (HTML/CSS/JS) | Pas d'App Store, mise à jour instantanée, installable sur mobile |
| NLP émotions (V2) | HuggingFace + CamemBERT | Analyse de sentiment en français, open source |
| Voix (V3) | Faster-Whisper | Transcription vocale rapide, auto-hébergeable |
| Hébergement | Scaleway | Français, souverain, RGPD natif, tarifs compétitifs |
| Monitoring | Prometheus + Grafana | Observabilité complète de l'infrastructure |
| Analytics produit | PostHog | Open source, auto-hébergeable, RGPD-friendly |

### Structure du projet

```
Inspir/
├── app/
│   ├── __init__.py
│   ├── main.py                  ← point d'entrée FastAPI
│   ├── config.py                ← variables d'environnement
│   ├── database.py              ← connexion PostgreSQL
│   ├── docker                   ← configuration Docker de l'app
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py              ← table utilisateurs
│   │   ├── routine.py           ← table routines
│   │   ├── session.py           ← table sessions (routine complétée)
│   │   ├── mood.py              ← table suivi d'humeur
│   │   └── streak.py            ← table streaks
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py              ← inscription, connexion, déconnexion
│   │   ├── routines.py          ← liste, détail, filtres
│   │   ├── sessions.py          ← complétion d'une routine
│   │   ├── moods.py             ← enregistrement et historique d'humeur
│   │   ├── streaks.py           ← calcul et affichage du streak
│   │   └── payments.py          ← webhooks Stripe, gestion abonnement
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py      ← logique d'authentification JWT
│   │   ├── recommendations.py   ← logique de suggestion de routines
│   │   ├── notifications.py     ← envoi des push notifications
│   │   ├── redis_service.py     ← interactions avec Redis
│   │   └── analytics.py         ← événements produit
│   └── schemas/
│       ├── __init__.py
│       ├── user.py              ← validation des données utilisateur
│       ├── routine.py           ← validation des données routine
│       └── mood.py              ← validation des données humeur
├── migrations/                  ← migrations Alembic
│   ├── env.py
│   ├── README
│   ├── script.py.mako
│   └── versions/
│       └── 40708b00e628_create_users_and_routines_tables.py
├── seeds/                       ← scripts d'insertion des routines initiales
├── tests/                       ← tests unitaires et d'intégration
├── docs/
│   ├── Documentation.md         ← documentation complète du projet
│   └── info.md
├── guide/
│   ├── guide_semaine_1.md
│   └── guide_semaine_2.md
├── alembic.ini                  ← configuration Alembic
├── docker-compose.yml           ← orchestration Docker (PostgreSQL, Redis)
├── requirements.txt             ← dépendances Python
├── README.md
├── .env                         ← clés secrètes (jamais sur Git)
└── .env.example                 ← modèle de variables d'environnement
```

### Modèle de données principal

**Table users**
```
id                UUID        clé primaire
email             VARCHAR     unique, indexé
prenom            VARCHAR
objectif          VARCHAR     ex: "stress", "sommeil", "concentration"
profil_vie        VARCHAR     ex: "etudiant", "salarie", "parent"
disponibilite     INTEGER     minutes par jour
heure_rappel      TIME
is_premium        BOOLEAN     false par défaut
stripe_customer   VARCHAR     identifiant Stripe
created_at        TIMESTAMP
```

**Table routines**
```
id                UUID        clé primaire
titre             VARCHAR
description       TEXT
categorie         VARCHAR
duree_minutes     INTEGER
moment            VARCHAR
niveau            VARCHAR
profil_cible      VARCHAR
etapes            JSONB       liste des étapes numérotées
is_premium        BOOLEAN
created_at        TIMESTAMP
```

**Table moods**
```
id                UUID        clé primaire
user_id           UUID        clé étrangère → users
score             INTEGER     1 à 5
note              TEXT        optionnel
date              DATE        indexée
created_at        TIMESTAMP
```

**Table sessions**
```
id                UUID        clé primaire
user_id           UUID        clé étrangère → users
routine_id        UUID        clé étrangère → routines
humeur_avant      INTEGER     1 à 5
humeur_apres      INTEGER     1 à 5
duree_reelle      INTEGER     secondes
completed_at      TIMESTAMP
```

**Table streaks**
```
id                UUID        clé primaire
user_id           UUID        unique, clé étrangère → users
jours_consecutifs INTEGER
derniere_activite DATE
record_personnel  INTEGER
```

---

## 8. Modèle économique

### Tiers d'abonnement

| Tier | Prix | Contenu inclus |
|---|---|---|
| Gratuit | 0€ | 5 routines, suivi d'humeur 7 jours, 1 programme découverte |
| Premium mensuel | 4,99€/mois | Tout le catalogue, historique illimité, programmes complets, notifications avancées |
| Premium annuel | 39€/an (~3,25€/mois) | Idem mensuel + 2 mois offerts |
| Famille | 7,99€/mois | Jusqu'à 5 profils sous un même abonnement |

### Projections de revenus

| Mois | Utilisateurs inscrits | Taux de conversion premium | MRR estimé |
|---|---|---|---|
| Mois 1 | 100 | 5% | 25€ |
| Mois 3 | 500 | 8% | 200€ |
| Mois 6 | 2 000 | 10% | 1 000€ |
| Mois 12 | 8 000 | 12% | 4 800€ |
| Mois 18 | 20 000 | 15% | 15 000€ |

Ces chiffres sont conservateurs. Un seul partenariat avec une mutuelle, une entreprise ou une université peut multiplier l'acquisition par 10.

### Autres sources de revenus (V2 et V3)

- **B2B entreprises** : licences pour les services RH qui veulent proposer l'app à leurs salariés (50–200€/salarié/an)
- **Partenariats mutuelles** : remboursement partiel de l'abonnement par certaines mutuelles qui couvrent les applications de bien-être
- **Marketplace de programmes** : commission de 20–30% sur les programmes vendus par des coachs ou psychologues indépendants
- **Contenu sponsorisé** : partenariats avec des marques alignées (thé, aromathérapie, matériel de yoga) — uniquement si non intrusif

---

## 9. Conformité RGPD & HDS

### Pourquoi c'est un avantage concurrentiel

Les données de bien-être sont parmi les plus sensibles qui existent. Humeur, émotions, comportements, potentiellement des données de santé mentale. Les utilisateurs français sont de plus en plus conscients de cela. Afficher clairement une posture souveraine et transparente crée une confiance que Calm ou Headspace ne peuvent pas offrir.

### Mesures RGPD implementées dès le MVP

| Mesure | Détail |
|---|---|
| Hébergement France | Toutes les données stockées sur Scaleway (Paris) |
| Consentement explicite | Pas de cases pré-cochées, consentement clair pour chaque type de donnée |
| Droit à l'effacement | Suppression complète du compte et de toutes les données en 1 clic |
| Droit à la portabilité | Export de toutes ses données en JSON ou CSV |
| Minimisation des données | On ne collecte que ce qui est strictement nécessaire |
| Chiffrement | Données chiffrées au repos et en transit (HTTPS obligatoire) |
| Politique de confidentialité | Rédigée en français clair, sans jargon juridique |

### Attention HDS (Hébergement de Données de Santé)

Si l'application propose un suivi de symptômes psychologiques, une connexion avec des professionnels de santé ou se positionne comme un outil thérapeutique, elle entre dans la catégorie des données de santé au sens du Code de la santé publique, ce qui nécessite une certification HDS.

**Pour le MVP :** Rester dans le domaine du bien-être général, pas de la santé. Éviter les termes comme "thérapie", "traitement", "symptômes".

**Pour V3 :** Anticiper la certification HDS si l'app évolue vers une collaboration avec des professionnels de santé. Scaleway propose un hébergement certifié HDS.

---

## 10. Stratégie d'acquisition

### Phase 1 — Lancement (mois 1 et 2) : 0€ de budget

L'objectif est d'atteindre les 500 premiers utilisateurs sans dépenser en publicité.

**Réseau personnel et campus**
Partager l'app dans son entourage immédiat, les groupes WhatsApp de classe, les serveurs Discord d'étudiants. Objectif : 50 premiers utilisateurs dans la première semaine.

**Communautés en ligne**
Publier sur r/france, r/sante, r/developpement_personnel, les groupes Facebook de développement personnel en français. Ne pas spammer : apporter de la valeur d'abord (articles, conseils) puis mentionner l'app.

**BDE et associations étudiantes**
Contacter les BDE de 3 à 5 universités locales. Proposer l'app gratuitement aux membres en échange d'une communication. Un seul partenariat BDE peut générer 200 à 500 inscriptions.

**Contenu TikTok et Instagram Reels**
Créer du contenu court autour du stress, du sommeil, de la productivité. Pas de publicité pour l'app, juste de la valeur. La communauté vient naturellement si le contenu est utile.

### Phase 2 — Croissance (mois 3 à 6) : budget limité

**SEO (référencement naturel)**
Rédiger des articles de blog optimisés sur des requêtes comme "comment gérer le stress au travail", "technique de respiration pour dormir", "routine bien-être quotidienne". Le trafic organique est gratuit et durable.

**Partenariats mutuelles et entreprises**
Contacter les services RH de PME locales et les mutuelles étudiantes (LMDE, SMERRA). Proposer un accès de groupe à tarif préférentiel.

**Programme d'ambassadeurs**
Offrir 3 mois premium à des micro-influenceurs bien-être (5 000 à 50 000 abonnés) en échange d'un post authentique. Plus efficace et moins cher que la pub payante.

### Phase 3 — Accélération (mois 6+) : budget publicité

**Meta Ads ciblés**
Publicités Facebook et Instagram sur des audiences précises : intérêts bien-être, méditation, yoga, développement personnel. Budget initial 200 à 500€/mois, optimisé selon le coût d'acquisition.

**Google Ads**
Cibler les requêtes à forte intention : "application méditation français", "gestion stress application", "application sommeil iPhone".

---

## 11. Plan de développement — 10 semaines

### Semaine 1 — Mise en place de l'environnement

**Objectif :** Avoir une base technique solide avant d'écrire la moindre fonctionnalité.

**Tâches concrètes :**

1. Créer le dépôt GitHub avec une structure claire (branches `main`, `develop`, `feature/*`)
2. Initialiser le projet FastAPI avec la structure de dossiers définie plus haut
3. Configurer PostgreSQL en local et créer les premières tables (users, routines)
4. Configurer Redis en local pour les sessions
5. Mettre en place Auth.js pour l'inscription et la connexion
6. Créer le fichier `.env` avec toutes les variables d'environnement nécessaires
7. Écrire un `README.md` clair pour documenter le projet

**Livrable :** Un serveur FastAPI qui démarre, une base de données avec les tables de base, une page de connexion fonctionnelle.

---

### Semaine 2 — Contenu et données

**Objectif :** Avoir toutes les routines rédigées et insérées en base de données.

**Tâches concrètes :**

1. Rédiger les 15 premières routines dans un fichier structuré (titre, description, catégorie, durée, étapes)
2. Créer le modèle SQLAlchemy pour la table `routines`
3. Écrire le script `seed.py` qui insère les 15 routines en base de données automatiquement
4. Créer les endpoints API : `GET /api/routines` et `GET /api/routines/{id}`
5. Tester les endpoints avec Postman ou l'interface automatique de FastAPI (`/docs`)

**Livrable :** 15 routines consultables via l'API.

---

### Semaine 3 — Frontend de base et affichage des routines

**Objectif :** L'utilisateur peut voir et lire les routines sur son téléphone.

**Tâches concrètes :**

1. Créer la structure HTML de base de la PWA
2. Configurer le fichier `manifest.json` pour que l'app soit installable sur mobile
3. Créer le Service Worker pour le fonctionnement hors ligne basique
4. Développer la page d'accueil avec la liste des routines sous forme de cartes
5. Développer la page de détail d'une routine avec affichage étape par étape
6. Intégrer un minuteur simple pour les exercices chronométrés
7. Rendre l'interface responsive (adaptée à toutes les tailles d'écran)

**Livrable :** Interface mobile fonctionnelle où l'on peut naviguer dans les routines.

---

### Semaine 4 — Authentification et profil utilisateur

**Objectif :** L'utilisateur peut créer un compte, se connecter et avoir un profil persistant.

**Tâches concrètes :**

1. Intégrer Auth.js côté frontend (formulaires d'inscription et de connexion)
2. Connecter Auth.js au backend FastAPI
3. Développer l'onboarding en 4 questions (profil de vie, objectif, disponibilité, heure de rappel)
4. Sauvegarder les réponses d'onboarding dans le profil utilisateur en base de données
5. Créer la page profil avec les informations de base
6. Protéger les routes de l'API qui nécessitent d'être connecté (middleware d'authentification)

**Livrable :** Inscription, connexion et onboarding fonctionnels.

---

### Semaine 5 — Suivi d'humeur

**Objectif :** L'utilisateur peut enregistrer son humeur quotidienne et voir son évolution.

**Tâches concrètes :**

1. Créer le modèle et les endpoints pour la table `moods`
2. Développer l'interface de saisie d'humeur (5 émojis ou couleurs, note optionnelle)
3. Afficher la question d'humeur en premier à chaque ouverture de l'app (si pas encore saisie aujourd'hui)
4. Développer le graphique d'évolution sur 7 jours (bibliothèque Chart.js)
5. Ajouter la vue historique sur 30 jours
6. Relier l'humeur aux recommandations : si humeur basse → suggérer une routine "stress" ou "énergie"

**Livrable :** Suivi d'humeur quotidien complet avec visualisation.

---

### Semaine 6 — Système de streak et gamification

**Objectif :** Créer la mécanique d'habitude qui fait revenir l'utilisateur chaque jour.

**Tâches concrètes :**

1. Créer le modèle et les endpoints pour la table `streaks`
2. Créer la logique de calcul : le streak augmente si l'utilisateur fait une routine ou enregistre son humeur dans la journée
3. Implémenter la règle de remise à zéro si un jour est manqué
4. Afficher le streak en évidence sur la page d'accueil
5. Afficher une animation ou un message encourageant à chaque milestone (7 jours, 21 jours, 30 jours)
6. Créer la table `sessions` pour enregistrer chaque routine complétée avec l'humeur avant/après

**Livrable :** Système de streak fonctionnel et motivant.

---

### Semaine 7 — Notifications push

**Objectif :** L'app rappelle l'utilisateur chaque jour à l'heure choisie.

**Tâches concrètes :**

1. Configurer les Web Push Notifications dans la PWA (API Notifications du navigateur)
2. Mettre en place un serveur de notifications côté backend (bibliothèque `pywebpush`)
3. Demander la permission de notification lors de l'onboarding
4. Programmer l'envoi automatique à l'heure choisie par l'utilisateur
5. Personnaliser le message selon le contexte (premier lancement, streak en cours, longue absence)
6. Permettre à l'utilisateur de modifier son heure de rappel dans les paramètres

**Livrable :** Notifications push fonctionnelles sur iOS et Android.

---

### Semaine 8 — Moteur de recommandations

**Objectif :** L'app suggère les bonnes routines au bon moment selon le profil et l'humeur.

**Tâches concrètes :**

1. Développer le service `recommendations.py` qui croise : profil de vie, humeur du jour, heure de la journée, routines déjà faites
2. Afficher une section "Recommandé pour toi" sur la page d'accueil avec 3 routines personnalisées
3. Ajouter des filtres manuels sur le catalogue : par catégorie, par durée, par moment
4. Marquer les routines déjà complétées avec un indicateur visuel
5. Proposer une routine "surprise du jour" aléatoire dans une catégorie non encore explorée

**Livrable :** Système de recommandation personnalisé fonctionnel.

---

### Semaine 9 — Monétisation avec Stripe

**Objectif :** L'app peut encaisser des paiements réels et gérer les abonnements.

**Tâches concrètes :**

1. Créer un compte Stripe et configurer les produits (mensuel 4,99€, annuel 39€)
2. Intégrer Stripe Checkout côté frontend (boutons d'abonnement)
3. Développer les webhooks Stripe côté backend pour écouter les événements de paiement
4. Mettre à jour le champ `is_premium` de l'utilisateur automatiquement après paiement confirmé
5. Gérer les cas d'échec de paiement et d'annulation d'abonnement
6. Bloquer l'accès aux routines premium pour les utilisateurs non abonnés
7. Afficher une page de mise à niveau claire avec les avantages du premium

**Livrable :** Paiement et gestion d'abonnement fonctionnels.

---

### Semaine 10 — Déploiement et lancement

**Objectif :** L'app est en ligne, accessible depuis n'importe quel appareil dans le monde.

**Tâches concrètes :**

1. Créer un compte Scaleway et configurer un VPS (serveur privé virtuel)
2. Déployer le backend FastAPI avec Gunicorn + Nginx sur le VPS Scaleway
3. Configurer PostgreSQL et Redis en production
4. Déployer le frontend PWA via un CDN (Cloudflare ou Scaleway Object Storage)
5. Configurer un nom de domaine et un certificat SSL (HTTPS obligatoire)
6. Configurer les variables d'environnement de production (clés Stripe, clés Auth.js, base de données)
7. Mettre en place la surveillance avec Prometheus + Grafana
8. Faire des tests complets sur différents appareils (iPhone, Android, desktop)
9. Rédiger et publier la politique de confidentialité et les CGU
10. **Lancer officiellement** et partager autour de soi

**Livrable :** Application en production, accessible, sécurisée et monétisée.

---

## 12. Roadmap long terme

### Mois 3 à 6 — Version 2

- Ajouter 40 nouvelles routines pour atteindre 55 au total
- Lancer les premiers programmes structurés (7 jours anti-stress, 21 jours sommeil)
- Intégrer HuggingFace Inference API + CamemBERT pour l'analyse de sentiment du journal
- Ajouter l'audio guidé sur les routines de respiration et méditation
- Créer un contenu saisonnier (examens, rentrée, hiver)
- Lancer le programme d'ambassadeurs

### Mois 6 à 12 — Version 2.5

- Atteindre 100+ routines dans le catalogue
- Lancer l'offre B2B pour les entreprises
- Nouer les premiers partenariats avec des mutuelles
- Ouvrir un programme pour les coachs et psychologues indépendants
- Commencer le développement de l'app native iOS et Android

### Mois 12 à 18 — Version 3

- Lancer l'app native sur l'App Store et le Google Play Store
- Intégrer la transcription vocale pour le journal de bord (Faster-Whisper)
- Obtenir la certification HDS si nécessaire selon l'évolution du produit
- Explorer les marchés francophones : Belgique, Suisse, Canada, Afrique francophone
- Migrer le LLM conversationnel vers Mistral auto-hébergé sur Scaleway si besoin

---

## 13. Risques et comment les anticiper

| Risque | Probabilité | Impact | Solution |
|---|---|---|---|
| Faible rétention (les gens ouvrent 3 fois puis abandonnent) | Haute | Critique | Notifications intelligentes, streaks, nouveautés hebdomadaires, programmes structurés |
| Concurrence d'une grande app qui copie le concept | Moyenne | Moyen | Avance sur le marché, confiance des utilisateurs, données accumulées |
| Problème de conformité RGPD | Faible | Critique | Hébergement France dès le départ, pas de collecte inutile, politique claire |
| Bug critique en production | Moyenne | Élevé | Tests automatisés, monitoring Grafana, rollback rapide via Git |
| Coût serveur trop élevé | Faible | Moyen | Scaleway très compétitif, architecture optimisée, monitoring des coûts |
| Promesses thérapeutiques accidentelles | Moyenne | Critique | Relecture juridique de tous les textes, jamais de termes médicaux |
| Difficulté à acquérir les premiers utilisateurs | Haute | Élevé | Réseau personnel, BDE, communautés en ligne, contenu organique |

---

## 14. Les 15 routines du MVP

### Catégorie Stress & Anxiété (3 routines)

---

**Routine 1 — Respiration 4-7-8**
- Catégorie : Stress
- Durée : 5 minutes
- Niveau : Débutant
- Moment : N'importe quand

Étapes :
1. Installe-toi confortablement, dos droit, épaules relâchées
2. Expire complètement par la bouche en faisant un son doux
3. Ferme la bouche et inspire silencieusement par le nez en comptant jusqu'à 4
4. Retiens ta respiration en comptant jusqu'à 7
5. Expire complètement par la bouche en comptant jusqu'à 8
6. C'est un cycle complet. Répète ce cycle 4 fois
7. Observe comment ton corps se sent maintenant

---

**Routine 2 — Scan corporel rapide**
- Catégorie : Stress
- Durée : 7 minutes
- Niveau : Débutant
- Moment : Soir

Étapes :
1. Allonge-toi ou assieds-toi dans une position confortable
2. Ferme les yeux et prends 3 respirations profondes lentes
3. Porte ton attention sur tes pieds. Sont-ils tendus ? Laisse-les se détendre
4. Remonte lentement vers les mollets, les genoux, les cuisses
5. Relâche le ventre à chaque expiration
6. Dénoue les épaules, le cou, la mâchoire
7. Termine par le visage et le crâne
8. Reste immobile 1 minute en respirant calmement

---

**Routine 3 — Ancrage 5-4-3-2-1**
- Catégorie : Stress
- Durée : 3 minutes
- Niveau : Débutant
- Moment : N'importe quand

Étapes :
1. Regarde autour de toi et nomme mentalement 5 choses que tu vois
2. Nomme 4 choses que tu peux toucher autour de toi. Touche-les
3. Nomme 3 sons que tu entends en ce moment
4. Nomme 2 odeurs que tu perçois ou que tu aimes
5. Nomme 1 chose que tu goûtes ou que tu apprécies vraiment
6. Prends une grande inspiration et expire lentement. Tu es ici, maintenant

---

### Catégorie Sommeil & Récupération (3 routines)

---

**Routine 4 — Routine du soir déconnectée**
- Catégorie : Sommeil
- Durée : 10 minutes
- Niveau : Débutant
- Moment : Soir

Étapes :
1. Pose ton téléphone à l'autre bout de la pièce ou dans une autre pièce
2. Tamise la lumière de ta chambre ou éteins le plafond
3. Assieds-toi sur ton lit et note sur papier ou dans l'app 3 choses qui se sont bien passées aujourd'hui
4. Note 1 chose que tu feras demain (pour vider ta tête)
5. Allonge-toi et pratique la respiration 4-7-8 pendant 3 cycles
6. Garde les yeux fermés et laisse ton esprit dériver sans chercher à t'endormir

---

**Routine 5 — Relâchement musculaire progressif**
- Catégorie : Sommeil
- Durée : 10 minutes
- Niveau : Débutant
- Moment : Nuit

Étapes :
1. Allonge-toi dans ton lit, bras le long du corps
2. Contracte fortement les muscles de tes pieds pendant 5 secondes, puis relâche complètement
3. Fais de même avec les mollets (5 secondes, relâche)
4. Cuisses (5 secondes, relâche)
5. Ventre (5 secondes, relâche)
6. Poings serrés (5 secondes, relâche)
7. Épaules remontées vers les oreilles (5 secondes, relâche)
8. Visage grimaçant (5 secondes, relâche)
9. Observe le relâchement total de ton corps et laisse le sommeil venir

---

**Routine 6 — Micro-sieste guidée**
- Catégorie : Sommeil
- Durée : 15 minutes
- Niveau : Débutant
- Moment : Après-midi

Étapes :
1. Mets une alarme dans 20 minutes (pour ne pas dépasser)
2. Allonge-toi ou incline ton siège au maximum
3. Ferme les yeux et respire lentement
4. Visualise un endroit calme et agréable que tu connais
5. Ne cherche pas à t'endormir, cherche juste à te reposer
6. Quand l'alarme sonne, étire-toi lentement avant de te lever

---

### Catégorie Concentration & Productivité (2 routines)

---

**Routine 7 — Mise en route mentale**
- Catégorie : Concentration
- Durée : 5 minutes
- Niveau : Débutant
- Moment : Matin

Étapes :
1. Avant d'ouvrir ton ordinateur, assieds-toi tranquillement 2 minutes
2. Pose-toi cette question : quelle est la chose la plus importante que je dois accomplir aujourd'hui ?
3. Écris-la ou note-la mentalement
4. Prends 5 respirations profondes en te concentrant uniquement sur l'air qui entre et sort
5. Ouvre les yeux, étire tes bras au plafond, et commence

---

**Routine 8 — Pause active entre deux tâches**
- Catégorie : Concentration
- Durée : 5 minutes
- Niveau : Débutant
- Moment : Après-midi

Étapes :
1. Éloigne-toi de ton écran et de ton bureau
2. Lève-toi et marche lentement pendant 2 minutes (même dans une petite pièce)
3. Fais 10 rotations des épaules vers l'arrière
4. Étire le cou : oreille vers l'épaule droite 30 secondes, puis gauche
5. Bois un verre d'eau lentement
6. Reviens à ton poste avec une tâche précise en tête

---

### Catégorie Mouvement & Corps (2 routines)

---

**Routine 9 — Étirements de bureau**
- Catégorie : Mouvement
- Durée : 7 minutes
- Niveau : Débutant
- Moment : N'importe quand

Étapes :
1. Debout, croise les doigts et étire les bras au plafond, paumes vers le haut. Tiens 30 secondes
2. Penche-toi doucement sur le côté droit, bras gauche au plafond. 30 secondes. Recommence à gauche
3. Assis, croise les jambes et tords le buste vers la droite en posant la main gauche sur le genou droit. 30 secondes chaque côté
4. Debout, plie légèrement les genoux, roule les épaules 10 fois vers l'avant, 10 vers l'arrière
5. Termine en secouant doucement les mains et les poignets pendant 30 secondes

---

**Routine 10 — Réveil en douceur**
- Catégorie : Mouvement
- Durée : 5 minutes
- Niveau : Débutant
- Moment : Matin

Étapes :
1. Avant de sortir du lit, allonge-toi sur le dos et ramène les deux genoux vers la poitrine. Tiens 30 secondes
2. Toujours allongé, laisse tomber les genoux sur le côté droit, tête tournée à gauche. 30 secondes
3. Recommence de l'autre côté
4. Assis sur le bord du lit, roule les chevilles 10 fois dans chaque sens
5. Lève-toi lentement, étire les bras au plafond et bâille franchement
6. Bois un grand verre d'eau avant toute chose

---

### Catégorie Émotions & Mental (3 routines)

---

**Routine 11 — Journaling des 3 gratitudes**
- Catégorie : Émotions
- Durée : 5 minutes
- Niveau : Débutant
- Moment : Matin ou Soir

Étapes :
1. Prends un carnet ou utilise la zone de note de l'app
2. Écris 3 choses pour lesquelles tu es reconnaissant aujourd'hui. Petites ou grandes, peu importe
3. Pour chacune, écris une phrase sur pourquoi elle compte pour toi
4. Relis ce que tu as écrit
5. Prends une respiration et remarque ce que tu ressens

---

**Routine 12 — Lettre à soi-même**
- Catégorie : Émotions
- Durée : 10 minutes
- Niveau : Intermédiaire
- Moment : Soir

Étapes :
1. Assieds-toi dans un endroit calme avec de quoi écrire
2. Commence par : "Aujourd'hui j'ai ressenti..."
3. Écris librement pendant 5 minutes sans corriger, sans relire
4. Termine par : "Ce dont j'ai besoin en ce moment, c'est..."
5. Pose ton stylo, relis uniquement la dernière phrase
6. Prends soin de ce besoin, même par un petit geste ce soir

---

**Routine 13 — Recadrage cognitif rapide**
- Catégorie : Émotions
- Durée : 5 minutes
- Niveau : Intermédiaire
- Moment : N'importe quand

Étapes :
1. Identifie une pensée négative qui tourne en boucle. Écris-la
2. Pose-toi cette question : est-ce que cette pensée est un fait ou une interprétation ?
3. Écris une version plus neutre de cette pensée (ni positive forcée, ni catastrophiste)
4. Demande-toi : qu'est-ce que je conseillerais à un ami qui aurait cette pensée ?
5. Lis ta version neutre à voix haute ou mentalement trois fois

---

### Catégorie Énergie & Vitalité (2 routines)

---

**Routine 14 — Boost d'énergie en 3 minutes**
- Catégorie : Énergie
- Durée : 3 minutes
- Niveau : Débutant
- Moment : Après-midi

Étapes :
1. Debout, secoue énergiquement les mains et les bras pendant 30 secondes
2. Tape doucement avec les poings fermés sur ta poitrine (sternum) 20 fois
3. Frictionne tes paumes énergiquement l'une contre l'autre pendant 20 secondes
4. Pose les paumes chaudes sur tes yeux fermés. Reste ainsi 20 secondes
5. Prends 3 grandes inspirations rapides par le nez, puis expire lentement
6. Souris volontairement pendant 10 secondes (l'effet est réel, même forcé)

---

**Routine 15 — Hydratation et pause consciente**
- Catégorie : Énergie
- Durée : 5 minutes
- Niveau : Débutant
- Moment : N'importe quand

Étapes :
1. Remplis un grand verre d'eau froide
2. Bois-le lentement, gorgée par gorgée, sans faire autre chose en même temps
3. Pose le verre et ferme les yeux 1 minute
4. Remarque comment ton corps se sent après avoir bu
5. Observe si tu as faim, froid, chaud, si tu as besoin de bouger
6. Réponds à un besoin que tu as identifié, même par un petit geste immédiat

---

## Résumé exécutif

| Élément | Détail |
|---|---|
| Nom du projet | À définir (ex: Sérène, Ancrage, Zenith, Fleur) |
| Type | PWA bien-être grand public |
| Marché | Francophones, tous âges et profils |
| Stack | FastAPI, PostgreSQL, Redis, Auth.js, Stripe, Scaleway |
| MVP en | 10 semaines |
| Prix | Gratuit / 4,99€ mois / 39€ an |
| Hébergement | Scaleway France — RGPD natif |
| Objectif 12 mois | 8 000 utilisateurs, 960 abonnés premium, ~4 800€ MRR |
| Différenciation | Français, souverain, accessible, micro-habitudes, personnalisé par profil |

---

*Document rédigé le 21 avril 2026 — Version 1.0*
*À mettre à jour à chaque évolution majeure du projet*