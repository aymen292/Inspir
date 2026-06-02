# Semaine 8 — Notifications push Web

> Projet : Inspir — Bien-être & Micro-habitudes  
> Stack : FastAPI · PostgreSQL · Redis · Stripe · Scaleway  
> Dernière mise à jour : juin 2026

---

## Objectif de la semaine

À la fin de cette semaine, les utilisateurs reçoivent une **notification push quotidienne** à l'heure qu'ils ont choisie pendant l'onboarding. Concrètement :

- Le Service Worker gère les notifications push côté frontend
- Le frontend demande la permission et envoie la souscription push au backend
- Le backend stocke les souscriptions en base et envoie les rappels via `pywebpush`
- Un script cron ou un endpoint admin déclenche l'envoi quotidien
- L'utilisateur peut activer/désactiver les notifications depuis sa page profil

---

## Prérequis

- [ ] Semaine 7 terminée
- [ ] Service Worker `sw.js` déjà en place (semaine 3)
- [ ] `heure_rappel` stocké dans le modèle `User` (semaine 4)
- [ ] `pywebpush` dans `requirements.txt` (semaine 1)

---

## Étape 1 — Générer les clés VAPID

Les notifications Web Push utilisent une paire de clés VAPID pour l'authentification.

### 1.1 Générer les clés

```bash
source venv/bin/activate
python3 -c "
from py_vapid import Vapid
v = Vapid()
v.generate_keys()
print('VAPID_PUBLIC_KEY:', v.public_key.decode())
print('VAPID_PRIVATE_KEY:', v.private_key.decode())
"
```

> Si `py_vapid` n'est pas installé :
> ```bash
> pip install py-vapid
> echo "py-vapid==1.9.1" >> requirements.txt
> ```

### 1.2 Ajouter les clés dans `.env`

```env
VAPID_PUBLIC_KEY=BHxk...  (copie la valeur complète)
VAPID_PRIVATE_KEY=Ey8...  (copie la valeur complète)
VAPID_CLAIMS_EMAIL=ton@email.fr
```

### 1.3 Mettre à jour `app/config.py`

```python
class Settings(BaseSettings):
    # ... champs existants ...
    VAPID_PUBLIC_KEY:    str = ""
    VAPID_PRIVATE_KEY:   str = ""
    VAPID_CLAIMS_EMAIL:  str = "admin@inspir.fr"
```

---

## Étape 2 — Modèle PushSubscription

### 2.1 Créer `app/models/push_subscription.py`

```python
from sqlalchemy import Column, String, Text, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), nullable=False, index=True)
    endpoint   = Column(Text, nullable=False)
    p256dh     = Column(Text, nullable=False)   # clé publique du client
    auth       = Column(Text, nullable=False)   # secret auth du client
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'endpoint', name='uq_user_endpoint'),
    )
```

### 2.2 Import dans `app/models/__init__.py`

```python
from app.models.push_subscription import PushSubscription
```

### 2.3 Migration

```bash
alembic revision --autogenerate -m "create push_subscriptions table"
alembic upgrade head
```

---

## Étape 3 — Service d'envoi de notifications

### 3.1 Créer `app/services/notifications.py`

```python
import json
from pywebpush import webpush, WebPushException
from app.config import settings


def envoyer_notification(subscription_info: dict, titre: str, corps: str, url: str = "/") -> bool:
    """
    Envoie une notification push à un appareil.
    subscription_info = {"endpoint": ..., "keys": {"p256dh": ..., "auth": ...}}
    Retourne True si succès, False sinon.
    """
    try:
        payload = json.dumps({
            "titre": titre,
            "corps": corps,
            "url": url,
            "icon": "/icons/icon-192.png",
        })

        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": f"mailto:{settings.VAPID_CLAIMS_EMAIL}"
            }
        )
        return True
    except WebPushException as e:
        print(f"[Push] Erreur d'envoi: {e}")
        return False
```

---

## Étape 4 — Endpoints push

### 4.1 Créer `app/routes/notifications.py`

