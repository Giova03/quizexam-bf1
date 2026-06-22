#!/usr/bin/env python3
"""Parse le fichier de développement et extrait tous les QCM."""
import json, re, os
from collections import defaultdict

INPUT = "/home/z/my-project/upload/développement quizexam.txt"
OUTDIR = "/home/z/my-project/scripts/generated/banks"
os.makedirs(OUTDIR, exist_ok=True)

with open(INPUT, "r", encoding="utf-8-sig") as f:
    lines = f.readlines()

questions = []
i = 0
while i < len(lines):
    line = lines[i].strip()
    i += 1
    
    # Skip empty lines, headers, notes
    if not line or line.startswith("---") or line.startswith("NB:") or line.startswith("Note:"):
        continue
    # Skip module description headers (lines with * at start and end)
    if line.startswith("*") and line.endswith("*") and len(line) > 20:
        continue
    # Skip lines that are just section labels
    if line.startswith("UFR") or line.startswith("MODULES") or line.startswith("PARTIE"):
        continue
    
    # Look for question start: a number followed by ) or . or - then text
    # OR a line ending with ? that's not an option
    is_question = False
    question_text = ""
    
    # Pattern 1: "1. Question text?" or "1) Question text"  
    m = re.match(r'^\d+[\)\.\-]\s*(.+)', line)
    if m and '✅' not in line and 'Réponse' not in line and 'Rép' not in line:
        question_text = m.group(1).strip()
        is_question = True
    
    # Pattern 2: Line ends with ? and is long enough
    if not is_question and line.endswith('?') and len(line) > 15 and '✅' not in line and 'Réponse' not in line:
        # Make sure it's not an option line
        if not re.match(r'^[aAbBcCdD][\)\.\-]', line):
            question_text = line
            is_question = True
    
    # Pattern 3: "En quelle année..." etc without number
    if not is_question and len(line) > 20 and '?' in line and '✅' not in line and 'Réponse' not in line:
        if not re.match(r'^[aAbBcCdD][\)\.\-\s]', line):
            # Extract text up to ?
            idx = line.find('?')
            question_text = line[:idx+1].strip()
            is_question = True
    
    if not is_question:
        continue
    
    # Now collect options (next lines)
    opts = {}
    correct = None
    explanation = ""
    
    # Look ahead for options
    while i < len(lines):
        oline = lines[i].strip()
        i += 1
        
        if not oline:
            if len(opts) >= 4:
                break
            continue
        
        # Check for option pattern: a) text, A. text, a- text, etc
        om = re.match(r'^([aAbBcCdD])[\)\.\-\s]\s*(.+)', oline)
        if om:
            letter = om.group(1).upper()
            content = om.group(2).strip()
            # Check for ✅ in the option content
            if '✅' in content:
                content = content.replace('✅', '').strip()
                correct = letter
            opts[letter] = content
            continue
        
        # Check for "Réponse : X" or "Rép : X" 
        rm = re.match(r'^(?:Réponse|Rép)\s*:?\s*\(?([aAbBcCdD])\)?', oline, re.IGNORECASE)
        if rm:
            correct = rm.group(1).upper()
            # Maybe there's explanation after
            rest = re.sub(r'^(?:Réponse|Rép)\s*:?\s*\(?[aAbBcCdD]\)?\s*', '', oline, flags=re.IGNORECASE).strip()
            if rest:
                explanation = rest
            continue
        
        # Check for note/explanation lines
        if oline.lower().startswith("note:") or oline.lower().startswith("commentaire:") or oline.lower().startswith("le conflit") or oline.lower().startswith("la distance"):
            explanation = oline
            continue
        
        # If we already have 4 options and this is not an option, stop
        if len(opts) >= 4:
            # Check if it's a new question
            if re.match(r'^\d+[\)\.\-]', oline) or (oline.endswith('?') and len(oline) > 15):
                i -= 1  # Put back for next iteration
                break
            # Otherwise it might be explanation
            if not explanation and len(oline) > 10:
                explanation = oline
            continue
        
        # If we don't have 4 options yet and this doesn't match, skip
    
    # Validate question
    if len(opts) < 4 or not correct or correct not in 'ABCD':
        continue
    
    # Ensure all 4 options exist
    for L in 'ABCD':
        if L not in opts or not opts[L]:
            opts[L] = "Option " + L
    
    # Check for duplicates
    vals = [opts[L].strip().lower() for L in 'ABCD']
    if len(set(vals)) < 4:
        continue
    
    # Skip assassinated minister question
    if "assassiné" in question_text.lower() and "ministre" in question_text.lower():
        continue
    
    q = {
        "question": question_text,
        "optionA": opts["A"].strip(),
        "optionB": opts["B"].strip(),
        "optionC": opts["C"].strip(),
        "optionD": opts["D"].strip(),
        "correctAnswer": correct,
        "explanation": explanation.strip() if explanation.strip() else "Voir le cours pour plus de détails."
    }
    questions.append(q)

