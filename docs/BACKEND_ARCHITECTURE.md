# Backend Architecture

## Vue D'ensemble

Le backend suit une architecture en couches simple:

```text
Frontend / User
      |
      v
FastAPI routes
      |
      v
Pydantic schemas
      |
      v
Application services
      |
      v
Domain model
      |
      v
Signal simulation
```

Dans le code du projet, cela correspond a:

- `backend/app/api/experiments.py`
- `backend/app/schemas/experiment.py`
- `backend/app/services/experiment_service.py`
- `backend/app/domain/models.py`
- `backend/app/services/simulation_service.py`

## Workflow Typique

Quand le frontend appelle un endpoint:

1. la route FastAPI recoit la requete HTTP
2. Pydantic valide la forme des donnees entrantes
3. la route appelle un service applicatif
4. le service manipule les objets du domaine
5. le service retourne un resultat
6. la route renvoie une reponse JSON conforme au schema

Exemple concret:

1. `POST /experiments/{experiment_id}/commands`
2. `ExperimentCommandEnvelope` valide `type` et `payload`
3. `ExperimentService.apply_command(...)` est appele
4. le service met a jour l'`Experiment`, ses `containers`, son `rack` ou ses `runs`
5. un `ExperimentSchema` est renvoye par l'API

## Role Des Modules

### `api`

Responsabilite:

- exposer les endpoints HTTP
- convertir les erreurs Python en statuts HTTP
- appeler les services applicatifs

Ce module ne doit pas porter la logique metier principale.

### `schemas`

Responsabilite:

- decrire les entrees et sorties de l'API
- valider les donnees HTTP
- serialiser les reponses JSON

Le projet utilise `Pydantic` dans cette couche.

`Pydantic` est une librairie Python qui permet de definir des modeles de donnees valides.
Dans ce projet, elle sert surtout a:

- verifier les payloads recus par l'API
- garantir la structure des reponses
- convertir les objets Python en JSON propre

### `services`

Responsabilite:

- implementer les cas d'usage
- orchestrer le workflow metier
- coordonner plusieurs objets du domaine

Exemples dans ce projet:

- creer un experiment
- appliquer une commande utilisateur
- transferer une preparation en vial
- lancer une sequence de runs

`experiment_service.py` est la couche applicative principale.

`simulation_service.py` est un service plus specialise:

- generation des pics gaussiens
- calcul des points de chromatogramme
- calcul des `area` et `height` par transition

### `domain`

Responsabilite:

- definir les objets metier centraux
- porter le vocabulaire du domaine
- contenir, a terme, les invariants et regles metier intrinsiques

Exemples:

- `Experiment`
- `ExperimentStatus`
- `Container`
- `Rack`
- `Molecule`
- `Run`

## Domain Vs Services

Difference simple:

- `domain` = ce que le systeme manipule
- `services` = ce que le systeme fait

Autrement dit:

- `domain` porte les concepts metier
- `services` portent les actions metier

Exemples:

- "un container ne doit pas depasser sa capacite" est une regle naturelle du domaine
- "quand on lance `run_sequence`, il faut parcourir le rack, creer les runs et simuler les transitions" releve du service

Dans l'etat actuel du projet, une partie de l'intelligence metier vit encore dans `services`, ce qui est normal pour une V1.
Si le projet grossit, les regles metier pures pourront remonter progressivement dans `domain`.

## Parallele Avec MVC

L'analogie MVC peut aider, mais elle est imparfaite:

- `domain` ressemble au `Model`
- `api` ressemble au `Controller`
- `services` correspondent plutot a une couche applicative intermediaire

Il vaut mieux penser ce backend comme:

- une API
- une couche de services applicatifs
- un modele de domaine

plutot que comme un MVC strict.
