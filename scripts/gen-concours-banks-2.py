"""
Génère les dernières banques concours + questions à deux réponses.
"""
import json, os

OUTPUT_DIR = "/home/z/my-project/scripts/generated/banks"

BANKS = []

# ============================================================
# 15. CONCOURS ÉCONOMIE, STATISTIQUES & FINANCE
# ============================================================
BANKS.append({
    "bankKey": "concours-economie-finance",
    "title": "Concours Économie, Statistiques & Finance",
    "description": "Économie générale, statistiques, finance publique, monnaie, commerce.",
    "category": "Concours",
    "subcategory": "Économie & Finance",
    "icon": "TrendingUp",
    "color": "cyan",
    "level": "LICENCE",
    "questions": [
        {"question":"Le PIB (Produit Intérieur Brut) mesure :","optionA":"La richesse produite sur un territoire en un an","optionB":"Le revenu d'un ménage","optionC":"La population active","optionD":"Le taux d'inflation","correctAnswer":"A","explanation":"Le PIB = somme des valeurs ajoutées des biens et services produits sur le territoire en un an."},
        {"question":"L'inflation est :","optionA":"La baisse générale des prix","optionB":"La hausse générale et durable des prix","optionC":"La stagnation","optionD":"La déflation","correctAnswer":"B","explanation":"L'inflation = hausse générale et durable du niveau des prix."},
        {"question":"Le taux directeur est fixé par :","optionA":"Le gouvernement","optionB":"La banque centrale (BCEAO pour l'UMOA)","optionC":"Les banques commerciales","optionD":"Le FMI","correctAnswer":"B","explanation":"Le taux directeur est fixé par la banque centrale."},
        {"question":"La BCEAO est la banque centrale de :","optionA":"Tout le monde","optionB":"L'Union Monétaire Ouest Africaine (UMOA)","optionC":"L'Europe","optionD":"L'Afrique australe","correctAnswer":"B","explanation":"La BCEAO émet le FCFA pour les 8 pays de l'UMOA."},
        {"question":"Le franc CFA est arrimé à :","optionA":"Au dollar","optionB":"À l'euro","optionC":"Au yen","optionD":"Aucune monnaie","correctAnswer":"B","explanation":"1 euro = 655,957 FCFA (parité fixe)."},
        {"question":"Le nombre de pays membres de l'UMOA est :","optionA":"5","optionB":"8","optionC":"15","optionD":"25","correctAnswer":"B","explanation":"L'UMOA compte 8 pays (Bénin, Burkina, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo)."},
        {"question":"La CEDEAO compte combien de pays membres ?","optionA":"8","optionB":"12","optionC":"15","optionD":"25","correctAnswer":"C","explanation":"La CEDEAO compte 15 États membres."},
        {"question":"Le budget de l'État est :","optionA":"Un document comptable annuel des recettes et dépenses","optionB":"Le PIB","optionC":"La dette","optionD":"Les impôts","correctAnswer":"A","explanation":"Le budget décrit les recettes et dépenses prévisionnelles de l'État."},
        {"question":"Un budget est en déficit quand :","optionA":"Recettes > Dépenses","optionB":"Recettes < Dépenses","optionC":"Recettes = Dépenses","optionD":"Aucune recette","correctAnswer":"B","explanation":"Déficit budgétaire : dépenses supérieures aux recettes."},
        {"question":"La TVA est :","optionA":"Un impôt direct","optionB":"Un impôt indirect sur la consommation","optionC":"Une taxe douanière","optionD":"Un salaire","correctAnswer":"B","explanation":"La TVA (Taxe sur la Valeur Ajoutée) est un impôt indirect."},
        {"question":"Le taux de TVA standard au Burkina Faso est de :","optionA":"9%","optionB":"18%","optionC":"20%","optionD":"25%","correctAnswer":"B","explanation":"Le taux normal de TVA au Burkina Faso est 18%."},
        {"question":"La balance commerciale est :","optionA":"Recettes - Dépenses de l'État","optionB":"Exportations - Importations de biens","optionC":"Le PIB","optionD":"La dette","correctAnswer":"B","explanation":"Balance commerciale = Exportations - Importations de biens."},
        {"question":"Une balance commerciale excédentaire signifie :","optionA":"Importations > Exportations","optionB":"Exportations > Importations","optionC":"Égalité parfaite","optionD":"Aucun échange","correctAnswer":"B","explanation":"Excédent commercial : exportations supérieures aux importations."},
        {"question":"La monnaie fiduciaire est :","optionA":"La monnaie électronique","optionB":"Les billets et pièces","optionC":"Les chèques","optionD":"Les bitcoins","correctAnswer":"B","explanation":"La monnaie fiduciaire = billets et pièces (fondée sur la confiance)."},
        {"question":"La monnaie scripturale est :","optionA":"Les billets","optionB":"Les écritures bancaires (virements)","optionC":"Les pièces","optionD":"Le troc","correctAnswer":"B","explanation":"La monnaie scripturale est tenue dans les comptes bancaires."},
        {"question":"Le marché monétaire est :","optionA":"Le marché des actions","optionB":"Le marché des capitaux à court terme","optionC":"Le marché immobilier","optionD":"Le marché du travail","correctAnswer":"B","explanation":"Le marché monétaire concerne les capitaux à court terme (entre banques et banque centrale)."},
        {"question":"Le marché financier est :","optionA":"Le marché des capitaux à long terme (actions, obligations)","optionB":"Le marché des fruits","optionC":"Le marché des changes","optionD":"Le marché noir","correctAnswer":"A","explanation":"Le marché financier finance le long terme (actions, obligations)."},
        {"question":"Une action représente :","optionA":"Une dette de l'entreprise","optionB":"Une part du capital d'une entreprise","optionC":"Un prêt","optionD":"Un salaire","correctAnswer":"B","explanation":"Une action = titre de propriété d'une fraction de l'entreprise."},
        {"question":"Une obligation représente :","optionA":"Une part de capital","optionB":"Une créance (dette) sur l'émetteur","optionC":"Un salaire","optionD":"Une subvention","correctAnswer":"B","explanation":"Une obligation = titre de créance (l'émetteur doit rembourser + intérêts)."},
        {"question":"Le taux d'intérêt est :","optionA":"Le prix de l'argent","optionB":"La masse monétaire","optionC":"L'inflation","optionD":"Le PIB","correctAnswer":"A","explanation":"Le taux d'intérêt = coût de l'emprunt / rémunération de l'épargne."},
        {"question":"L'offre est :","optionA":"La quantité que les consommateurs veulent acheter","optionB":"La quantité que les producteurs sont prêts à vendre","optionC":"Le prix","optionD":"L'inflation","correctAnswer":"B","explanation":"L'offre émane des producteurs ; la demande des consommateurs."},
        {"question":"La loi de l'offre et de la demande dit que :","optionA":"Le prix monte toujours","optionB":"Le prix s'établit au point d'équilibre entre offre et demande","optionC":"Le prix est fixé par l'État","optionD":"Le prix est nul","correctAnswer":"B","explanation":"À l'équilibre, offre = demande, ce qui détermine le prix."},
        {"question":"L'élasticité-prix de la demande mesure :","optionA":"La qualité du produit","optionB":"La variation de la demande suite à une variation de prix","optionC":"L'offre","optionD":"Le PIB","correctAnswer":"B","explanation":"Élasticité-prix = %ΔQd / %ΔP."},
        {"question":"Un bien normal a une élasticité-revenu :","optionA":"Négative","optionB":"Positive","optionC":"Nulle","optionD":"Infinie","correctAnswer":"B","explanation":"Pour un bien normal, la demande augmente avec le revenu (élasticité positive)."},
        {"question":"Un bien inférieur (ex: produits de bas de gamme) a une élasticité-revenu :","optionA":"Positive","optionB":"Négative","optionC":"Nulle","optionD":"Égale à 1","correctAnswer":"B","explanation":"Pour un bien inférieur, la demande baisse quand le revenu augmente."},
        {"question":"Le FMI est :","optionA":"Le Fonds Monétaire International","optionB":"La Fédération des Marchés Internationaux","optionC":"Le Fonds de Maintien International","optionD":"Le Fonds Mondial de l'Investissement","correctAnswer":"A","explanation":"FMI = Fonds Monétaire International (créé en 1944)."},
        {"question":"La Banque Mondiale a pour objectif principal :","optionA":"La paix mondiale","optionB":"La réduction de la pauvreté et le financement du développement","optionC":"Le commerce","optionD":"La culture","correctAnswer":"B","explanation":"La Banque Mondiale finance des projets de développement."},
        {"question":"La moyenne arithmétique de 10, 20, 30 est :","optionA":"15","optionB":"20","optionC":"25","optionD":"30","correctAnswer":"B","explanation":"(10+20+30)/3 = 60/3 = 20."},
        {"question":"La médiane de 4, 7, 9, 12, 15 est :","optionA":"4","optionB":"7","optionC":"9","optionD":"12","correctAnswer":"C","explanation":"La médiane d'une série ordonnée de 5 valeurs est la 3e : 9."},
        {"question":"L'écart-type mesure :","optionA":"La moyenne","optionB":"La dispersion autour de la moyenne","optionC":"Le mode","optionD":"La médiane","correctAnswer":"B","explanation":"L'écart-type = dispersion des valeurs autour de la moyenne."},
        {"question":"Le coefficient de variation est :","optionA":"σ/μ","optionB":"μ/σ","optionC":"σ²","optionD":"μ²","correctAnswer":"A","explanation":"CV = écart-type / moyenne (sans unité)."},
        {"question":"La corrélation de Pearson varie entre :","optionA":"0 et 1","optionB":"-1 et 1","optionC":"-∞ et +∞","optionD":"0 et 100","correctAnswer":"B","explanation":"r ∈ [-1, 1] : -1 = anticorrélation parfaite, +1 = corrélation parfaite."},
        {"question":"L'indice de Laspeyres utilise comme pondération :","optionA":"Les quantités de l'année courante","optionB":"Les quantités de l'année de base","optionC":"Les prix courants","optionD":"Aucune quantité","correctAnswer":"B","explanation":"Laspeyres : panier fixe de l'année de base (utilisé pour l'IPC)."},
        {"question":"Le taux de chômage est :","optionA":"Le nombre de chômeurs / population active","optionB":"La population totale","optionC":"Le nombre d'employés","optionD":"Le PIB","correctAnswer":"A","explanation":"Taux de chômage = chômeurs / population active."},
    ],
})

