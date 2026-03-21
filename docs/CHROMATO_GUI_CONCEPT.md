# Concept GUI - Simulation Chromato / MS-MS

## Statut

Ce document est a jour pour la direction GUI de la V1.

Il faut maintenant le lire avec cette decision technique en tete:

- la logique metier vit dans le backend Python
- la GUI consomme l'etat d'experiment expose par l'API

## 1. Direction Generale

Oui, il faut une vraie GUI, pas juste un formulaire technique.

Ton idee la plus forte est:

- l'utilisateur cree ses fioles
- il les remplit visuellement
- il les place dans le systeme d'analyse
- il lance une sequence
- il voit ensuite les donnees generees

Donc la GUI ne doit pas etre pensee comme "un dashboard de backend".
Elle doit etre pensee comme un mini poste de travail:

- une paillasse
- des flacons et fioles
- un rack autosampler
- un instrument LC-MS/MS stylise
- un panneau de resultats

## 2. Boucle UX Recommandee

La boucle la plus simple et la plus satisfaisante visuellement est:

1. Choisir un scenario
2. Prepararer les fioles
3. Glisser les fioles dans le rack
4. Lancer les analyses
5. Consulter les chromatogrammes et les integrations

Cette boucle est importante parce qu'elle raconte une histoire.
L'utilisateur ne "renseigne pas des champs". Il "fait une manip".

## 3. Ecran Principal

Je recommande un seul grand ecran d'application avec 4 zones.

### Zone A - Palette De Laboratoire

Contient:

- solution mere
- solvant
- matrice blank
- fioles jaugées
- vials d'injection
- pipette / action de dosage

Role:

- fournir les objets de base de la manipulation

### Zone B - Paillasse De Preparation

Contient:

- 3 emplacements de travail
- `Std 1`
- `Std 2`
- `Sample`

Role:

- permettre de construire les fioles
- visualiser leur contenu
- afficher volume total, concentration finale, matrice, composition

### Zone C - Rack Autosampler

Contient:

- plusieurs positions numerotees
- depot des vials par drag and drop

Role:

- transformer les fioles preparees en sequence d'analyse

### Zone D - Resultats

Contient:

- statut de la sequence
- mini chromatogrammes par injection
- details d'un run selectionne
- aires, RT, ratio de transitions

Role:

- montrer le resultat de la preparation et du run

## 4. Ce Qui Rend La GUI "Sympa"

Le cote sympa ne viendra pas d'effets complexes.
Il viendra surtout de trois choses:

1. Les objets ressemblent a de vrais objets de labo
2. Les manipulations sont directes
3. Chaque action a une consequence visible

Exemples:

- le niveau de liquide monte dans la fiole
- une etiquette `Std 1` apparait
- la concentration finale se met a jour
- le vial depose dans le rack affiche sa position
- pendant le run, la courbe apparait progressivement

## 5. Composants Frontend A Imaginer

Si je te l'explique pedagogiquement, un ecran React comme celui-ci est juste un assemblage de composants.

Composants probables:

- `LabShell`
- `ReagentBottle`
- `VolumetricFlaskCard`
- `SampleVial`
- `Workbench`
- `AutosamplerRack`
- `SequencePanel`
- `ChromatogramPlot`
- `RunSummaryCard`
- `InspectorPanel`

Ce qu'il faut comprendre:

- un composant = un bloc d'interface reutilisable
- il recoit des donnees
- il affiche quelque chose
- il declenche parfois des actions

Exemple:

- `VolumetricFlaskCard` affiche une fiole
- il montre nom, volume, contenu, concentration
- il permet peut-etre de cliquer sur `Ajouter 10 mL`

## 6. Etat Frontend - Explication Simple

Le point le plus important pour toi en frontend sera "ou vivent les donnees".

Ici, l'etat principal serait:

- liste des reactifs disponibles
- liste des fioles en cours de preparation
- contenu de chaque fiole
- vials places dans le rack
- sequence de runs
- resultats des runs
- selection courante dans l'interface

En backend, tu penserais a un aggregate ou a un state machine.
En frontend, c'est la meme idee:

- l'ecran affiche un etat
- les clics et glisser-deposer modifient cet etat
- React rerend automatiquement l'interface

## 7. Architecture Frontend Pedagogique

Je recommande de separer clairement 4 couches.

