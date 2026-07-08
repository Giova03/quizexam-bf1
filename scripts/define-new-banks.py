"""
Définit les métadonnées de toutes les banques à créer pour atteindre 5000 questions.
"""
import json, os

BANKS_DIR = "/home/z/my-project/scripts/generated/banks"

# Toutes les nouvelles banques à créer (matières demandées par l'utilisateur)
NEW_BANKS = [
    # Sciences économiques et de gestion
    {"bankKey": "sciences-eco-gestion", "title": "Sciences Économiques et de Gestion", "description": "Microéconomie, macroéconomie, comptabilité, gestion d'entreprise, marketing, finance d'entreprise.", "category": "Universitaire", "subcategory": "Sciences Économiques", "icon": "TrendingUp", "color": "cyan", "level": "LICENCE", "subject": "Sciences économiques et de gestion: microéconomie (offre, demande, élasticité, marché), macroéconomie (PIB, inflation, chômage, politique monétaire et budgétaire), comptabilité générale (bilan, compte de résultat, principes comptables), gestion d'entreprise (organisation, stratégie, RH), marketing (4P, segmentation), finance d'entreprise (investissement, financement, rentabilité)"},
    # Gestion des ressources humaines
    {"bankKey": "grh", "title": "Gestion des Ressources Humaines (GRH)", "description": "Recrutement, formation, évaluation, paie, droit du travail, relations sociales.", "category": "Universitaire", "subcategory": "Gestion RH", "icon": "Users", "color": "teal", "level": "LICENCE", "subject": "Gestion des ressources humaines: recrutement (sourcing, sélection, entretien), intégration, formation, évaluation des performances, gestion de la paie, droit du travail au Burkina Faso, relations sociales, syndicats, GPEC, motivation, leadership, culture d'entreprise"},
    # Histoire et archéologie
    {"bankKey": "histoire-archeologie", "title": "Histoire et Archéologie", "description": "Histoire ancienne, archéologie africaine, civilisations, préhistoire, sites archéologiques.", "category": "Universitaire", "subcategory": "Histoire & Archéologie", "icon": "Landmark", "color": "amber", "level": "LICENCE", "subject": "Histoire et archéologie: préhistoire (paléolithique, néolithique), civilisations anciennes (Égypte, Mésopotamie, Grèce, Rome), archéologie africaine (sites de Koumbi Saleh, Nok, Ife, royaumes africains), archéologie au Burkina Faso (ruines de Loropéni, pierres de Bonna), méthodes archéologiques (fouilles, datation, stratigraphie), patrimoine mondial UNESCO"},
    # Statistique
    {"bankKey": "statistique", "title": "Statistique Appliquée", "description": "Statistiques descriptives, inférentielles, échantillonnage, tests d'hypothèses, régression.", "category": "Universitaire", "subcategory": "Statistique", "icon": "BarChart3", "color": "violet", "level": "LICENCE", "subject": "Statistique: statistiques descriptives (moyenne, médiane, mode, variance, écart-type, quantiles), représentations graphiques, probabilités (lois discrètes et continues: binomiale, Poisson, normale), échantillonnage, estimation (intervalles de confiance), tests d'hypothèses (Student, Khi-deux, Fisher), régression linéaire, corrélation, analyse de variance"},
    # Réseau et télécom
    {"bankKey": "reseau-telecom", "title": "Réseau et Télécommunications", "description": "Modèles OSI/TCP-IP, routage, protocoles, réseau mobile, fibre optique, wireless.", "category": "Universitaire", "subcategory": "Réseau & Télécom", "icon": "Network", "color": "sky", "level": "LICENCE", "subject": "Réseau et télécommunications: modèle OSI (7 couches), TCP/IP, adressage IPv4/IPv6, routage (RIP, OSPF, BGP), protocoles (HTTP, DNS, DHCP, SMTP, FTP), switches, routeurs, VLAN, firewall, VPN, réseau mobile (2G/3G/4G/5G), fibre optique, Wi-Fi, Bluetooth, SDN, NFV, qualité de service (QoS)"},
    # Sécurité informatique
    {"bankKey": "securite-informatique", "title": "Sécurité Informatique", "description": "Cryptographie, attaques, défenses, audit, conformité, forensique.", "category": "Universitaire", "subcategory": "Sécurité", "icon": "Shield", "color": "rose", "level": "LICENCE", "subject": "Sécurité informatique: principes CIA (confidentialité, intégrité, disponibilité), cryptographie (symétrique: AES, DES; asymétrique: RSA, ECC; hachage: SHA, MD5), attaques (phishing, SQL injection, XSS, CSRF, DDoS, MITM, ransomware), défenses (firewall, IDS/IPS, antivirus, WAF), audit de sécurité, tests de pénétration, normes (ISO 27001, NIST), forensique numérique, RGPD, OWASP Top 10"},
    # SVT 6e à Terminale D
    {"bankKey": "svt-6e-termd", "title": "SVT - Du 6e à Terminale D", "description": "Biologie, géologie, écologie - programme complet du collège au lycée scientifique.", "category": "Secondaire", "subcategory": "SVT", "icon": "Dna", "color": "rose", "level": "LYCEE", "subject": "Sciences de la Vie et de la Terre du 6e à Terminale D: cellule (structure, organites), reproduction (humaine, végétale), génétique (ADN, ARN, hérédité, mutations), immunologie (anticorps, vaccination, VIH/sida), géologie (structure interne de la Terre, plaques tectoniques, séismes, volcans, roches), écologie (écosystèmes, chaînes alimentaires, biodiversité, pollution), nutrition (digestion, respiration, photosynthèse), santé (paludisme, drépanocytose, malnutrition)"},
    # Actualité
    {"bankKey": "actualite-mondiale", "title": "Actualité Mondiale 2024-2025", "description": "Événements récents, conflits, institutions, personnalités, faits marquants.", "category": "Culture Générale", "subcategory": "Actualité", "icon": "Newspaper", "color": "emerald", "level": "TOUS", "subject": "Actualité mondiale 2024-2025: conflit Russie-Ukraine (depuis février 2022), guerre Israël-Hamas (depuis octobre 2023), Confédération des États du Sahel (AES: Mali, Burkina Faso, Niger), transition politique au Burkina Faso (Capitaine Ibrahim Traoré), élections 2024 (Trump 47e président, élections européennes), intelligence artificielle (ChatGPT, Gemini), changement climatique (COP), Brics, CEDEAO"},
    # Histoire du monde
    {"bankKey": "histoire-monde", "title": "Histoire du Monde", "description": "Grandes périodes, civilisations, révolutions, guerres mondiales, décolonisation.", "category": "Culture Générale", "subcategory": "Histoire du Monde", "icon": "Globe2", "color": "amber", "level": "TOUS", "subject": "Histoire du monde: préhistoire, Antiquité (Égypte, Grèce, Rome), Moyen Âge, Renaissance, Révolution française (1789), Révolution industrielle, Première Guerre mondiale (1914-1918), Seconde Guerre mondiale (1939-1945), Guerre froide, décolonisation, chute du mur de Berlin (1989), guerre du Golfe, printemps arabe, histoire de l'Afrique"},
    # Culture générale du monde
    {"bankKey": "culture-generale-monde", "title": "Culture Générale du Monde", "description": "Géographie, capitales, fleuves, montagnes, arts, littérature, religions.", "category": "Culture Générale", "subcategory": "Culture Générale du Monde", "icon": "Globe2", "color": "teal", "level": "TOUS", "subject": "Culture générale du monde: géographie (capitales, fleuves, montagnes, déserts, océans), continents, pays, religions (christianisme, islam, bouddhisme, hindouisme, judaïsme), arts (peinture, musique, cinéma, architecture), littérature mondiale (grands auteurs, œuvres), philosophie, prix Nobel, institutions internationales (ONU, UNESCO, OMS), langues, monnaies"},
    # Diplomatie mondiale
    {"bankKey": "diplomatie-mondiale", "title": "Diplomatie et Relations Internationales", "description": "Diplomatie, traités, organisations, droit international, négociations.", "category": "Culture Générale", "subcategory": "Diplomatie", "icon": "Handshake", "color": "violet", "level": "TOUS", "subject": "Diplomatie et relations internationales: histoire diplomatique, traités (Westphalie 1648, Vienne 1815, Versailles 1919), droit international (Charte ONU, Conventions de Genève), organisations (ONU, UA, CEDEAO, AES, UE, ONU), diplomatie bilatérale et multilatérale, négociations, ambassades, consulats, diplomatie publique, soft power, sanctions, médiation, paix"},
    # Faits marquants MPSR 2
    {"bankKey": "mpsr2-faits", "title": "Faits Marquants du MPSR 2", "description": "Transition politique au Burkina Faso, actions du MPSR 2, réformes, sécurité.", "category": "Culture Générale", "subcategory": "MPSR 2", "icon": "Landmark", "color": "emerald", "level": "TOUS", "subject": "Faits marquants du MPSR 2 (Mouvement Patriotique pour la Sauvegarde et la Restauration, 2e version) au Burkina Faso: prise de pouvoir par le Capitaine Ibrahim Traoré (30 septembre 2022), recaptage de zones terroristes, création de l'Alliance des États du Sahel (AES) le 16 septembre 2023, Confédération depuis le 9 juillet 2024, retrait de la CEDEAO, Fonds de Soutien Patriotique (FSP, 23 janvier 2023), Service national civique, réformes constitutionnelles, ALT (Assemblée Législative de Transition) présidée par Ousmane Bougma (11 novembre 2022)"},
]

for bank in NEW_BANKS:
    path = os.path.join(BANKS_DIR, f"{bank['bankKey']}.json")
    if os.path.exists(path):
        existing = json.load(open(path))
        # Update metadata
        for k in ["title", "description", "category", "subcategory", "icon", "color", "level"]:
            if k in bank:
                existing[k] = bank[k]
        with open(path, 'w') as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
        print(f"  ~ {bank['bankKey']}: updated metadata ({len(existing.get('questions',[]))} existing)")
    else:
        bank["questions"] = []
        with open(path, 'w') as f:
            json.dump(bank, f, ensure_ascii=False, indent=2)
        print(f"  + {bank['bankKey']}: created")

print(f"\n{len(NEW_BANKS)} banks defined/created")