# ============================================================
# 16. CONCOURS NUMÉRIQUE, MÉDIAS & CULTURE
# ============================================================
BANKS.append({
    "bankKey": "concours-numerique-medias",
    "title": "Concours Numérique, Médias & Culture",
    "description": "TIC, communication, médias, droit de la communication, culture numérique.",
    "category": "Concours",
    "subcategory": "Numérique & Médias",
    "icon": "Radio",
    "color": "violet",
    "level": "LICENCE",
    "questions": [
        {"question":"Que signifie l'acronyme TIC ?","optionA":"Technologies de l'Information et de la Communication","optionB":"Taxe sur les Industries Culturelles","optionC":"Transmissions Internationales du Commerce","optionD":"Travail et Innovation Collective","correctAnswer":"A","explanation":"TIC = Technologies de l'Information et de la Communication."},
        {"question":"Que signifie l'acronyme HTML ?","optionA":"HyperText Markup Language","optionB":"HyperText Transfer Protocol","optionC":"High Tech Modern Language","optionD":"Home Tool Markup Language","correctAnswer":"A","explanation":"HTML = HyperText Markup Language (langage de balisage pour le Web)."},
        {"question":"Que signifie l'acronyme HTTP ?","optionA":"HyperText Transfer Protocol","optionB":"HyperText Markup Language","optionC":"High Transmission Transfer Protocol","optionD":"Home Tool Transfer Protocol","correctAnswer":"A","explanation":"HTTP = HyperText Transfer Protocol (protocole du Web)."},
        {"question":"Que signifie l'acronyme URL ?","optionA":"Uniform Resource Locator","optionB":"Universal Reading Link","optionC":"United Resource Language","optionD":"Unique Reference Locator","correctAnswer":"A","explanation":"URL = Uniform Resource Locator (adresse Web)."},
        {"question":"Le HTTPS diffère du HTTP par :","optionA":"Sa vitesse","optionB":"Le chiffrement (sécurité) des échanges","optionC":"La couleur","optionD":"Le port uniquement","correctAnswer":"B","explanation":"HTTPS = HTTP + SSL/TLS pour chiffrer les communications."},
        {"question":"L'ARPT au Burkina Faso est :","optionA":"L'Autorité de Régulation des Télécommunications","optionB":"Une chaîne TV","optionC":"Un ministère","optionD":"Un opérateur","correctAnswer":"A","explanation":"L'ARPT régule le secteur des télécommunications au Burkina Faso."},
        {"question":"Le sigle ISP signifie :","optionA":"Internet Service Provider","optionB":"International Standard Protocol","optionC":"Information System Provider","optionD":"Internet Standard Protocol","correctAnswer":"A","explanation":"ISP = fournisseur d'accès Internet."},
        {"question":"ONATEL est :","optionA":"Un opérateur de télécommunications au Burkina Faso","optionB":"Un ministère","optionC":"Une ONG","optionD":"Un journal","correctAnswer":"A","explanation":"ONATEL = Office National des Télécommunications (historique)."},
        {"question":"La liberté de la presse est garantie par :","optionA":"La loi fiscale","optionB":"La Constitution (art. 8 au Burkina Faso) et la DUDH (art. 19)","optionC":"Le code minier","optionD":"Aucun texte","correctAnswer":"B","explanation":"La liberté de la presse est un droit fondamental garanti par les textes constitutionnels et internationaux."},
        {"question":"Le journalisme d'investigation a pour but :","optionA":"De faire de la publicité","optionB":"De révéler des faits cachés (corruption, abus)","optionC":"De divertir","optionD":"De classifier","correctAnswer":"B","explanation":"Le journalisme d'investigation enquête sur des sujets cachés."},
        {"question":"La charte du journaliste exige :","optionA":"Le mensonge","optionB":"L'objectivité, la vérification des sources, le respect de la vie privée","optionC":"La diffamation","optionD":"Le plagiat","correctAnswer":"B","explanation":"La déontologie journalistique repose sur objectivité et vérification."},
        {"question":"Le droit à l'image signifie :","optionA":"Qu'on peut photographier n'importe qui","optionB":"Qu'il faut le consentement pour utiliser l'image de quelqu'un","optionC":"Que l'image est libre","optionD":"Que la photo est interdite","correctAnswer":"B","explanation":"Le droit à l'image protège les personnes contre l'usage non consenti de leur image."},
        {"question":"La diffamation est :","optionA":"Une critique factuelle","optionB":"L'allégation d'un fait portant atteinte à l'honneur","optionC":"Un compliment","optionD":"Une information neutre","correctAnswer":"B","explanation":"La diffamation = allégation/imputation d'un fait qui porte atteinte à l'honneur."},
        {"question":"La RTB (Radiodiffusion-Télévision du Burkina) est :","optionA":"Une chaîne privée","optionB":"La chaîne publique nationale","optionC":"Une radio étrangère","optionD":"Un journal","correctAnswer":"B","explanation":"La RTB est l'audiovisuel public du Burkina Faso."},
        {"question":"La FESPACO est :","optionA":"Un festival de cinéma africain à Ouagadougou","optionB":"Une conférence politique","optionC":"Un tournoi de football","optionD":"Une foire commerciale","correctAnswer":"A","explanation":"La FESPACO = Festival Panafricain du Cinéma et de la Télévision de Ouagadougou (créé en 1969)."},
        {"question":"Le SIAO se tient à :","optionA":"Bobo-Dioulasso","optionB":"Ouagadougou","optionC":"Koudougou","optionD":"Bordeaux","correctAnswer":"B","explanation":"Le SIAO (Salon International de l'Artisanat de Ouagadougou) se tient à Ouagadougou."},
        {"question":"La SNC (Semaine Nationale de la Culture) se tient à :","optionA":"Ouagadougou","optionB":"Bobo-Dioulasso","optionC":"Tenkodogo","optionD":"Banfora","correctAnswer":"B","explanation":"La SNC se tient à Bobo-Dioulasso depuis 1983."},
        {"question":"Le code des médias au Burkina Faso date de :","optionA":"1991","optionB":"1993","optionC":"2000","optionD":"2010","correctAnswer":"B","explanation":"La loi sur la liberté de la communication (information) date de 1993."},
        {"question":"Un média social est :","optionA":"Un journal imprimé","optionB":"Une plateforme en ligne d'échange (Facebook, X, etc.)","optionC":"Une radio","optionD":"Une TV publique","correctAnswer":"B","explanation":"Un média social permet la création et le partage de contenu par les utilisateurs."},
        {"question":"Le 'fact-checking' consiste à :","optionA":"Diffuser des rumeurs","optionB":"Vérifier la véracité des affirmations publiques","optionC":"Diffuser des publicités","optionD":"Créer des fake news","correctAnswer":"B","explanation":"Le fact-checking vérifie les affirmations factuelles (journalisme de vérification)."},
        {"question":"La 'fake news' désigne :","optionA":"Une information vraie","optionB":"Une information fausse présentée comme vraie","optionC":"Un journal","optionD":"Un sondage","correctAnswer":"B","explanation":"Fake news = information mensongère diffusée pour manipuler."},
        {"question":"Le RGPD est :","optionA":"Un règlement européen sur la protection des données","optionB":"Un code minier","optionC":"Une norme comptable","optionD":"Un protocole réseau","correctAnswer":"A","explanation":"Le RGPD (Règlement Général sur la Protection des Données) de l'UE (2018)."},
        {"question":"Le 'big data' désigne :","optionA":"Une petite base de données","optionB":"D'énormes volumes de données complexes","optionC":"Un logiciel","optionD":"Un virus","correctAnswer":"B","explanation":"Big data = données massives (volume, vélocité, variété)."},
        {"question":"L'intelligence artificielle (IA) est :","optionA":"Une calculatrice","optionB":"Des systèmes simulant l'intelligence humaine","optionC":"Un moteur de recherche","optionD":"Un smartphone","correctAnswer":"B","explanation":"L'IA = systèmes capables de tâches cognitives (apprentissage, raisonnement)."},
        {"question":"L'apprentissage automatique (machine learning) est :","optionA":"Apprendre par cœur","optionB":"Une branche de l'IA où les machines apprennent à partir de données","optionC":"La saisie manuelle","optionD":"Le HTML","correctAnswer":"B","explanation":"Machine learning = apprentissage automatique à partir de données."},
        {"question":"Le cloud computing est :","optionA":"La météo","optionB":"L'accès à des services informatiques via Internet","optionC":"Un type de câble","optionD":"Un antivirus","correctAnswer":"B","explanation":"Cloud computing = services informatiques à la demande via Internet."},
        {"question":"L'open source désigne :","optionA":"Un logiciel payant","optionB":"Un logiciel dont le code source est librement accessible et modifiable","optionC":"Un virus","optionD":"Une marque déposée","correctAnswer":"B","explanation":"Open source = code source ouvert et modifiable (ex : Linux)."},
        {"question":"Le droit d'auteur protège :","optionA":"Les idées","optionB":"Les œuvres originales (littéraires, artistiques, logicielles)","optionC":"Les noms","optionD":"Les marques","correctAnswer":"B","explanation":"Le droit d'auteur protège la forme des œuvres, pas les idées."},
        {"question":"La cybercriminalité désigne :","optionA":"Les accidents de la route","optionB":"Les infractions utilisant les technologies de l'information","optionC":"Le commerce électronique","optionD":"La navigation Web","correctAnswer":"B","explanation":"Cybercriminalité = infractions commises via les TIC."},
    ],
})