### 1. `types/`

Contient les types TypeScript:

- `PreparedFlask`
- `PreparedVial`
- `SequenceRun`
- `Transition`
- `SimulatedRunResult`

Pourquoi:

- tu vois tout de suite le modele de donnees
- c'est le point d'entree le plus lisible pour un backend dev

### 2. `data/`

Contient:

- scenario initial
- molecule
- reagents
- transitions

Pourquoi:

- au debut, on n'a pas besoin de backend
- on peut iterer vite sur des donnees statiques

### 3. `lib/`

Contient la logique metier:

- calcul de dilution
- calcul de concentration finale
- simulation de run
- generation du chromatogramme

Pourquoi:

- on evite de melanger logique et affichage
- c'est la partie la plus proche de ton metier backend

### 4. `components/`

Contient l'interface:

- cartes
- paillasse
- rack
- graphes
- panneaux

Pourquoi:

- chaque morceau visuel reste simple
- l'app est plus facile a comprendre et maintenir

## 8. Flux Utilisateur Precis

Voici le flux que je recommande.

### Etape 1 - Initialisation

L'utilisateur arrive sur un scenario:

- molecule cible predefinie
- deux transitions configurees
- objectif: preparer `Std 1`, `Std 2`, `Sample`

### Etape 2 - Preparation Des Fioles

L'utilisateur:

- choisit une fiole
- ajoute un volume de stock
- ajoute du solvant ou de la matrice
- atteint un volume final
- donne un nom a la preparation

L'interface montre:

- volume total
- concentration finale
- type de matrice
- warnings si la preparation est incoherente

### Etape 3 - Preparation Des Vials

L'utilisateur transfere une portion de chaque fiole vers un vial.

L'interface montre:

- vial `Std 1`
- vial `Std 2`
- vial `Sample`

### Etape 4 - Mise En Sequence

L'utilisateur glisse les vials dans le rack:

- position 1: `Std 1`
- position 2: `Std 2`
- position 3: `Sample`

### Etape 5 - Run

L'utilisateur clique sur `Run sequence`.

L'interface:

- anime un etat "running"
- produit les resultats un par un
- remplit les chromatogrammes

### Etape 6 - Interpretation

L'utilisateur consulte:

- le chromatogramme par transition
- les aires
- les RT
- le ratio des transitions
- une estimation de concentration du sample

## 9. Niveau De Simulation Visuelle

Pour une V1, je ne ferais pas un drag-and-drop ultra-libre en premier.
Je ferais une interaction semi-guidee, tout en gardant un rendu visuel de paillasse:

- selectionner une source
- selectionner une cible
- choisir un volume
- cliquer `Verser`

Pourquoi:

- plus simple a coder
- plus simple a expliquer
- moins de bugs d'interaction
- tu gardes quand meme le ressenti "manipulation"

Ensuite, en V2, on pourra enrichir:

- vrai drag and drop
- animation de versement
- menu contextuel

## 10. Style Visuel Recommande

Je te conseille une interface qui ressemble a un logiciel scientifique moderne, pas a un site marketing.

Direction visuelle:

- fond clair legerement teinte
- cartes avec bordures nettes
- couleurs fonctionnelles pour les liquides
- typo sobre
- icones simples pour verrerie et rack
- accent couleur pour les etats actifs

Il faut eviter:

- trop de glossy
- trop de skeuomorphisme
- trop de details faux-realistes

Le bon ton est:

- propre
- technique
- lisible
- legerement ludique

## 11. Strategie D'Implementation

Si on code cela ensemble, je te ferai avancer dans cet ordre:

1. scaffold Next.js
2. poser la structure des dossiers
3. creer les types metier
4. creer des donnees statiques de scenario
5. faire la maquette de l'ecran sans logique
6. brancher la preparation des fioles
7. brancher le rack
8. brancher la simulation de run
9. afficher les chromatogrammes

Cet ordre est important:

- tu vois rapidement quelque chose a l'ecran
- on isole bien les couches
- tu comprends chaque etape

## 12. Decision Produit Conseillee

Mon avis net:

- oui a une GUI visuelle riche
- oui a la preparation de fioles
- oui au depot dans le chromato/MS
- non a un monde totalement libre en V1

Il faut une GUI "encadree mais vivante".
C'est le meilleur compromis entre fun, clarte et faisabilite.
