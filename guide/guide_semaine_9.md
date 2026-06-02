# Semaine 9 — Paiement Stripe et fonctionnalités Premium

> Projet : Inspir — Bien-être & Micro-habitudes  
> Stack : FastAPI · PostgreSQL · Redis · Stripe · Scaleway  
> Dernière mise à jour : juin 2026

---

## Objectif de la semaine

À la fin de cette semaine, les utilisateurs peuvent **s'abonner à Inspir Premium** via Stripe. Concrètement :

- Une page `/premium.html` présente l'offre et lance le paiement via Stripe Checkout
- Le webhook Stripe met à jour `is_premium = True` en base après paiement
- Les routines premium sont débloquées automatiquement dans le frontend
- L'abonnement peut être géré (annulation) depuis la page profil
- Le badge "Premium actif" s'affiche dans le profil

---

## Prérequis

- [ ] Semaines 1 à 8 terminées
- [ ] Compte Stripe créé sur [dashboard.stripe.com](https://dashboard.stripe.com)
- [ ] Clés de test Stripe disponibles (`sk_test_...` et clé publique `pk_test_...`)
- [ ] `stripe==9.5.0` déjà dans `requirements.txt`

---

## Étape 1 — Créer le produit et le prix dans Stripe

### 1.1 Via le dashboard Stripe (mode test)

1. Va dans **Products** → **Add product**
2. Nom : `Inspir Premium`
3. Prix : `3.99 €` / mois (récurrent)
4. Copie le **Price ID** (format `price_xxx`) — tu en auras besoin

### 1.2 Mettre à jour `.env`

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...    # obtenu à l'étape 3
STRIPE_PRICE_ID=price_xxx          # le Price ID copié ci-dessus
STRIPE_SUCCESS_URL=http://localhost:8000/premium-succes.html
STRIPE_CANCEL_URL=http://localhost:8000/premium.html
```

### 1.3 Mettre à jour `app/config.py`

```python
STRIPE_PRICE_ID:    str = ""
STRIPE_SUCCESS_URL: str = "http://localhost:8000/premium-succes.html"
STRIPE_CANCEL_URL:  str = "http://localhost:8000/premium.html"
```

---

## Étape 2 — Endpoints Stripe

### 2.1 Compléter `app/routes/payments.py`

```python
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.config import settings
from app.services.auth_service import get_current_user

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/create-checkout-session")
async def create_checkout_session(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crée une session Stripe Checkout pour l'abonnement Premium.
    Retourne l'URL de redirection vers Stripe.
    """
    if current_user.is_premium:
        raise HTTPException(status_code=400, detail="Déjà abonné Premium")

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": settings.STRIPE_PRICE_ID, "quantity": 1}],
            success_url=settings.STRIPE_SUCCESS_URL + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=settings.STRIPE_CANCEL_URL,
            customer_email=current_user.email,
            metadata={"user_id": str(current_user.id)},
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Reçoit les événements Stripe (paiement réussi, abonnement annulé...).
    Stripe envoie des POST signés sur cette route.
    """
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Signature webhook invalide")

    # ── Paiement réussi → activer Premium ──────────────────────────────
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        customer_id = session.get("customer")

        if user_id:
            import uuid
            result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
            user = result.scalar_one_or_none()
            if user:
                user.is_premium = True
                user.stripe_customer = customer_id
                await db.commit()
                print(f"[Stripe] Premium activé pour {user.email}")

    # ── Abonnement annulé → révoquer Premium ──────────────────────────
    elif event["type"] in ("customer.subscription.deleted", "customer.subscription.paused"):
        subscription = event["data"]["object"]
        customer_id  = subscription.get("customer")

        if customer_id:
            result = await db.execute(select(User).where(User.stripe_customer == customer_id))
            user = result.scalar_one_or_none()
            if user:
                user.is_premium = False
                await db.commit()
                print(f"[Stripe] Premium révoqué pour {user.email}")

    return {"received": True}


@router.post("/create-portal-session")
async def create_portal_session(
    current_user=Depends(get_current_user),
):
    """
    Crée une session Stripe Customer Portal pour gérer l'abonnement (annulation, factures...).
    """
    if not current_user.stripe_customer:
        raise HTTPException(status_code=400, detail="Pas de compte Stripe associé")

    try:
        session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer,
            return_url="http://localhost:8000/profil.html",
        )
        return {"portal_url": session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

---

## Étape 3 — Configurer le webhook Stripe en local

### 3.1 Installer la Stripe CLI

```bash
# Mac (Homebrew)
brew install stripe/stripe-cli/stripe

# Ou télécharger sur https://github.com/stripe/stripe-cli/releases
```

### 3.2 S'authentifier et lancer l'écoute

```bash
stripe login
stripe listen --forward-to localhost:8000/api/payments/webhook
```

Le terminal affiche un `WEBHOOK_SIGNING_SECRET` (format `whsec_...`). Copie-le dans `.env` comme `STRIPE_WEBHOOK_SECRET`.

> **Important :** Garde ce terminal ouvert pendant les tests. Sans lui, les webhooks ne seront pas reçus.

---

## Étape 4 — Frontend : page Premium

### 4.1 Créer `frontend/premium.html`

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#4a7c59" />
  <title>Inspir Premium</title>
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="manifest" href="/manifest.json" />
</head>
<body>
  <header class="app-header" style="display:flex;justify-content:space-between;align-items:center;">
    <a href="/profil.html" class="retour-btn">← Retour</a>
    <span style="font-weight:700;">Inspir Premium</span>
    <span style="width:48px;"></span>
  </header>

  <main class="app-content">

    <div style="text-align:center;padding:24px 0 20px;">
      <div style="font-size:3rem;margin-bottom:8px;">⭐</div>
      <h1 style="font-size:1.6rem;font-weight:800;color:var(--couleur-texte);">Passe à Premium</h1>
      <p style="font-size:0.9rem;color:var(--couleur-texte-doux);margin-top:8px;line-height:1.5;">
        Accède à l'intégralité du catalogue<br>et soutiens un projet 100 % français.
      </p>
    </div>

    <!-- Tarif -->
    <div style="background:var(--couleur-fond-carte);border-radius:var(--rayon-bordure);padding:24px;text-align:center;box-shadow:var(--ombre-carte);margin-bottom:20px;border:2px solid #c9a227;">
      <div style="font-size:2.4rem;font-weight:800;color:var(--couleur-texte);">3,99 €<span style="font-size:1rem;font-weight:400;color:var(--couleur-texte-doux);">/mois</span></div>
      <div style="font-size:0.82rem;color:var(--couleur-texte-doux);margin-top:4px;">ou 29,99 €/an — 2 mois offerts</div>
      <div style="font-size:0.78rem;color:var(--couleur-principale);margin-top:8px;font-weight:600;">Essai 7 jours offert · Sans engagement</div>
    </div>

    <!-- Avantages -->
    <div style="background:var(--couleur-fond-carte);border-radius:var(--rayon-bordure);padding:16px 20px;box-shadow:var(--ombre-carte);margin-bottom:20px;">
      ${['✅ Toutes les routines premium débloquées',
         '✅ Suivi avancé (humeur, streaks, stats)',
         '✅ Accès en avant-première aux nouveautés',
         '✅ Sans pub, sans tracking externe',
         '✅ Hébergé en France · RGPD',
        ].map(f => `<div style="padding:8px 0;font-size:0.88rem;color:var(--couleur-texte);border-bottom:1px solid var(--couleur-bordure);">${f}</div>`).join('')}
    </div>

    <p class="erreur" id="erreur-stripe" style="display:none;margin-bottom:12px;"></p>
    <button class="btn-commencer" id="btn-payer" style="font-size:1.05rem;">
      ⭐ Commencer l'essai gratuit
    </button>
    <p style="text-align:center;font-size:0.78rem;color:var(--couleur-texte-doux);margin-top:12px;">
      Paiement sécurisé par Stripe · Annulable à tout moment
    </p>

  </main>

  <script src="/js/api.js"></script>
  <script src="/js/auth.js"></script>
  <script src="/js/premium.js"></script>
</body>
</html>
```

### 4.2 Créer `frontend/js/premium.js`

```javascript
document.getElementById('btn-payer').addEventListener('click', async () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/auth.html';
    return;
  }

  const btn = document.getElementById('btn-payer');
  btn.textContent = 'Redirection vers Stripe…';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/payments/create-checkout-session`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json();
      document.getElementById('erreur-stripe').textContent = err.detail;
      document.getElementById('erreur-stripe').style.display = 'block';
      btn.textContent = '⭐ Commencer l\'essai gratuit';
      btn.disabled = false;
      return;
    }

    const { checkout_url } = await res.json();
    window.location.href = checkout_url;
  } catch {
    document.getElementById('erreur-stripe').textContent = 'Erreur réseau, réessaie.';
    document.getElementById('erreur-stripe').style.display = 'block';
    btn.textContent = '⭐ Commencer l\'essai gratuit';
    btn.disabled = false;
  }
});
```

### 4.3 Créer `frontend/premium-succes.html`

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Merci — Inspir Premium</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <main class="app-content" style="text-align:center;padding-top:60px;">
    <div style="font-size:3rem;margin-bottom:16px;">🎉</div>
    <h1 style="font-size:1.5rem;font-weight:800;">Bienvenue dans Inspir Premium !</h1>
    <p style="font-size:0.9rem;color:var(--couleur-texte-doux);margin-top:10px;line-height:1.5;">
      Ton abonnement est activé. Toutes les routines sont désormais accessibles.
    </p>
    <a href="/" class="btn-commencer" style="display:inline-block;margin-top:28px;text-decoration:none;padding:14px 32px;">
      Découvrir les routines Premium →
    </a>
  </main>
  <script src="/js/api.js"></script>
  <script src="/js/auth.js"></script>
  <script>
    // Recharge le profil pour avoir is_premium à jour
    const token = getToken();
    if (token) apiGetMe(token).then(u => sauvegarderUser(u)).catch(() => {});
  </script>
</body>
</html>
```

### 4.4 Bloquer les routines premium dans `routine.html`

Dans `frontend/js/routine.js`, modifie `chargerRoutine` pour vérifier `is_premium` :

```javascript
async function chargerRoutine() {
  // ...
  const routine = await getRoutine(id);
  const user = getUser();

  // Si routine premium et utilisateur non premium
  if (routine.is_premium && (!user || !user.is_premium)) {
    document.getElementById('routine-titre').textContent = routine.titre;
    document.getElementById('contenu-routine').innerHTML = `
      <div style="text-align:center;padding:32px 20px;">
        <div style="font-size:2.5rem;margin-bottom:12px;">⭐</div>
        <h2 style="font-size:1.2rem;font-weight:700;margin-bottom:8px;">Routine Premium</h2>
        <p style="font-size:0.88rem;color:var(--couleur-texte-doux);margin-bottom:20px;line-height:1.5;">
          Cette routine fait partie du catalogue Premium.<br>Essai gratuit de 7 jours, sans engagement.
        </p>
        <a href="/premium.html" class="btn-commencer" style="text-decoration:none;display:inline-block;padding:14px 28px;">
          Débloquer avec Premium →
        </a>
      </div>
    `;
    return;
  }
  // ... suite normale
}
```

### 4.5 Ajouter les nouvelles pages dans `app/main.py`

```python
@app.get("/premium.html")
async def premium_page():
    return FileResponse(os.path.join(FRONTEND_DIR, "premium.html"))

@app.get("/premium-succes.html")
async def premium_succes_page():
    return FileResponse(os.path.join(FRONTEND_DIR, "premium-succes.html"))
```

---

## Étape 5 — Tester le flux complet

### Scénario de test (mode test Stripe)

1. Lance `inspir` **et** `stripe listen --forward-to localhost:8000/api/payments/webhook` dans un second terminal
2. Connecte-toi et accède à une routine premium → l'écran de blocage s'affiche
3. Clique "Débloquer avec Premium" → `/premium.html`
4. Clique "Commencer l'essai gratuit" → redirection vers Stripe Checkout
5. Remplis le formulaire avec une carte de test Stripe : `4242 4242 4242 4242`, n'importe quelle date future, CVC `123`
6. Stripe redirige vers `/premium-succes.html`
7. Le terminal Stripe CLI affiche `checkout.session.completed`
8. Vérifie en base :
```bash
psql -U bienetre_user -d bienetre_db -c "SELECT email, is_premium, stripe_customer FROM users WHERE email='ton@email.fr';"
```
9. Accède à nouveau à la routine premium → elle est maintenant accessible

---

## Étape 6 — Commit Git

```bash
git add app/routes/payments.py app/config.py
git add frontend/premium.html frontend/premium-succes.html
git add frontend/js/premium.js frontend/js/routine.js
git add app/main.py
git commit -m "feat(semaine-9): intégration Stripe, checkout, webhook, gating premium"
git push origin main
```

---

## Récapitulatif

| # | Action | Fichier |
|---|--------|---------|
| 1 | Créer produit/prix dans Stripe | dashboard.stripe.com |
| 2 | Mettre à jour `.env` et config | `.env` + `app/config.py` |
| 3 | Endpoints Stripe | `app/routes/payments.py` |
| 4 | Stripe CLI webhook | `stripe listen --forward-to ...` |
| 5 | Page premium | `frontend/premium.html` + `premium.js` |
| 6 | Page succès | `frontend/premium-succes.html` |
| 7 | Blocage routines premium | `frontend/js/routine.js` |
| 8 | Nouvelles routes main.py | `app/main.py` |
| 9 | Test flux complet | carte `4242 4242...` |
| 10 | Commit | `git commit -m "feat(semaine-9)..."` |

---

## Livrable de fin de semaine 9

✅ Stripe Checkout fonctionnel (mode test)  
✅ Webhook reçoit et traite `checkout.session.completed`  
✅ `is_premium` mis à jour en base après paiement  
✅ Routines premium bloquées pour les non-abonnés  
✅ Page de succès après paiement  
✅ Endpoint portal Stripe pour gérer l'abonnement

---

## Points d'attention

**Ne jamais exposer `sk_test_...` en frontend.** La clé secrète Stripe ne doit être que dans le backend. Le frontend utilise uniquement `pk_test_...` si besoin, ou communique via les endpoints FastAPI.

**Webhooks en production.** En production, l'URL du webhook doit être configurée dans le dashboard Stripe sous **Developers → Webhooks**. La Stripe CLI est uniquement pour le développement local.

**Annulation d'abonnement.** Quand Stripe envoie `customer.subscription.deleted`, le webhook révoque le premium. L'utilisateur conserve l'accès jusqu'à la fin de la période payée — cette logique peut être affinée avec les timestamps Stripe.

---

*Prochaine étape : Semaine 10 — Recommandations personnalisées*