# ============================================================
# 17. CONCOURS ÉDUCATION & FORMATION
# ============================================================
BANKS.append({
    "bankKey": "concours-education-formation",
    "title": "Concours Éducation & Formation",
    "description": "Pédagogie, didactique, psychologie de l'éducation, système éducatif burkinabè.",
    "category": "Concours",
    "subcategory": "Éducation",
    "icon": "GraduationCap",
    "color": "emerald",
    "level": "LICENCE",
    "questions": [
        {"question":"Le système éducatif burkinabè est structuré en :","optionA":"2 niveaux","optionB":"3 niveaux (primaire, post-primaire, supérieur)","optionC":"5 niveaux","optionD":"1 niveau","correctAnswer":"B","explanation":"Le système comprend le primaire, le post-primaire et l'enseignement supérieur."},
        {"question":"L'enseignement primaire au Burkina Faso dure :","optionA":"5 ans","optionB":"6 ans","optionC":"7 ans","optionD":"4 ans","correctAnswer":"B","explanation":"Le primaire dure 6 ans (CP1 à CM2)."},
        {"question":"Le CEB (Certificat d'Études du Premier Degré) était :","optionA":"Un diplôme universitaire","optionB":"Un examen de fin de primaire (au Burkina : CEP)","optionC":"Un brevet","optionD":"Un bac","correctAnswer":"B","explanation":"Le CEP (Certificat d'Études Primaires) sanctionne la fin du primaire."},
        {"question":"Le BEPC équivaut au :","optionA":"CEP","optionB":"Brevet (premier cycle secondaire)","optionC":"Bac","optionD":"Licence","correctAnswer":"B","explanation":"Le BEPC = Brevet d'Études du Premier Cycle (équivalent du brevet)."},
        {"question":"Le baccalauréat sanctionne :","optionA":"La fin du primaire","optionB":"La fin du secondaire","optionC":"L'université","optionD":"Le doctorat","correctAnswer":"B","explanation":"Le baccalauréat clôt l'enseignement secondaire."},
        {"question":"La pédagogie active met l'accent sur :","optionA":"Le cours magistral","optionB":"La participation de l'apprenant","optionC":"Le silence","optionD":"La punition","correctAnswer":"B","explanation":"La pédagogie active place l'apprenant au centre (Montessori, Freinet)."},
        {"question":"Jean Piaget est connu pour :","optionA":"La théorie de l'évolution","optionB":"La théorie du développement cognitif de l'enfant","optionC":"La relativité","optionD":"La psychanalyse","correctAnswer":"B","explanation":"Piaget a théorisé les stades du développement cognitif."},
        {"question":"Lev Vygotski a théorisé :","optionA":"L'intelligence multiple","optionB":"La zone proximale de développement (ZPD)","optionC":"La pédagogie noire","optionD":"Le conditionnement","correctAnswer":"B","explanation":"Vygotski a introduit la ZPD et l'importance du social."},
        {"question":"Howard Gardner a proposé :","optionA":"La pédagogie par projet","optionB":"La théorie des intelligences multiples","optionC":"Le béhaviorisme","optionD":"Le constructivisme","correctAnswer":"B","explanation":"Gardner a décrit 8 types d'intelligences (verbale, logique, musicale...)."},
        {"question":"Le behaviorisme (Pavlov, Skinner) étudie :","optionA":"Les émotions","optionB":"Le conditionnement et les comportements observables","optionC":"Le langage","optionD":"L'inconscient","correctAnswer":"B","explanation":"Le béhaviorisme étudie les comportements via stimulus-réponse."},
        {"question":"Le constructivisme (Piaget) affirme que :","optionA":"L'enfant est une page blanche","optionB":"L'enfant construit ses connaissances par l'action","optionC":"L'enfant imite","optionD":"L'enfant est passif","correctAnswer":"B","explanation":"Constructivisme : l'apprenant construit son savoir par interaction."},
        {"question":"La taxonomie de Bloom hiérarchise :","optionA":"Les matières","optionB":"Les objectifs pédagogiques (connaître, comprendre, appliquer, analyser, évaluer, créer)","optionC":"Les notes","optionD":"Les âges","correctAnswer":"B","explanation":"La taxonomie de Bloom classe les niveaux d'objectifs cognitifs."},
        {"question":"L'évaluation formative vise à :","optionA":"Sélectionner","optionB":"Réguler les apprentissages en cours","optionC":"Classer définitivement","optionD":"Sanctionner","correctAnswer":"B","explanation":"L'évaluation formative aide l'apprenant à progresser."},
        {"question":"L'évaluation sommative vise à :","optionA":"Aider à apprendre","optionB":"Bilan final (note, diplôme)","optionC":"Suivre en continu","optionD":"Encourager","correctAnswer":"B","explanation":"L'évaluation sommative sanctionne à la fin d'un apprentissage."},
        {"question":"La didactique est :","optionA":"La discipline qui étudie l'enseignement d'une matière","optionB":"La pédagogie générale","optionC":"La psychologie","optionD":"La sociologie","correctAnswer":"A","explanation":"La didactique est spécifique à une discipline (mathématiques, français...)."},
        {"question":"La différenciation pédagogique consiste à :","optionA":"À donner le même cours à tous","optionB":"À adapter l'enseignement aux besoins des apprenants","optionC":"À exclure certains","optionD":"À supprimer les cours","correctAnswer":"B","explanation":"La différenciation adapte les contenus, démarches et supports."},
        {"question":"La classe inversée consiste à :","optionA":"À intervertir élèves et prof","optionB":"À étudier le cours à la maison et faire les exercices en classe","optionC":"À annuler le cours","optionD":"À faire cours debout","correctAnswer":"B","explanation":"Classe inversée : la théorie est vue à la maison, les activités en classe."},
        {"question":"Le travail de groupe vise :","optionA":"La compétition","optionB":"La coopération entre apprenants","optionC":"L'isolement","optionD":"La punition","correctAnswer":"B","explanation":"Le travail de groupe développe la coopération et le travail social."},
        {"question":"L'éducation inclusive vise à :","optionA":"Exclure les élèves à besoins éducatifs particuliers","optionB":"Inclure tous les élèves quelles que soient leurs caractéristiques","optionC":"Séparer les filles et garçons","optionD":"Séparer les niveaux","correctAnswer":"B","explanation":"L'éducation inclusive accueille tous les élèves (handicap, etc.)."},
        {"question":"La LOI d'orientation de l'éducation au Burkina Faso (loi 013-2007/AN) stipule que l'éducation est :","optionA":"Payante pour tous","optionB":"Obligatoire pour les enfants de 6 à 16 ans","optionC":"Optionnelle","optionD":"Interdite aux filles","correctAnswer":"B","explanation":"La loi rend l'éducation obligatoire de 6 à 16 ans."},
        {"question":"L'école publique au Burkina Faso est :","optionA":"Toujours payante","optionB":"Gratuite à l'enseignement primaire public","optionC":"Privée","optionD":"Fermée","correctAnswer":"B","explanation":"L'enseignement primaire public est gratuit au Burkina Faso."},
        {"question":"L'UNICEF œuvre pour :","optionA":"Les femmes","optionB":"Les enfants (éducation, santé, protection)","optionC":"Les militaires","optionD":"Les entrepreneurs","correctAnswer":"B","explanation":"L'UNICEF = United Nations Children's Fund."},
        {"question":"Le MENAPLN au Burkina Faso est :","optionA":"Un ministère de l'éducation","optionB":"Un parti politique","optionC":"Une ONG","optionD":"Une entreprise","correctAnswer":"A","explanation":"MENAPLN = Ministère de l'Éducation Nationale, de l'Alphabétisation et de la Promotion des Langues Nationales."},
        {"question":"L'alphabétisation désigne :","optionA":"L'apprentissage de la lecture/écriture","optionB":"Le calcul","optionC":"La natation","optionD":"Le dessin","correctAnswer":"A","explanation":"Alphabétisation = savoir lire, écrire et compter de base."},
        {"question":"La pédagogie de projet repose sur :","optionA":"Le cours magistral","optionB":"Une réalisation concrète par les apprenants","optionC":"La punition","optionD":"Le silence","correctAnswer":"B","explanation":"Pédagogie de projet : les apprenants réalisent un projet concret."},
        {"question":"La motivation intrinsèque vient :","optionA":"De récompenses externes","optionB":"De l'apprenant lui-même (intérêt, plaisir)","optionC":"De la peur","optionD":"De l'argent","correctAnswer":"B","explanation":"Motivation intrinsèque = interne (plaisir, curiosité)."},
        {"question":"La motivation extrinsèque est liée à :","optionA":"Le plaisir","optionB":"Des récompenses externes (notes, prix)","optionC":"La curiosité","optionD":"L'intérêt personnel","correctAnswer":"B","explanation":"Motivation extrinsèque = récompenses externes."},
        {"question":"Le déroulement d'une séquence pédagogique commence par :","optionA":"L'évaluation","optionB":"La situation-problème (ou réactivation)","optionC":"Le bilan","optionD":"La sortie","correctAnswer":"B","explanation":"Une séquence démarre par une situation-problème ou réactivation des prérequis."},
        {"question":"La pédagogie de Célestin Freinet repose sur :","optionA":"Le travail coopératif et les techniques naturelles (journal, imprimerie)","optionB":"Le silence absolu","optionC":"La compétition","optionD":"La mémorisation seule","correctAnswer":"A","explanation":"Freinet a développé la pédagogie coopérative (texte libre, journal)."},
    ],
})

