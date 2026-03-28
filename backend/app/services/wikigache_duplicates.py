import random
from collections import Counter
from tqdm import tqdm

def simuler_tirages(nb_simulations=10000):
    total_cartes_deck = 2795159
    nb_cartes_tirees = 1249 * 5
    
    distributions_doublons = []

    # On ajoute tqdm autour du range pour la barre de progression
    for _ in tqdm(range(nb_simulations), desc="Simulation en cours"):
        # Génération des 6245 cartes
        tirage = [random.randint(1, total_cartes_deck) for _ in range(nb_cartes_tirees)]
        
        # Calcul des doublons : Total - Uniques
        nb_doublons = nb_cartes_tirees - len(set(tirage))
        distributions_doublons.append(nb_doublons)

    # Statistiques
    stats = Counter(distributions_doublons)
    nb_avec_doublon = sum(1 for x in distributions_doublons if x > 0)
    
    print("\n" + "="*40)
    print(f"ANALYSE SUR {nb_simulations:,} SIMULATIONS")
    print(f"Probabilité d'avoir au moins 1 doublon : {(nb_avec_doublon/nb_simulations)*100:.2f}%")
    print("-" * 40)
    print("Répartition du nombre de doublons :")
    for nb in sorted(stats.keys()):
        count = stats[nb]
        print(f" {nb} doublon(s) : {count:>5} fois ({(count/nb_simulations)*100:.2f}%)")

if __name__ == "__main__":
    simuler_tirages(10000)