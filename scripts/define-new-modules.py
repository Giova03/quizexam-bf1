"""
Définit 16 nouvelles banques pour atteindre 1000+ QCM supplémentaires.
Couvre: droit (6 banques), économie (1), sociologie (1), médical (4), génie civil (1), géomètre (1), maintenance biomédicale (1), psychotechnique jeux (1)
"""
import json, os

BANKS_DIR = "/home/z/my-project/scripts/generated/banks"

NEW_BANKS = [
    # === DROIT (6 banques - modules de licence) ===
    {"bankKey": "droit-civil", "title": "Droit Civil (Licence)", "description": "Personnes, famille, biens, obligations, contrats, responsabilité civile.", "category": "Universitaire", "subcategory": "Droit", "icon": "Scale", "color": "emerald", "level": "LICENCE",
     "subject": "Droit civil: personnes physiques et morales, capacité juridique, famille (mariage, divorce, filiation), biens (propriété, usufruit, servitudes), obligations (contrats, quasi-contrats, responsabilité civile délictuelle et contractuelle, dommages et intérêts)"},
    {"bankKey": "droit-affaires", "title": "Droit des Affaires (Licence)", "description": "Droit commercial, sociétés, effets de commerce, concurrence.", "category": "Universitaire", "subcategory": "Droit", "icon": "Briefcase", "color": "cyan", "level": "LICENCE",
     "subject": "Droit des affaires: actes de commerce, commerçants, fonds de commerce, sociétés (SARL, SA, SNC, SCS), effets de commerce (lettre de change, billet à ordre, chèque), procédures collectives (faillite, redressement), droit de la concurrence, propriété intellectuelle"},
    {"bankKey": "droit-public", "title": "Droit Public & Constitutionnel (Licence)", "description": "Constitution, institutions, décentralisation, fonction publique.", "category": "Universitaire", "subcategory": "Droit", "icon": "Landmark", "color": "sky", "level": "LICENCE",
     "subject": "Droit public et constitutionnel: Constitution du Burkina Faso (1991), séparation des pouvoirs, Président du Faso, gouvernement, Assemblée Nationale/ALT, Conseil Constitutionnel, décentralisation (17 régions, 47 provinces), fonction publique, droits fondamentaux"},
    {"bankKey": "droit-penal", "title": "Droit Pénal (Licence)", "description": "Infractions, peines, procédure pénale, principes.", "category": "Universitaire", "subcategory": "Droit", "icon": "Gavel", "color": "rose", "level": "LICENCE",
     "subject": "Droit pénal: principes (légalité, non-rétroactivité), infractions (crimes, délits, contraventions), peines (emprisonnement, amende), circonstances atténuantes/aggravantes, tentative, complicité, récidive, procédure pénale (enquête, instruction, jugement), présomption d'innocence"},
    {"bankKey": "droit-travail", "title": "Droit du Travail (Licence)", "description": "Contrat de travail, salaire, congés, licenciement, syndicats.", "category": "Universitaire", "subcategory": "Droit", "icon": "Users", "color": "amber", "level": "LICENCE",
     "subject": "Droit du travail: contrat de travail (CDI, CDD, essai), salaire (SMIG), durée du travail, congés payés, licenciement (motifs, procédure, indemnités), représentation du personnel (délégués, syndicats), grève, inspection du travail, Code du travail Burkina Faso"},
    {"bankKey": "droit-international", "title": "Droit International (Licence)", "description": "Traités, ONU, CIJ, droit humanitaire, droit UE/AU.", "category": "Universitaire", "subcategory": "Droit", "icon": "Globe2", "color": "violet", "level": "LICENCE",
     "subject": "Droit international: sujets (États, OI), sources (traités, coutume, principes), ONU (Charte 1945, CIJ, Conseil de sécurité), droit humanitaire (Conventions de Genève 1949), droit de l'UA, CEDEAO, Droit de la mer, droit de l'environnement, responsabilité internationale"},

    # === ÉCONOMIE APPROFONDIE ===
    {"bankKey": "economie-licence", "title": "Sciences Économiques - Modules Licence", "description": "Microéconomie avancée, macroéconomie, économie du développement, économétrie.", "category": "Universitaire", "subcategory": "Sciences Économiques", "icon": "TrendingUp", "color": "teal", "level": "LICENCE",
     "subject": "Sciences économiques licence: microéconomie (théorie du consommateur, producteur, marché en équilibre partiel/général, externalités), macroéconomie (IS-LM, solow, Phillips, politiques), économie du développement (croissance, pauvreté, inégalités), économétrie (régression, MCO, hétéroscédasticité)"},

    # === SOCIOLOGIE ===
    {"bankKey": "sociologie", "title": "Sociologie", "description": "Penseurs, théories, méthodes, structures sociales.", "category": "Universitaire", "subcategory": "Sociologie", "icon": "Users", "color": "violet", "level": "LICENCE",
     "subject": "Sociologie: Durkheim (fait social, anomie, suicide), Weber (rationalisation, État, bureaucratie), Marx (lutte des classes, aliénation), Bourdieu (habitus, capital, champ), méthodes (quantitative, qualitative, ethnographie), socialisation, famille, stratification, mobilité sociale, déviance"},

    # === MÉDICAL (4 banques) ===
    {"bankKey": "analyse-biomedicale", "title": "Analyse Biomédicale", "description": "Biochimie, hématologie, microbiologie, immunologie analytique.", "category": "Universitaire", "subcategory": "Analyses Biomédicales", "icon": "FlaskConical", "color": "rose", "level": "LICENCE",
     "subject": "Analyse biomédicale: biochimie (glucose, urée, créatinine, transaminases, bilirubine), hématologie (NFS, hémoglobine, plaquettes, leucocytes, VGM, réticulocytes), microbiologie (culture, antibiogramme, Gram), immunologie (ELISA, Western blot, sérologie), valeurs de référence, contrôle qualité"},
    {"bankKey": "imagerie-medicale", "title": "Imagerie Médicale", "description": "Radiologie, échographie, scanner, IRM, principes physiques.", "category": "Universitaire", "subcategory": "Imagerie Médicale", "icon": "ScanLine", "color": "sky", "level": "LICENCE",
     "subject": "Imagerie médicale: radiographie (principes, Rayons X, contraste), échographie (ondes ultrasonores, doppler), scanner (tomodensitométrie, coupes), IRM (résonance magnétique, T1 T2), médecine nucléaire (scintigraphie, PET), radioprotection (Sievert, ALARA), indications et contre-indications"},
    {"bankKey": "soins-infirmiers", "title": "Soins Infirmiers", "description": "Soins, asepsie, pharmacologie, prise en charge du patient.", "category": "Universitaire", "subcategory": "Soins Infirmiers", "icon": "Syringe", "color": "emerald", "level": "LICENCE",
     "subject": "Soins infirmiers: asepsie et antisepsie, injection (IM, SC, IV), perfusion, prise de constantes (TA, pouls, température, FR), pansements, cathéter, pharmacologie (voies d'administration, posologie, effets indésirables), soins palliatifs, relation soignant-soigné, code de déontologie infirmier"},
    {"bankKey": "laboratoire-medical", "title": "Laboratoire Médical & Analyses", "description": "Pré-analytique, analytique, post-analytique, sécurité.", "category": "Universitaire", "subcategory": "Laboratoire", "icon": "TestTube", "color": "amber", "level": "LICENCE",
     "subject": "Laboratoire médical: phase pré-analytique (prélèvement, identification, transport, conservation), phase analytique (centrifugation, automates, contrôle qualité interne/externe), phase post-analytique (validation, rendu), sécurité au laboratoire (EPI, PSM, déchets DASRI), accréditation, tubes ( EDTA, citrate, sec, fluorure)"},

    # === GÉNIE CIVIL ===
    {"bankKey": "genie-civil", "title": "Génie Civil", "description": "RDM, béton armé, construction, routes, hydraulique.", "category": "Universitaire", "subcategory": "Génie Civil", "icon": "Building", "color": "sky", "level": "LICENCE",
     "subject": "Génie civil: résistance des matériaux (traction, compression, flexion, cisaillement, torsion, moment fléchissant, effort tranchant), béton armé (dosage, ferraillage, enrobage, poteaux, poutres, dalles), mécanique des sols (porosité, compacité, consolidation), routes (subgrade, couches de chaussée), hydraulique"},

    # === GÉOMÈTRE / TOPOGRAPHIE ===
    {"bankKey": "geometre-topographie", "title": "Géomètre-Topographe", "description": "Topographie, nivellement, GPS, cadastre, dessin technique.", "category": "Universitaire", "subcategory": "Topographie", "icon": "Ruler", "color": "teal", "level": "LICENCE",
     "subject": "Topographie et géométrie: nivellement (direct, indirect, trigonométrique), stations totales, théodolite, GPS/GNSS (RTK, statique), photogrammétrie, LIS (laser scanning), projection (UTM, Lambert), coordonnées (WGS84), cadastre (Bornage, morcellement), dessin topographique, calculs d'aires"},

    # === MAINTENANCE BIOMÉDICALE ===
    {"bankKey": "maintenance-biomedicale", "title": "Maintenance Biomédicale", "description": "Équipements médicaux, maintenance, normes, sécurité électrique.", "category": "Universitaire", "subcategory": "Maintenance Biomédicale", "icon": "Wrench", "color": "cyan", "level": "LICENCE",
     "subject": "Maintenance biomédicale: équipements (respirateur artificiel, défibrillateur, moniteur de signes vitaux, pousse-seringue, échographe), maintenance préventive/corrective, normes (CEI 60601-1, ISO 13485), sécurité électrique patient (microchocs, courants de fuite), traçabilité, gestion du parc, tests de conformité, désinfection"},

    # === PSYCHOTECHNIQUE - JEUX (Rubik's, Scrabble, mots) ===
    {"bankKey": "psycho-jeux", "title": "Psychotechnique - Jeux & Mots", "description": "Rubik's cube, Scrabble, anagrammes, mots croisés, énigmes verbales.", "category": "Psychotechnique", "subcategory": "Jeux & Mots", "icon": "Gamepad2", "color": "amber", "level": "TOUS",
     "subject": "Psychotechnique jeux: Rubik's cube (combinaisons, faces, couleurs, algorithmes), Scrabble (lettres, points, mots, double/triple), anagrammes (recomposer des mots), mots croisés, énigmes verbales, palindromes, mots cachés, suites de mots, associations, devinettes logiques"},
]

created = 0
for bank in NEW_BANKS:
    path = os.path.join(BANKS_DIR, f"{bank['bankKey']}.json")
    if os.path.exists(path):
        existing = json.load(open(path))
        for k in ["title", "description", "category", "subcategory", "icon", "color", "level"]:
            if k in bank:
                existing[k] = bank[k]
        with open(path, 'w') as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    else:
        bank["questions"] = []
        with open(path, 'w') as f:
            json.dump(bank, f, ensure_ascii=False, indent=2)
        created += 1
        print(f"  + {bank['bankKey']}")

print(f"\n{created} new banks created, {len(NEW_BANKS)} total defined")