print(f"Total questions parsed: {len(questions)}")

# Categorization
def categorize(qtext):
    ql = qtext.lower()
    if "assassiné" in ql and "ministre" in ql:
        return None
    if any(w in ql for w in ["ph", "pka", "pkb", "molécule", "atome", "ion", "réaction", "oxydation", "acide", "base", "alcène", "alcane", "combustion", "laser", "circuit", "tension", "courant", "force", "énergie", "vitesse", "accélération", "gravitation", "newton", "planck", "électron", "noyau", "radioactiv", "chimie", "physique", "vergence", "lentille", "osmose", "dipôle", "rlc", "cathode", "anode", "électrolyse", "calorie", "bronze", "alliage", "propane", "butane", "permanganate", "sulfate", "dnph", "soupape", "moteur", "choc", "uranium", "liaison carbone", "ohm", "dioxyde", "dihydrogène", "système pseudo"]):
        return "physique-chimie"
    if any(w in ql for w in ["adn", "arn", "cellule", "génétique", "chromosome", "mitose", "méiose", "écosystème", "écologie", "plante", "photosynthèse", "reproduction", "système nerveux", "neurone", "synapse", "immun", "anticorps", "vaccin", "virus", "bactérie", "évolution", "darwin", "fossile", "tectonique", "séisme", "volcan", "enzyme", "respiration cellulaire", "métabolisme", "embryon", "placenta", "fécondation", "hormone", "ovulation", "spermat", "caryotype", "trisomie", "drépanocytose", "albinisme", "daltonisme", "hémophilie", "ogm", "thérapie génique", "biotope", "chaîne trophique", "pollution", "biodiversité", "déforestation", "effet de serre", "développement durable", "stomate", "ovipare", "systole", "cœur", "poumon", "rein", "foie", "estomac", "digestion", "respiration", "circulation sanguine", "système nerveux"]):
        return "svt-modules"
    if any(w in ql for w in ["scrabble", "orthographe", "accord", "conjugaison", "adjectif", "pronom", "synonyme", "grammaire", "participe", "figure de style", "métaphore", "comparaison", "hyperbole", "litote", "palindrome", "anagramme", "cymbale", "coup de cœur", "si et s'y"]):
        return "psycho-vocabulaire"
    if any(w in ql for w in ["littérature", "roman", "poème", "théâtre", "auteur", "écrivain", "négritude", "senghor", "césaire", "damas", "mariama bâ", "sony labou", "sembène", "kourouma", "camara laye", "shakespeare", "molière", "sartre", "existentialiste", "platon", "république", "philosophe", "pascal", "marx"]):
        return "litterature"
    if any(w in ql for w in ["suite", "complétez", "trouvez l'intrus", "domino", "nombre manquant", "logique", "17△", "9/4/9", "bien placé", "mal placé", "rubik"]):
        return "psycho-logique"
    if any(w in ql for w in ["sociologie", "durkheim", "weber", "bourdieu", "foucault", "anthropologie", "psychologie", "démographie", "population", "migration", "urbanisation", "fécondité", "travail social", "genre", "vbg", "violence", "mgf", "mariage précoce", "handicap", "orphelin", "réfugié", "pdi", "conasur", "action sociale"]):
        return "sociologie-anthropologie"
    if any(w in ql for w in ["gsp", "gendarmerie", "eaux et forêts", "militaire", "barkhane", "gumi", "armée", "brigade", "fonction publique", "enaref", "ifpb", "pénitentiaire", "bclcc", "cybercriminalité", "paramilitaire"]):
        return "concours-paramilitaire"
    if any(w in ql for w in ["médecin", "soin", "infirmier", "patient", "santé", "paludisme", "vih", "sida", "vaccination", "médicament", "pharmacologie", "asepsie", "pansement", "perfusion", "injection", "défibrillateur", "respirateur", "biomédical", "imagerie", "radiologie", "échographie", "scanner", "irm", "laboratoire", "analyse", "sang", "globule", "plaquette", "hémoglobine", "glycémie", "cholestérol", "tension artérielle", "fréquence cardiaque", "saturation", "oxygène", "avc", "arrêt cardiaque", "rcp", "contraction"]):
        return "medecine-sante"
    if any(w in ql for w in ["économie", "inflation", "pib", "marché", "fiscal", "comptab", "marketing", "monétaire", "bancaire", "impôt", "douane", "investissement", "entrepreneur", "schengen", "géopolitique", "importation", "exportation", "coût du transport", "taux d'intérêt", "dollar"]):
        return "sciences-eco-modules"
    if any(w in ql for w in ["droit", "constitution", "pénal", "ohada", "contrat", "société", "judiciaire", "tribunal", "procédure", "légal", "juridique", "code", "justice", "loi"]):
        return "droit-modules"
    if any(w in ql for w in ["capitale", "monnaie", "pays", "continent", "fleuve", "montagne", "désert", "océan", "frontière", "voisin", "plus vaste", "plus grand pays", "plus grande ville"]):
        return "pays-capitales"
    if any(w in ql for w in ["2025", "2026", "pape", "léon", "françois", "nobel", "coupe du monde 2026", "sonko", "ndayishimiye", "krasznahorkai", "togo", "réintégré", "extradé", "inondation", "croix-rouge", "alerte", "diabaté", "rahimo", "champion", "super galian", "diombélé", "cep 2026", "bepc 2026", "can 2025"]):
        return "actualite-2025"
    if any(w in ql for w in ["guerre mondiale", "hitler", "nazi", "shoah", "de gaulle", "pétain", "vichy", "berlin", "indépendance", "colonie", "algérie", "décolonisation", "révolution", "1789", "onu", "1945", "1914", "1918", "évian", "éthiopie", "haïlé sélassié", "mandela", "biafra", "liberia", "pacte", "urss", "stalingrad", "pearl harbor", "guerre froide", "non-alignement", "oua", "union africaine", "addis-abeba", "kilimandjaro", "muraille verte", "cilss", "désertification", "zlecaf", "coup d'état", "pyramide", "khéops", "zeus", "dieu grec", "philosophe", "justice", "république", "première guerre", "seconde guerre", "régime politique", "france libre", "axe"]):
        return "histoire-monde"
    if any(w in ql for w in ["burkina", "faso", "ouaga", "bobo", "sankara", "traoré", "compaoré", "fespaco", "siao", "snc", "alt", "aes", "sahel", "mpsr", "fsp", "volta", "yaméogo", "lamizana", "damiba", "kaboré", "loropéni", "mossi", "devise", "patrie ou la mort", "région", "province", "commune", "décentralisation", "chefferie", "royaume", "colonisation", "haute-volta", "onab", "bceao", "umoa", "cedeao", "or", "diamant", "minier", "agriculture", "secteur", "tertiaire", "primaire", "comoé", "touristique", "explorateur", "binger", "caillié", "barth", "kiéthéga", "ki-zerbo", "archéologie", "viticulture", "viniculture", "route nationale", "ouahigouya", "kaya", "fada", "kantchari", "arbinda", "gaoua", "sandbondtenga", "bassitinga", "djelgodji", "kossin", "sanmatenga", "oubritenga", "ibrahim traoré", "oussmane bougma", "ibrahim traoré", "président", "investiture", "serment", "désigné"]):
        return "culture-bf"
    return "culture-bf"