```python
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.push_subscription import PushSubscription
from app.services.auth_service import get_current_user
from app.services.notifications import envoyer_notification
from app.config import settings

router = APIRouter()


class SubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str
    user_agent: Optional[str] = None


@router.get("/vapid-key")
async def get_vapid_key():
    """Retourne la clé publique VAPID pour le frontend."""
    return {"vapid_public_key": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe", status_code=201)
async def subscribe(
    data: SubscribeRequest,
    request: Request,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Enregistre ou met à jour la souscription push de l'utilisateur."""
    # Vérifie si une souscription avec cet endpoint existe déjà
    result = await db.execute(
        select(PushSubscription)
        .where(PushSubscription.user_id == current_user.id)
        .where(PushSubscription.endpoint == data.endpoint)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.p256dh = data.p256dh
        existing.auth = data.auth
    else:
        sub = PushSubscription(
            user_id=current_user.id,
            endpoint=data.endpoint,
            p256dh=data.p256dh,
            auth=data.auth,
            user_agent=data.user_agent or request.headers.get("user-agent"),
        )
        db.add(sub)

    await db.commit()
    return {"message": "Souscription enregistrée"}


@router.delete("/unsubscribe")
async def unsubscribe(
    endpoint: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Supprime une souscription push."""
    await db.execute(
        delete(PushSubscription)
        .where(PushSubscription.user_id == current_user.id)
        .where(PushSubscription.endpoint == endpoint)
    )
    await db.commit()
    return {"message": "Souscription supprimée"}


@router.post("/test", status_code=200)
async def test_notification(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Envoie une notification de test à tous les appareils de l'utilisateur."""
    result = await db.execute(
        select(PushSubscription).where(PushSubscription.user_id == current_user.id)
    )
    subs = result.scalars().all()

    if not subs:
        raise HTTPException(status_code=404, detail="Aucun appareil enregistré")

    envoyes = 0
    for sub in subs:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
        }
        if envoyer_notification(subscription_info, "🌿 Inspir", "C'est l'heure de ta routine bien-être !", "/"):
            envoyes += 1

    return {"envoyes": envoyes, "total": len(subs)}
```

### 4.2 Enregistrer le router dans `app/main.py`

```python
from app.routes import auth, routines, sessions, moods, streaks, payments, notifications

app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
```

---

## Étape 5 — Frontend : demande de permission

### 5.1 Mettre à jour `frontend/sw.js`

Ajoute la gestion des événements push à la fin du Service Worker :

```javascript
// Réception d'une notification push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const titre = data.titre || 'Inspir';
  const corps = data.corps || "C'est l'heure de ta routine bien-être !";

  event.waitUntil(
    self.registration.showNotification(titre, {
      body:  corps,
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data:  { url: data.url || '/' },
    })
  );
});

// Clic sur la notification → ouvre l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
```

### 5.2 Créer `frontend/js/push.js`

```javascript
let vapidPublicKey = null;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function chargerVapidKey() {
  try {
    const res = await fetch(`${API_BASE}/notifications/vapid-key`);
    const data = await res.json();
    vapidPublicKey = data.vapid_public_key;
  } catch {
    console.warn('[Push] Impossible de charger la clé VAPID');
  }
}

async function demanderPermissionEtSouscrire() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert("Ton navigateur ne supporte pas les notifications push.");
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  try {
    await chargerVapidKey();
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const subJson = subscription.toJSON();
    const token   = getToken();

    if (!token) return false;

    await fetch(`${API_BASE}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh:   subJson.keys.p256dh,
        auth:     subJson.keys.auth,
      }),
    });

    return true;
  } catch (err) {
    console.error('[Push] Erreur souscription:', err);
    return false;
  }
}

