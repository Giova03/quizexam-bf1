"""
Parse Giovanni.txt to extract QCM questions.
Format: questions numbered, options a/b/c/d (or A/B/C/D), correct answer marked with ✅
"""
import json, re, os

INPUT = "/home/z/my-project/upload/Giovanni.txt"
OUTPUT = "/home/z/my-project/scripts/generated/banks/giovanni-verified.json"

with open(INPUT, "r", encoding="utf-8-sig") as f:
    raw = f.read()

lines = raw.split("\n")

questions = []
current_q = None

def flush(q):
    """Validate and save a question"""
    if not q or not q.get("question"):
        return
    if not q.get("correctAnswer"):
        return
    opts = {}
    for L in ["A", "B", "C", "D"]:
        if q.get(f"option{L}"):
            opts[L] = q["option" + L]
    if len(opts) < 4:
        return  # need all 4 options
    if q["correctAnswer"] not in opts:
        return
    # Check for duplicate options
    vals = [v.strip().lower() for v in opts.values()]
    if len(set(vals)) < 4:
        return
    clean = {
        "question": q["question"].strip(),
        "optionA": q["optionA"].strip(),
        "optionB": q["optionB"].strip(),
        "optionC": q["optionC"].strip(),
        "optionD": q["optionD"].strip(),
        "correctAnswer": q["correctAnswer"],
        "explanation": q.get("explanation", "").strip() or "Voir le cours pour plus de détails.",
    }
    questions.append(clean)

# State machine
i = 0
while i < len(lines):
    line = lines[i].rstrip()
    stripped = line.strip()

    # Detect new question: starts with number followed by ) or - or .
    qmatch = re.match(r"^(\d+)[\)\.\-]\s*(.+)", stripped)
    if qmatch:
        # Flush previous
        if current_q:
            flush(current_q)
        current_q = {
            "question": qmatch.group(2).strip(),
            "correctAnswer": None,
            "explanation": "",
        }
        i += 1
        continue

    # Detect option line: a) / b) / c) / d) or A- / B- etc
    omatch = re.match(r"^([aAbBcCdD])[\)\.\-]\s*(.+)", stripped)
    if omatch and current_q:
        letter = omatch.group(1).upper()
        content = omatch.group(2).strip()
        # Remove the ✅ marker and record correct answer
        if "✅" in content:
            content = content.replace("✅", "").strip()
            current_q["correctAnswer"] = letter
        # Also handle "✅" appearing at start
        content = content.lstrip("✅").strip()
        current_q[f"option{letter}"] = content
        i += 1
        continue

    # Detect commentary/explanation
    if stripped.lower().startswith("commentaire") or stripped.lower().startswith("explication"):
        if current_q:
            current_q["explanation"] = stripped.split(":", 1)[-1].strip() if ":" in stripped else stripped
        i += 1
        continue

    # Multi-line: append to question or option
    if current_q and stripped and not stripped.startswith("---"):
        # If last option being built, append to it
        for L in ["D", "C", "B", "A"]:
            key = f"option{L}"
            if key in current_q and current_q[key] and not current_q[key].endswith("."):
                # Check if this is a continuation
                if len(stripped) > 3 and not re.match(r"^[aAbBcCdD][\)\.\-]", stripped):
                    current_q[key] += " " + stripped
                    break
        else:
            # Append to question if no options yet
            if not any(k.startswith("option") for k in current_q):
                current_q["question"] += " " + stripped

    i += 1

# Flush last
if current_q:
    flush(current_q)

# Dedupe by question text
seen = set()
unique = []
for q in questions:
    key = q["question"].lower().strip()[:100]
    if key not in seen:
        seen.add(key)
        unique.append(q)

# Categorize: try to detect topic from question content
def categorize(q):
    ql = q["question"].lower()
    if any(w in ql for w in ["burkina", "faso", "ouaga", "bobo", "alt", "sankara", "traoré", "fespaco", "siao", "snc", "aes", "sahel"]):
        return ("culture-bf", "Culture Générale", "Burkina Faso")
    if any(w in ql for w in ["onu", "unesco", "unicef", "fao", "oua", "union africaine", "cedeao", "parlement panafricain", "conférence", "guerre froide", "berlin", "yalta", "potsdam", "pearl harbor", "décolonisation", "non-alignement"]):
        return ("histoire", "Histoire", "Relations internationales")
    if any(w in ql for w in ["math", "calcul", "équation", "fonction", "dérivée", "intégrale", "probabilité", "statistique", "suite", "géométrie"]):
        return ("math-lycee", "Mathématiques", "Mathématiques")
    if any(w in ql for w in ["adn", "arn", "cellule", "photosynthèse", "chromosome", "génétique", "écosystème", "séisme", "volcan", "plaques"]):
        return ("svt-lycee", "SVT", "Sciences de la Vie et de la Terre")
    if any(w in ql for w in ["philosoph", "platon", "aristote", "descartes", "kant", "rousseau", "nietzsche", "sartre", "existential"]):
        return ("philo-terminale", "Philosophie", "Philosophie")
    if any(w in ql for w in ["économie", "inflation", "pib", "monnaie", "banque", "marché", "offre", "demande"]):
        return ("economie", "Économie", "Économie")
    return ("culture-bf", "Culture Générale", "Divers")

# Save as a single bank with all questions
bank = {
    "bankKey": "giovanni-verified",
    "title": "Banque Vérifiée - Questions Diverses (Giovanni)",
    "description": "Questions vérifiées extraites des documents fournis, couvrant la culture générale, l'histoire, la géographie et diverses matières.",
    "category": "Culture Générale",
    "subcategory": "Questions vérifiées",
    "icon": "BadgeCheck",
    "color": "teal",
    "level": "TOUS",
    "questions": unique,
}

with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(bank, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(unique)} valid questions (from {len(questions)} parsed)")
print(f"Saved to {OUTPUT}")
