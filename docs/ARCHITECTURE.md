# Architecture V1

## Principe

Le projet suit une architecture a moteur central:

- `frontend/` affiche et pilote l'experience utilisateur
- `backend/` detient l'etat metier et la simulation

Cette architecture est volontairement orientee API afin de pouvoir changer le frontend plus tard sans refaire le moteur.

## Frontend

Stack cible:

- Next.js
- React
- TypeScript
- Tailwind
- Recharts

Responsabilites:

- afficher la paillasse
- afficher les fioles et vials
- afficher le rack autosampler
- montrer les chromatogrammes et les resultats
- envoyer des commandes metier a l'API

## Backend

Stack cible:

- FastAPI
- Python 3.11+

Responsabilites:

- gerer les experiments
- valider les commandes utilisateur
- calculer les dilutions
- calculer les effets matrice et solvants
- simuler les transitions et chromatogrammes
- fournir plus tard des exports de donnees

## API

L'API est orientee commandes:

- `POST /experiments`
- `GET /experiments/{id}`
- `POST /experiments/{id}/commands`

Exemples de commandes:

- `add_liquid`
- `transfer_to_vial`
- `place_vial_in_rack`
- `run_sequence`

## Etat V1

La V1 couvre:

- une molecule
- deux transitions
- deux standards
- un sample
- un rack de 3 positions
- un resultat de run simplifie
