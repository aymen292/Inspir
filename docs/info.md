 ### mot de passe de l'utilisateur `bienetre_user` : `bienetre2026` 

### commande pour lancer le serveur : `uvicorn app.main:app --reload --reload-exclude "venv/*"`

### lien pour accéder au serveur API : `http://127.0.0.1:8000/docs`

### lancer le venv : `source venv/bin/activate`
### desactiver le venv : `deactivate` 

## Rituel de démarrage 
### PostgreSQL : 
`brew services start postgresql@18` <br> 
`pg_isready` Afin de vérifier 

### Redis (docker) : 
`docker start redis-bienetre`
`docker exec -it redis-bienetre redis-cli ping` afin de verifier 
Attendu : PONG 

### Lancer le FastAPI 
`uvicorn app.main:app --reload`

### Fin de session : 
```bash 
brew services stop postgresql@14
docker stop redis-bienetre 
``` 

