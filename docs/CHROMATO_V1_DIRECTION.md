# Direction V1 - Simulation Web Orientee Chromato

## Statut

Ce document est a jour et reste le cadrage produit principal de la V1.

L'architecture retenue depuis ce cadrage est:

- `frontend` en `Next.js`
- `backend` en `FastAPI`
- moteur metier centralise dans l'API Python

## 1. Mon Avis

C'est une meilleure direction qu'une simulation de labo "generaliste".

Pourquoi:

- tu as deja le contexte metier
- tu pourras juger la credibilite du produit plus facilement
- la simulation peut etre plus precise sans devenir enorme
- tu peux relier la manipulation laboratoire aux donnees produites

Le point le plus interessant, vu ton contexte, n'est probablement pas seulement "faire bouger des flacons a l'ecran".
Le vrai angle fort est:

- preparer une sequence d'analyse
- lancer une acquisition simulee
- voir apparaitre un chromatogramme
- interpreter ou retraiter les donnees

Autrement dit, tu as un avantage produit si la simulation relie:

- la preparation experimentale
- l'execution instrumentale
- le signal genere
- l'analyse des donnees

## 2. Ce Que Je Recommande Pour La V1

Je ne commencerais pas par une simulation complete de HPLC ou GC avec tous les parametres physiques.

Je recommanderais une V1 "chromato pedagogique" en 3 couches:

1. Preparation d'un run
2. Simulation simplifiee du chromatogramme
3. Lecture et interpretation du resultat

Cela permet:

- une UX claire
- une logique metier comprensible
- un frontend abordable
- une base evolutive vers des scenarios plus realistes

## 3. Type De Chromato Pour Demarrer

Le meilleur point de depart est souvent la HPLC/UPLC analytique simplifiee.

Pourquoi:

- le concept de chromatogramme est central
- les notions de pic, temps de retention, aire et resolution sont bien structurantes
- l'interface peut montrer a la fois la methode et le signal
- c'est plus naturel pour une application orientee donnees

Tu peux eviter au debut:

- la modelisation exacte de la physique de separation
- les gradients complexes tres realistes
- les details materiels trop fins

## 4. Concept Produit Le Plus Fort

Je te conseille de ne pas vendre l'outil comme:

- "un simulateur de chimie"

Mais plutot comme:

- "un simulateur de workflow chromatographique"

Exemple de boucle:

1. Choix d'une methode
2. Parametrage de l'analyse
3. Injection d'un echantillon
4. Generation du chromatogramme
5. Integration des pics
6. Validation ou interpretation

C'est beaucoup plus proche de ton contexte metier.

## 5. Objets Metier V1

Entites utiles:

- `Method`
- `Sample`
- `Analyte`
- `Chromatogram`
- `Peak`
- `InstrumentRun`
- `ProcessingMethod`
- `IntegrationResult`
- `SystemSuitabilityReport`

Exemples simples:

- `Method`: colonne, debit, phase mobile, duree de run
- `Sample`: nom, matrice, concentration cible, analytes attendus
- `Peak`: retentionTime, area, height, width
- `ProcessingMethod`: baseline, seuil, fenetre d'integration

## 6. Simulation Metier Simplifiee

L'objectif n'est pas d'etre physiquement exact. L'objectif est d'etre pedagogiquement coherent.

Exemple de regles:

- un analyte donne produit un pic autour d'un temps de retention attendu
- une mauvaise methode peut deplacer les temps de retention
- une concentration plus elevee augmente l'aire
- un mauvais bruit de fond degrade l'integration
- une coelution reduit la resolution entre deux pics

Forme simple:

- chaque analyte genere un pic gaussien simplifie
- le chromatogramme final est la somme des pics + bruit + derive de baseline

Cela suffit largement pour une V1.

## 7. Ecrans MVP

Je vois 4 ecrans ou 4 zones principales:

1. Catalogue de scenarios
2. Ecran de preparation de methode
3. Ecran de run avec chromatogramme
4. Ecran de retraitement et conclusion

Exemple d'enchainement:

- page 1: "Dosage d'un melange de 3 composes"
- page 2: choix de la methode et du sample
- page 3: execution et apparition du signal
- page 4: integration, identification, validation

## 8. Partie Frontend - Comment Je T'Accompagnerai

Vu ton profil backend, il faut traiter le frontend comme un assemblage de couches simples, pas comme un bloc magique.

Quand on construira l'interface, je decomposerai toujours en:

1. le role de l'ecran
2. les composants visuels
3. l'etat a stocker
4. les interactions utilisateur
5. les donnees qui circulent

Exemple:

- role: afficher un chromatogramme
- composants: graphe, liste des pics, panneau de methode
- etat: run en cours, donnees du signal, pic selectionne
- interactions: zoom, survol, selection, integration
- donnees: tableau de points `(x, y)` et liste de pics

## 9. Strategie Frontend Pour Toi

Je recommande une app React/Next.js simple, mais avec une discipline claire.

Regles pedagogiques que je suivrai:

- expliquer chaque dossier cree
- expliquer pourquoi un composant existe
- distinguer clairement UI, logique metier et donnees
- ne pas te noyer dans le CSS
- avancer par increments visibles

Structure simple recommandee:

- `app/` pour les pages
- `components/` pour les briques d'interface
- `lib/` pour la logique metier et la simulation
- `types/` pour les types TypeScript
- `data/` pour les scenarios statiques

## 10. Ce Que Je Ferais En Premier

Ordre recommande:

1. definir le scenario chromato V1
2. ecrire le modele metier Python et les schemas API
3. dessiner les ecrans en version filaire
4. coder une page simple avec faux chromatogramme
5. brancher une simulation metier minimale

C'est l'ordre le plus sain pour apprendre le frontend sans partir dans la confusion.

## 11. Scenario V1 Recommande

Scenario:

- analyser un echantillon contenant 3 composes
- lancer un run HPLC simplifie
- obtenir un chromatogramme avec 3 pics
- identifier les pics
- verifier si la separation est acceptable

Objectifs pedagogiques:

- comprendre le lien entre methode, signal et interpretation
- manipuler les concepts de pic, temps de retention, aire et resolution
- introduire la logique de retraitement des donnees

## 12. Ce Que Nous Pourrions Construire Ensuite

Apres la V1:

- variation des methodes
- echantillons plus complexes
- integration manuelle vs automatique
- system suitability
- cas de pics mal resolus
- comparaison de retraitements