# ============================================================
# 18. CONCOURS INFORMATIQUE - LICENCE
# (avec exemples de questions à 2 réponses)
# ============================================================
BANKS.append({
    "bankKey": "concours-informatique-licence",
    "title": "Concours Informatique - Licence",
    "description": "Concours de niveau licence en informatique : réseaux, systèmes, web, programmation.",
    "category": "Concours",
    "subcategory": "Informatique",
    "icon": "Cpu",
    "color": "violet",
    "level": "LICENCE",
    "questions": [
        {"question":"Que signifie l'acronyme RAM ?","optionA":"Read Access Memory","optionB":"Random Access Memory","optionC":"Read After Memory","optionD":"Rapid Access Memory","correctAnswer":"B","explanation":"RAM = Random Access Memory (mémoire vive)."},
        {"question":"Que signifie l'acronyme ROM ?","optionA":"Random Output Memory","optionB":"Read Only Memory","optionC":"Read Over Memory","optionD":"Real Output Memory","correctAnswer":"B","explanation":"ROM = Read Only Memory (mémoire morte, non volatile)."},
        {"question":"Le système de fichiers FAT signifie :","optionA":"File Allocation Table","optionB":"File Access Type","optionC":"Fast Allocation Table","optionD":"File Attribute Table","correctAnswer":"A","explanation":"FAT = File Allocation Table."},
        {"question":"L'adresse IP v4 est codée sur :","optionA":"16 bits","optionB":"32 bits","optionC":"64 bits","optionD":"128 bits","correctAnswer":"B","explanation":"IPv4 : 32 bits (4 octets), ex : 192.168.0.1."},
        {"question":"L'adresse IP v6 est codée sur :","optionA":"32 bits","optionB":"64 bits","optionC":"128 bits","optionD":"256 bits","correctAnswer":"C","explanation":"IPv6 : 128 bits."},
        {"question":"Le port HTTP par défaut est :","optionA":"21","optionB":"22","optionC":"80","optionD":"443","correctAnswer":"C","explanation":"HTTP utilise le port 80 ; HTTPS utilise le 443."},
        {"question":"Le port HTTPS par défaut est :","optionA":"80","optionB":"443","optionC":"22","optionD":"8080","correctAnswer":"B","explanation":"HTTPS = port 443."},
        {"question":"Le protocole SSH utilise le port :","optionA":"21","optionB":"22","optionC":"23","optionD":"25","correctAnswer":"B","explanation":"SSH = port 22."},
        {"question":"Le protocole FTP utilise le port :","optionA":"20/21","optionB":"80","optionC":"443","optionD":"53","correctAnswer":"A","explanation":"FTP utilise les ports 20 (données) et 21 (contrôle)."},
        {"question":"Le protocole DNS utilise le port :","optionA":"53","optionB":"80","optionC":"443","optionD":"25","correctAnswer":"A","explanation":"DNS = port 53."},
        {"question":"Le modèle OSI comporte combien de couches ?","optionA":"4","optionB":"5","optionC":"7","optionD":"9","correctAnswer":"C","explanation":"Le modèle OSI a 7 couches (physique, liaison, réseau, transport, session, présentation, application)."},
        {"question":"Le protocole TCP est :","optionA":"Non fiable et sans connexion","optionB":"Fiable et orienté connexion","optionC":"De diffusion","optionD":"Local uniquement","correctAnswer":"B","explanation":"TCP = orienté connexion, fiable, avec accusés de réception."},
        {"question":"Le protocole UDP est :","optionA":"Fiable et connecté","optionB":"Non fiable, sans connexion (rapide)","optionC":"Sécurisé","optionD":"Long","correctAnswer":"B","explanation":"UDP = sans connexion, non fiable, mais rapide."},
        {"question":"La commande 'ping' utilise :","optionA":"TCP","optionB":"UDP","optionC":"ICMP","optionD":"HTTP","correctAnswer":"C","explanation":"ping utilise le protocole ICMP."},
        {"question":"Un système d'exploitation est :","optionA":"Un matériel","optionB":"Un logiciel qui gère les ressources de l'ordinateur","optionC":"Une application Web","optionD":"Un protocole","correctAnswer":"B","explanation":"L'OS (Windows, Linux, macOS) gère le matériel et les logiciels."},
        {"question":"Linux est :","optionA":"Un logiciel propriétaire","optionB":"Un système d'exploitation libre (noyau)","optionC":"Un langage","optionD":"Un protocole","correctAnswer":"B","explanation":"Linux est un noyau open source créé par Linus Torvalds en 1991."},
        {"question":"La commande Linux 'ls' sert à :","optionA":"Lister les fichiers","optionB":"Supprimer","optionC":"Copier","optionD":"Éteindre","correctAnswer":"A","explanation":"ls = list directory contents."},
        {"question":"La commande Linux 'cd' sert à :","optionA":"Copier","optionB":"Changer de répertoire","optionC":"Supprimer","optionD":"Lister","correctAnswer":"B","explanation":"cd = change directory."},
        {"question":"La commande Linux 'rm' sert à :","optionA":"Renommer","optionB":"Supprimer (remove)","optionC":"Éditer","optionD":"Compiler","correctAnswer":"B","explanation":"rm = remove (supprimer)."},
        {"question":"La commande 'grep' sert à :","optionA":"À rechercher un motif dans du texte","optionB":"À copier","optionC":"À trier","optionD":"À compiler","correctAnswer":"A","explanation":"grep = global regular expression print (recherche dans du texte)."},
        {"question":"La commande 'chmod' modifie :","optionA":"Le propriétaire","optionB":"Les permissions d'un fichier","optionC":"La taille","optionD":"Le nom","correctAnswer":"B","explanation":"chmod = change mode (permissions rwx)."},
        {"question":"La commande 'chown' modifie :","optionA":"Les permissions","optionB":"Le propriétaire d'un fichier","optionC":"La date","optionD":"Le contenu","correctAnswer":"B","explanation":"chown = change owner."},
        {"question":"Git est :","optionA":"Un éditeur de texte","optionB":"Un système de gestion de versions","optionC":"Un langage","optionD":"Un serveur","correctAnswer":"B","explanation":"Git = système de contrôle de versions distribué (Linus Torvalds, 2005)."},
        {"question":"La commande 'git commit' sert à :","optionA":"À envoyer au serveur","optionB":"À enregistrer une version dans l'historique local","optionC":"À créer une branche","optionD":"À supprimer","correctAnswer":"B","explanation":"git commit enregistre les modifications dans l'historique local."},
        {"question":"La commande 'git push' sert à :","optionA":"À récupérer","optionB":"À envoyer les commits vers le dépôt distant","optionC":"À fusionner","optionD":"À annuler","correctAnswer":"B","explanation":"git push envoie au dépôt distant."},
        {"question":"La commande 'git pull' sert à :","optionA":"À envoyer","optionB":"À récupérer et fusionner depuis le dépôt distant","optionC":"À effacer","optionD":"À initialiser","correctAnswer":"B","explanation":"git pull = git fetch + git merge."},
        {"question":"Un SGBD est :","optionA":"Un langage","optionB":"Un logiciel de gestion de bases de données","optionC":"Un protocole réseau","optionD":"Un OS","correctAnswer":"B","explanation":"SGBD = Système de Gestion de Bases de Données (ex : MySQL, PostgreSQL)."},
        {"question":"Le modèle relationnel a été proposé par :","optionA":"Bill Gates","optionB":"Edgar F. Codd (1970)","optionC":"Linus Torvalds","optionD":"Steve Jobs","correctAnswer":"B","explanation":"Edgar F. Codd a proposé le modèle relationnel en 1970."},
        {"question":"La programmation orientée objet repose sur :","optionA":"Les fonctions seules","optionB":"Les classes, objets, encapsulation, héritage, polymorphisme","optionC":"Le séquentiel","optionD":"Aucune structure","correctAnswer":"B","explanation":"La POO repose sur encapsulation, héritage, polymorphisme."},
        {"question":"Le langage C a été créé par :","optionA":"Bill Gates","optionB":"Dennis Ritchie (1972)","optionC":"Bjarne Stroustrup","optionD":"James Gosling","correctAnswer":"B","explanation":"Dennis Ritchie a créé le C aux Bell Labs en 1972."},
        {"question":"Java a été créé par :","optionA":"Microsoft","optionB":"Sun Microsystems (James Gosling, 1995)","optionC":"Apple","optionD":"Google","correctAnswer":"B","explanation":"Java a été créé par James Gosling chez Sun Microsystems en 1995."},
        {"question":"Le langage JavaScript a été créé par :","optionA":"Brendan Eich (1995)","optionB":"Guido van Rossum","optionC":"Linus Torvalds","optionD":"Bjarne Stroustrup","correctAnswer":"A","explanation":"Brendan Eich a créé JavaScript en 1995 (Netscape)."},
        {"question":"Python a été créé par :","optionA":"Guido van Rossum (1991)","optionB":"Dennis Ritchie","optionC":"James Gosling","optionD":"Larry Wall","correctAnswer":"A","explanation":"Guido van Rossum a créé Python en 1991."},
        {"question":"L'architecture MVC signifie :","optionA":"Modèle-Vue-Contrôleur","optionB":"Multi-Vue-Calcul","optionC":"Module-Variable-Classe","optionD":"Mémoire-Vitesse-Cache","correctAnswer":"A","explanation":"MVC = Modèle-Vue-Contrôleur (patron d'architecture)."},
    ],
})

print(f"Préparation de {len(BANKS)} banques...")
for bank in BANKS:
    path = os.path.join(OUTPUT_DIR, f"{bank['bankKey']}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(bank, f, ensure_ascii=False, indent=2)
    print(f"  ✓ {bank['bankKey']}: {len(bank['questions'])} questions")

total = sum(len(b['questions']) for b in BANKS)
print(f"\nTotal nouvelles questions: {total}")