# Group and dedupe
bank_questions = defaultdict(list)
for q in questions:
    cat = categorize(q["question"])
    if cat:
        bank_questions[cat].append(q)

for bk in bank_questions:
    seen = set()
    unique = []
    for q in bank_questions[bk]:
        key = q["question"].strip().lower()[:100]
        if key not in seen:
            seen.add(key)
            unique.append(q)
    bank_questions[bk] = unique

banks_config = {
    "culture-bf": {"title": "Culture Générale - Burkina Faso", "description": "Histoire, géographie, institutions et culture du Burkina Faso.", "category": "Culture Générale", "subcategory": "Burkina Faso", "icon": "Landmark", "color": "emerald", "level": "TOUS"},
    "actualite-2025": {"title": "Actualité 2025-2026", "description": "Événements, personnalités et dates de 2025-2026.", "category": "Culture Générale", "subcategory": "Actualité", "icon": "Newspaper", "color": "rose", "level": "TOUS"},
    "histoire-monde": {"title": "Histoire du Monde", "description": "Guerres, civilisations, décolonisation, philosophie.", "category": "Culture Générale", "subcategory": "Histoire", "icon": "Globe2", "color": "amber", "level": "TOUS"},
    "droit-modules": {"title": "Droit - Tous Modules Licence", "description": "Droit civil, pénal, public, commercial, OHADA, travail, fiscal, international.", "category": "Universitaire", "subcategory": "Droit", "icon": "Scale", "color": "emerald", "level": "LICENCE"},
    "sciences-eco-modules": {"title": "Sciences Économiques et de Gestion", "description": "Micro, macro, comptabilité, marketing, finance, gestion.", "category": "Universitaire", "subcategory": "Sciences Éco", "icon": "TrendingUp", "color": "cyan", "level": "LICENCE"},
    "svt-modules": {"title": "SVT - Sciences de la Vie et de la Terre", "description": "Biologie, géologie, écologie, génétique (6e à Terminale D).", "category": "Secondaire", "subcategory": "SVT", "icon": "Dna", "color": "rose", "level": "LYCEE"},
    "physique-chimie": {"title": "Physique-Chimie", "description": "Mécanique, électricité, chimie organique, acide-base.", "category": "Secondaire", "subcategory": "Physique-Chimie", "icon": "Atom", "color": "sky", "level": "LYCEE"},
    "litterature": {"title": "Littérature - Africaine, Française et Anglaise", "description": "Romans, poésie, théâtre, courants littéraires.", "category": "Culture Générale", "subcategory": "Littérature", "icon": "BookMarked", "color": "teal", "level": "TOUS"},
    "psycho-logique": {"title": "Tests Psychotechniques - Logique", "description": "Suites, dominos, formes, raisonnement.", "category": "Psychotechnique", "subcategory": "Logique", "icon": "Brain", "color": "violet", "level": "TOUS"},
    "psycho-vocabulaire": {"title": "Tests Psychotechniques - Vocabulaire", "description": "Orthographe, grammaire, synonymes, accords.", "category": "Psychotechnique", "subcategory": "Vocabulaire", "icon": "SpellCheck", "color": "amber", "level": "TOUS"},
    "sociologie-anthropologie": {"title": "Sociologie, Anthropologie & Psychologie", "description": "Sciences sociales, démographie, action sociale.", "category": "Universitaire", "subcategory": "Sciences Humaines", "icon": "Users", "color": "violet", "level": "LICENCE"},
    "action-sociale": {"title": "Action Sociale & Promotion du Genre", "description": "Travail social, VBG, genre, santé communautaire.", "category": "Concours", "subcategory": "Action Sociale", "icon": "HeartPulse", "color": "rose", "level": "LICENCE"},
    "concours-paramilitaire": {"title": "Concours Paramilitaires & Militaires", "description": "GSP, Gendarmerie, Eaux & Forêts, forces armées.", "category": "Concours", "subcategory": "Paramilitaire", "icon": "Shield", "color": "sky", "level": "LICENCE"},
    "pays-capitales": {"title": "Pays, Capitales et Monnaies", "description": "Géographie mondiale: pays, capitales, monnaies.", "category": "Culture Générale", "subcategory": "Géographie", "icon": "Globe2", "color": "sky", "level": "TOUS"},
    "medecine-sante": {"title": "Médecine & Santé", "description": "Soins infirmiers, analyses, imagerie, pharmacologie.", "category": "Universitaire", "subcategory": "Médecine", "icon": "HeartPulse", "color": "rose", "level": "LICENCE"},
}

total = 0
for bk, config in banks_config.items():
    qs = bank_questions.get(bk, [])
    bank = {**config, "bankKey": bk, "questions": qs}
    path = os.path.join(OUTDIR, f"{bk}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(bank, f, ensure_ascii=False, indent=2)
    total += len(qs)
    print(f"  {bk}: {len(qs)} questions")

print(f"\nTotal: {total} questions across {len(banks_config)} banks")
