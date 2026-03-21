# Simulation De Laboratoire Web

## Statut

Ce document n'est plus le cadrage principal.

Il reste utile comme note de depart sur la forme generale d'une simulation de laboratoire, mais le projet est maintenant recentre sur la chromatographie LC-MS/MS.

Les documents a privilegier sont:

- `docs/CHROMATO_V1_DIRECTION.md`
- `docs/CHROMATO_GUI_CONCEPT.md`
- `docs/ARCHITECTURE.md`

## 1. Positionnement

Objectif: concevoir une application web pedagogique qui reproduit le travail en laboratoire sans exiger une expertise initiale en chimie.

Le bon angle pour une V1 n'est pas un moteur de chimie complet. Il vaut mieux viser:

- une simulation de laboratoire scolaire ou universitaire d'introduction
- un apprentissage guide par protocoles
- une forte dimension securite
- des resultats de mesures plausibles
- des erreurs utilisateur realistes

En pratique, l'application apprend a:

- choisir le bon materiel
- preparer un poste de travail
- suivre un protocole
- mesurer correctement
- interpreter un resultat
- identifier les erreurs experimentales

## 2. Cible Utilisateur

Profils prioritaires:

- etudiant debutant
- enseignant qui veut faire travailler une classe
- autodidacte curieux

Besoins:

- comprendre le "pourquoi" de chaque geste
- manipuler sans danger
- voir les consequences d'une mauvaise procedure
- recevoir un feedback immediat

## 3. Domaine Metier Recommande

Pour une premiere version, je recommande de ne pas commencer par la synthese organique. C'est trop vaste et trop difficile a simuler proprement.

Le meilleur point de depart est un "laboratoire de chimie analytique et generale", avec 4 familles d'experiences:

1. Preparation de solutions
2. Mesure de pH
3. Titrage acido-basique
4. Separation simple (filtration, evaporation, dilution)

Pourquoi ce choix:

- les regles metier sont comprehensibles
- les experiences sont connues
- les simulations peuvent etre plausibles sans moteur scientifique tres lourd
- l'UX peut etre tres visuelle

## 4. Boucle De Jeu / D'Apprentissage

Cycle principal:

1. L'utilisateur choisit une experience
2. Il lit l'objectif et les consignes de securite
3. Il selectionne le materiel et les reactifs
4. Il execute les etapes du protocole
5. La simulation produit des observations et mesures
6. L'utilisateur remplit une conclusion
7. L'application evalue la procedure et le resultat

## 5. Objets Metier

Entites principales:

- Experiment
- ProtocolStep
- Reagent
- Container
- Instrument
- Sample
- Measurement
- Observation
- HazardRule
- LearnerAction
- EvaluationReport

Exemple de structure:

- `Experiment`: titre, objectif, difficulte, duree, prerequis
- `Reagent`: nom, concentration, volume disponible, pictogrammes de risque
- `Instrument`: type, precision, plage de mesure, etat
- `ProtocolStep`: ordre, action attendue, conditions de reussite, erreurs possibles
- `Measurement`: valeur, unite, incertitude, source

## 6. Niveau De Realisme

Il faut separer trois niveaux:

1. Realisme visuel
2. Realisme procedural
3. Realisme scientifique

Pour la V1:

- realisme visuel: moyen
- realisme procedural: eleve
- realisme scientifique: plausible mais simplifie

Exemple:

- une dilution mal faite doit produire une concentration incorrecte
- une lecture de menisque approximative doit ajouter une erreur de mesure
- un oubli de rincage de burette doit biaiser le titrage

En revanche, inutile au debut de simuler toute la thermodynamique ou la cinetique de reaction.

## 7. Moteur De Simulation

Le moteur ne doit pas raisonner comme un moteur de rendu, mais comme un moteur d'etat.

Etat minimal:

- inventaire du poste
- contenu des recipientes
- sequence d'actions utilisateur
- temps ecoule
- contraintes de securite
- mesures disponibles

Approche recommande:

- regles deterministes pour la procedure
- bruit controle sur les mesures
- systeme de fautes realistes

Formule simple pour une mesure:

`mesure_affichee = valeur_theorique + erreur_instrument + erreur_utilisateur + bruit`

Cela suffit pour faire une application credibe pedagogiquement.

## 8. UX Recommandee

Structure d'ecran:

- colonne gauche: protocole et objectifs
- zone centrale: paillasse interactive
- colonne droite: inventaire, reactifs, instruments, journal d'observation
- barre haute: mode securite, progression, score

Interactions importantes:

- drag and drop du materiel
- clic pour verser, mesurer, melanger, chauffer
- etapes verrouillees/deverrouillees selon le contexte
- panneau de feedback contextualise

## 9. Modules Fonctionnels MVP

MVP recommande:

1. Auth simple ou mode invite
2. Catalogue d'experiences
3. Experience interactive pas a pas
4. Moteur de mesures
5. Feedback pedagogique
6. Resume final avec score et erreurs

Fonctions a garder pour plus tard:

- multijoueur
- moteur 3D
- IA conversationnelle integree au protocole
- creation libre d'experiences par glisser-deposer

## 10. Architecture Technique

Stack web pragmatique:

- Frontend: Next.js + TypeScript
- UI: React + Tailwind ou CSS Modules
- Etat complexe: Zustand ou XState
- Backend: Next.js server routes ou NestJS
- Persistance: PostgreSQL
- Contenu d'experiences: JSON versionne ou base de donnees

Je recommande XState si tu veux une simulation fiable par etats et transitions. C'est souvent mieux qu'un empilement de `useState` pour ce type de produit.

## 11. Modele De Donnees Initial

Schemas simples:

- `experiments`
- `experiment_steps`
- `reagents`
- `instruments`
- `experiment_sessions`
- `session_actions`
- `session_measurements`
- `session_reports`

Il faut distinguer:

- le contenu auteur (definition d'une experience)
- l'execution joueur (session de simulation)

## 12. Premier Contenu Metier A Implementer

Experience ideale pour debuter:

### Dosage Acido-Basique

Scenario:

- objectif: determiner la concentration inconnue d'une solution acide
- materiel: burette, erlenmeyer, pipette jaugee, agitateur, indicateur colore
- actions: prelever, verser, ajouter indicateur, titrer, lire le volume equivalent
- evaluation: exactitude du resultat, respect de la procedure, securite

Ce scenario est excellent car il combine:

- preparation
- verrerie
- precision de mesure
- logique scientifique
- interpretation finale

## 13. Risques Produit A Eviter

- trop de realisme scientifique trop tot
- UI surchargee d'objets et de controles
- protocole trop libre sans cadre pedagogique
- feedback vague ou trop scolaire
- moteur de simulation non explicable

Chaque resultat devrait etre justifiable a partir des actions de l'utilisateur.

## 14. Direction Produit Conseillee

Je recommande ce chemin:

1. definir 1 experience de reference
2. modeliser les objets metier
3. construire une paillasse interactive simple
4. brancher un moteur de regles
5. produire un rapport final clair
6. seulement ensuite etendre le catalogue

## 15. Ce Que Je Peux T'Aider A Faire Ensuite

Je peux maintenant t'aider sur l'une de ces pistes:

- cadrer le produit plus finement
- ecrire le cahier des charges
- concevoir les ecrans
- definir le modele scientifique de la premiere experience
- scaffold le projet web directement
- creer les schemas TypeScript du moteur de simulation