async function testerNotification() {
  const token = getToken();
  if (!token) return;
  await fetch(`${API_BASE}/notifications/test`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}
```

### 5.3 Ajouter le bouton dans `profil.html`

Dans la section des réglages de `construireProfil` (profil.js), ajoute :

```javascript
const notifHTML = `
  <div style="background:var(--couleur-fond-carte);border-radius:var(--rayon-bordure);padding:16px;margin-bottom:16px;box-shadow:var(--ombre-carte);">
    <div style="font-size:0.88rem;font-weight:600;margin-bottom:10px;">🔔 Rappels quotidiens</div>
    <p style="font-size:0.82rem;color:var(--couleur-texte-doux);margin-bottom:12px;">Reçois une notification à l'heure de ton rappel (${user.heure_rappel ? user.heure_rappel.slice(0,5) : '08:00'}) pour ne jamais oublier ta routine.</p>
    <button onclick="activerNotifications()" class="btn-commencer" style="margin-top:0;padding:12px;">Activer les notifications</button>
  </div>
`;
```

Dans `profil.html`, ajoute `push.js` avant `profil.js` :

```html
<script src="/js/push.js"></script>
```

Dans `profil.js`, ajoute la fonction :

```javascript
async function activerNotifications() {
  const ok = await demanderPermissionEtSouscrire();
  if (ok) {
    alert('✅ Notifications activées ! Tu recevras un rappel quotidien.');
  }
}
```

---

## Étape 6 — Script d'envoi quotidien

### 6.1 Créer `scripts/send_daily_notifications.py`

Ce script est à exécuter chaque heure via une tâche cron. Il envoie les notifications aux utilisateurs dont `heure_rappel` correspond à l'heure courante.

```python
"""
Usage : python scripts/send_daily_notifications.py
À planifier en cron : 0 * * * * (toutes les heures)
"""
import asyncio
import sys
import os
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.models.user import User
from app.models.push_subscription import PushSubscription
from app.services.notifications import envoyer_notification
from app.config import settings

DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def run():
    heure_courante = datetime.now().strftime("%H:00:00")

    async with AsyncSessionLocal() as db:
        # Trouve les utilisateurs dont l'heure_rappel correspond
        result = await db.execute(
            select(User).where(User.heure_rappel.cast(str).like(f"{heure_courante}%"))
        )
        users = result.scalars().all()

        if not users:
            print(f"[{heure_courante}] Aucun utilisateur à notifier.")
            return

        envoyes = 0
        for user in users:
            subs_result = await db.execute(
                select(PushSubscription).where(PushSubscription.user_id == user.id)
            )
            subs = subs_result.scalars().all()

            prenom = user.prenom or "toi"
            titre  = "🌿 Inspir"
            corps  = f"Bonjour {prenom} ! C'est l'heure de ta routine bien-être."

            for sub in subs:
                sub_info = {
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
                }
                if envoyer_notification(sub_info, titre, corps):
                    envoyes += 1

        print(f"[{heure_courante}] {envoyes} notification(s) envoyée(s) à {len(users)} utilisateur(s).")


if __name__ == "__main__":
    asyncio.run(run())
```

### 6.2 Ajouter le cron (en production — semaine 11)

```bash
# Crontab : envoyer les notifications toutes les heures
0 * * * * /chemin/vers/venv/bin/python /chemin/vers/scripts/send_daily_notifications.py >> /var/log/inspir_push.log 2>&1
```

---

## Étape 7 — Tester

### Scénario de test

1. Lance le serveur : `inspir`
2. Connecte-toi sur la page profil
3. Clique "Activer les notifications" → le navigateur demande la permission
4. Accepte → la souscription est envoyée à `POST /api/notifications/subscribe`
5. Dans `/docs` → `POST /api/notifications/test` → une notification doit apparaître sur ton appareil
6. Vérifie en base :
```bash
psql -U bienetre_user -d bienetre_db -c "SELECT user_id, LEFT(endpoint,40) FROM push_subscriptions;"
```

> **Note iOS Safari :** Les notifications Web Push sont supportées depuis iOS 16.4 en PWA installée uniquement (pas en navigateur Safari standard).

---

## Étape 8 — Commit Git

```bash
git add app/models/push_subscription.py app/services/notifications.py
git add app/routes/notifications.py app/main.py app/config.py
git add frontend/sw.js frontend/js/push.js frontend/js/profil.js
git add frontend/profil.html scripts/send_daily_notifications.py
git commit -m "feat(semaine-8): notifications push Web, VAPID, rappel quotidien"
git push origin main
```

---

## Récapitulatif

| # | Action | Fichier |
|---|--------|---------|
| 1 | Générer clés VAPID | `python3 -c "..."` + `.env` |
| 2 | Mettre à jour config | `app/config.py` |
| 3 | Modèle PushSubscription | `app/models/push_subscription.py` |
| 4 | Migration | `alembic revision + upgrade head` |
| 5 | Service notifications | `app/services/notifications.py` |
| 6 | Endpoints push | `app/routes/notifications.py` |
| 7 | Enregistrer le router | `app/main.py` |
| 8 | SW push events | `frontend/sw.js` |
| 9 | JS push souscription | `frontend/js/push.js` |
| 10 | Bouton profil | `frontend/js/profil.js` |
| 11 | Script cron | `scripts/send_daily_notifications.py` |
| 12 | Tester | `POST /api/notifications/test` |
| 13 | Commit | `git commit -m "feat(semaine-8)..."` |

---

## Livrable de fin de semaine 8

✅ Clés VAPID générées et configurées  
✅ Table `push_subscriptions` créée  
✅ Endpoint souscription/désouscription fonctionnel  
✅ Service Worker gère les événements push et les clics  
✅ Bouton "Activer les notifications" dans le profil  
✅ `POST /api/notifications/test` envoie une notification de test  
✅ Script `send_daily_notifications.py` prêt pour le cron  

---

## Points d'attention

**HTTPS obligatoire en production.** Les notifications push et le Service Worker ne fonctionnent qu'en HTTPS. En développement local (`localhost`), c'est une exception autorisée.

**iOS 16.4+ requis.** Sur iPhone, les Web Push ne fonctionnent que si l'app est installée en PWA depuis Safari. En navigateur normal, ça ne marche pas.

**Nettoyage des souscriptions expirées.** Si `pywebpush` retourne une erreur 410 (endpoint expiré), il faut supprimer la souscription de la base. Ce nettoyage peut être ajouté dans `envoyer_notification`.

---

*Prochaine étape : Semaine 9 — Paiement Stripe et fonctionnalités Premium*
