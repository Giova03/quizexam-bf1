"""
Génère les banques de concours par filière au Burkina Faso.
"""
import json, os

OUTPUT_DIR = "/home/z/my-project/scripts/generated/banks"
os.makedirs(OUTPUT_DIR, exist_ok=True)

BANKS = []

# ============================================================
# 11. CONCOURS SANTÉ, ACTION SOCIALE & GENRE
# ============================================================
BANKS.append({
    "bankKey": "concours-sante-social",
    "title": "Concours Santé, Action Sociale & Genre",
    "description": "Santé publique, action sociale, genre, éthique médicale, droits humains.",
    "category": "Concours",
    "subcategory": "Santé & Social",
    "icon": "HeartPulse",
    "color": "rose",
    "level": "LICENCE",
    "questions": [
        {"question":"L'OMS (Organisation Mondiale de la Santé) a son siège à :","optionA":"New York","optionB":"Genève","optionC":"Paris","optionD":"Bruxelles","correctAnswer":"B","explanation":"L'OMS a son siège à Genève, en Suisse."},
        {"question":"La Journée mondiale de la santé est célébrée le :","optionA":"7 avril","optionB":"1er mai","optionC":"24 octobre","optionD":"1er décembre","correctAnswer":"A","explanation":"La Journée mondiale de la santé est le 7 avril (anniversaire de la création de l'OMS en 1948)."},
        {"question":"La Journée internationale de la femme est le :","optionA":"8 mars","optionB":"25 novembre","optionC":"1er juin","optionD":"11 octobre","correctAnswer":"A","explanation":"La Journée internationale des droits des femmes est le 8 mars."},
        {"question":"Le VIH/SIDA se transmet par :","optionA":"Les moustiques","optionB":"Le sang, les rapports sexuels, de mère à enfant","optionC":"La salive","optionD":"Le contact cutané","correctAnswer":"B","explanation":"Le VIH se transmet par le sang, les rapports sexuels non protégés et de la mère à l'enfant."},
        {"question":"La Journée mondiale de lutte contre le sida est le :","optionA":"1er décembre","optionB":"1er octobre","optionC":"25 novembre","optionD":"7 avril","correctAnswer":"A","explanation":"La Journée mondiale de lutte contre le sida est le 1er décembre."},
        {"question":"Le paludisme est transmis par :","optionA":"La mouche tsé-tsé","optionB":"Le moustique anophèle femelle","optionC":"Le tique","optionD":"La puce","correctAnswer":"B","explanation":"Le paludisme est transmis par la femelle du moustique anophèle."},
        {"question":"Le principe de confidentialité médicale signifie :","optionA":"Le patient n'a pas droit à son dossier","optionB":"Le médecin ne doit pas divulguer les informations du patient","optionC":"Le patient paie en secret","optionD":"Le médecin décide seul","correctAnswer":"B","explanation":"Le secret médical protège la vie privée du patient."},
        {"question":"Le consentement éclairé du patient signifie :","optionA":"Le patient obéit sans discuter","optionB":"Le patient accepte en connaissance de cause après information","optionC":"Le patient signe sans lire","optionD":"La famille décide seule","correctAnswer":"B","explanation":"Le consentement éclairé repose sur une information claire donnée au patient."},
        {"question":"Le CPF (Centre de Perquisition et de Formation) en santé est :","optionA":"Un hôpital","optionB":"Un centre de santé publique","optionC":"Une école","optionD":"Un ministère","correctAnswer":"B","explanation":"Les centres de santé publics assurent les soins de première ligne au Burkina Faso."},
        {"question":"L'allaitement maternel exclusif est recommandé pendant les :","optionA":"3 premiers mois","optionB":"6 premiers mois","optionC":"12 premiers mois","optionD":"2 premières années","correctAnswer":"B","explanation":"L'OMS recommande l'allaitement exclusif jusqu'à 6 mois."},
        {"question":"Le taux de mortalité infantile mesure :","optionA":"La mortalité des adultes","optionB":"La mortalité des enfants de moins de 1 an pour 1000 naissances","optionC":"La mortalité maternelle","optionD":"La natalité","correctAnswer":"B","explanation":"Le taux de mortalité infantile = décès avant 1 an pour 1000 naissances vivantes."},
        {"question":"L'espérance de vie à la naissance est :","optionA":"Le nombre de médecins","optionB":"Le nombre moyen d'années qu'un nouveau-né peut espérer vivre","optionC":"Le PIB","optionD":"Le taux de natalité","correctAnswer":"B","explanation":"L'espérance de vie mesure la durée moyenne de vie."},
        {"question":"La vaccination vise à :","optionA":"Guérir une maladie","optionB":"Prévenir une maladie en stimulant l'immunité","optionC":"Réparer un os","optionD":"Soulager la douleur","correctAnswer":"B","explanation":"La vaccination est une mesure préventive qui stimule le système immunitaire."},
        {"question":"Le PEV (Programme Élargi de Vaccination) au Burkina Faso cible principalement :","optionA":"Les personnes âgées","optionB":"Les enfants de 0 à 11 mois","optionC":"Les touristes","optionD":"Les enseignants","correctAnswer":"B","explanation":"Le PEV cible les enfants de 0 à 11 mois (BCG, DTCoq, Rougeole, etc.)."},
        {"question":"L'équité genre signifie :","optionA":"L'égalité totale des sexes","optionB":"Un traitement juste selon les besoins de chacun","optionC":"La supériorité d'un sexe","optionD":"La séparation des sexes","correctAnswer":"B","explanation":"L'équité = justice dans le traitement selon les besoins, pour atteindre l'égalité."},
        {"question":"Les violences basées sur le genre (VBG) incluent :","optionA":"Les compliments","optionB":"Les violences physiques, sexuelles, psychologiques, économiques","optionC":"Le salut","optionD":"Le commerce","correctAnswer":"B","explanation":"Les VBG regroupent les violences physiques, sexuelles, psychologiques et économiques."},
        {"question":"La Journée internationale pour l'élimination de la violence à l'égard des femmes est le :","optionA":"8 mars","optionB":"25 novembre","optionC":"1er décembre","optionD":"10 décembre","correctAnswer":"B","explanation":"Le 25 novembre inaugure les 16 jours d'activisme contre les VBG."},
        {"question":"L'approche 'genre et développement' vise à :","optionA":"Ignorer les femmes","optionB":"Intégrer les besoins et rôles des hommes et des femmes dans le développement","optionC":"Séparer les sexes","optionD":"Promouvoir un seul sexe","correctAnswer":"B","explanation":"L'approche genre intègre les besoins différenciés des femmes et des hommes."},
        {"question":"Le planning familial permet :","optionA":"De limiter la démographie","optionB":"Aux couples de choisir le nombre d'enfants et l'espacement des naissances","optionC":"De stériliser","optionD":"D'interdire les naissances","correctAnswer":"B","explanation":"Le planning familial = choix éclairé sur la procréation."},
        {"question":"L'IEC (Information-Éducation-Communication) en santé vise à :","optionA":"Soigner","optionB":"Changer les comportements par l'information","optionC":"Opérer","optionD":"Prescrire","correctAnswer":"B","explanation":"L'IEC vise à promouvoir des comportements sains par la communication."},
        {"question":"Un génocide est :","optionA":"Un meurtre isolé","optionB":"L'extermination planifiée d'un groupe national, ethnique, racial ou religieux","optionC":"Un accident","optionD":"Une guerre","correctAnswer":"B","explanation":"Le génocide = destruction planifiée d'un groupe (Convention ONU 1948)."},
        {"question":"La torture est interdite par :","optionA":"La Déclaration universelle des droits de l'homme (art. 5)","optionB":"Le code civil","optionC":"Le code pénal seul","optionD":"Aucun texte","correctAnswer":"A","explanation":"L'article 5 de la DUDH interdit la torture, ainsi que la Convention ONU de 1984."},
        {"question":"Le droit à la santé est reconnu par :","optionA":"Le code de la route","optionB":"La Déclaration universelle des droits de l'homme (art. 25)","optionC":"Le code minier","optionD":"Aucun texte","correctAnswer":"B","explanation":"L'article 25 de la DUDH reconnaît le droit à un niveau de vie suffisant incluant la santé."},
        {"question":"Les OMD (Objectifs du Millénaire pour le Développement) comprenaient :","optionA":"3 objectifs","optionB":"8 objectifs","optionC":"17 objectifs","optionD":"50 objectifs","correctAnswer":"B","explanation":"Les OMD (2000-2015) comptaient 8 objectifs."},
        {"question":"Les ODD (Objectifs de Développement Durable) sont au nombre de :","optionA":"8","optionB":"12","optionC":"17","optionD":"25","correctAnswer":"C","explanation":"Les ODD (2015-2030) sont au nombre de 17."},
        {"question":"L'ODD 3 concerne :","optionA":"L'éducation","optionB":"La santé et le bien-être","optionC":"Le climat","optionD":"L'eau","correctAnswer":"B","explanation":"L'ODD 3 : « Bonne santé et bien-être »."},
        {"question":"L'ODD 5 concerne :","optionA":"L'égalité des sexes","optionB":"La croissance économique","optionC":"L'industrie","optionD":"Les villes","correctAnswer":"A","explanation":"L'ODD 5 : « Égalité entre les sexes »."},
        {"question":"La malnutrition aiguë sévère se traite avec :","optionA":"Des antibiotiques seuls","optionB":"Les aliments thérapeutiques prêts à l'emploi (ATPE/Plumpy'Nut)","optionC":"De l'eau","optionD":"Du repos","correctAnswer":"B","explanation":"Les ATPE (Plumpy'Nut) sont utilisés pour traiter la malnutrition aiguë sévère."},
        {"question":"Le dépistage précoce du cancer du sein se fait par :","optionA":"La radiographie","optionB":"La mammographie et l'auto-examen","optionC":"La prise de sang seule","optionD":"L'IRM systématique","correctAnswer":"B","explanation":"La mammographie + auto-examen sont recommandés pour le dépistage."},
    ],
})

# ============================================================
# 12. CONCOURS ADMINISTRATION GÉNÉRALE & JUSTICE
# ============================================================
BANKS.append({
    "bankKey": "concours-admin-justice",
    "title": "Concours Administration Générale & Justice",
    "description": "Droit constitutionnel, droit administratif, organisation administrative, justice.",
    "category": "Concours",
    "subcategory": "Administration & Justice",
    "icon": "Scale",
    "color": "emerald",
    "level": "LICENCE",
    "questions": [
        {"question":"La Constitution du Burkina Faso du 2 juin 1991 a été :","optionA":"Adoptée par référendum","optionB":"Promulguée par décret","optionC":"Imposée par l'armée","optionD":"Héritée de la colonisation","correctAnswer":"A","explanation":"La Constitution du 2 juin 1991 a été adoptée par référendum."},
        {"question":"Le Président du Faso est élu pour un mandat de :","optionA":"4 ans","optionB":"5 ans","optionC":"6 ans","optionD":"7 ans","correctAnswer":"B","explanation":"Sous la IVe République, le mandat présidentiel est de 5 ans renouvelable."},
        {"question":"Les trois pouvoirs dans un État de droit sont :","optionA":"Exécutif, législatif, judiciaire","optionB":"Militaire, civil, religieux","optionC":"Président, Premier ministre, Parlement","optionD":"Police, justice, armée","correctAnswer":"A","explanation":"La séparation des pouvoirs : exécutif, législatif, judiciaire (Montesquieu)."},
        {"question":"Le Conseil Constitutionnel au Burkina Faso :","optionA":"Vote les lois","optionB":"Contrôle la constitutionnalité des lois","optionC":"Gère le budget","optionD":"Nomme les ministres","correctAnswer":"B","explanation":"Le Conseil constitutionnel contrôle la conformité des lois à la Constitution."},
        {"question":"L'Assemblée Nationale (ou ALT en période de transition) :","optionA":"Exécute les lois","optionB":"Vote les lois et contrôle le gouvernement","optionC":"Juge les citoyens","optionD":"Nomme le président","correctAnswer":"B","explanation":"Le pouvoir législatif vote les lois et contrôle l'action du gouvernement."},
        {"question":"La Cour des Comptes :","optionA":"Vote le budget","optionB":"Juge les comptes publics","optionC":"Nomme les préfets","optionD":"Légifère","correctAnswer":"B","explanation":"La Cour des comptes examine et certifie les comptes publics."},
        {"question":"La décentralisation au Burkina Faso repose sur :","optionA":"1 niveau","optionB":"2 niveaux (région et commune)","optionC":"3 niveaux (région, province, commune)","optionD":"5 niveaux","correctAnswer":"C","explanation":"La décentralisation repose sur la région, la province et la commune."},
        {"question":"Le Code Général des Collectivités Territoriales au Burkina Faso date de :","optionA":"1991","optionB":"1998","optionC":"2005","optionD":"2010","correctAnswer":"B","explanation":"Le CGCT a été adopté en 1998."},
        {"question":"Le nombre de régions administratives au Burkina Faso est de :","optionA":"13","optionB":"17","optionC":"45","optionD":"55","correctAnswer":"A","explanation":"Le Burkina Faso compte 13 régions administratives (depuis 2001)."},
        {"question":"Le nombre de provinces au Burkina Faso est de :","optionA":"13","optionB":"45","optionC":"55","optionD":"350","correctAnswer":"B","explanation":"Le Burkina Faso compte 45 provinces."},
        {"question":"Le nombre de communes au Burkina Faso est de :","optionA":"45","optionB":"100","optionC":"350","optionD":"351","correctAnswer":"D","explanation":"Le Burkina Faso compte 351 communes (rurales et urbaines)."},
        {"question":"Le préfet est :","optionA":"Un élu","optionB":"Le représentant de l'État dans le département","optionC":"Le maire","optionD":"Un juge","correctAnswer":"B","explanation":"Le préfet représente l'État dans le département (non élu)."},
        {"question":"Le haut-commissaire est :","optionA":"Un élu communal","optionB":"Le représentant de l'État dans la région","optionC":"Le président du Faso","optionD":"Un magistrat","correctAnswer":"B","explanation":"Le haut-commissaire représente le gouvernement dans la région."},
        {"question":"Le maire est :","optionA":"Nommé par le préfet","optionB":"Élu par le conseil municipal","optionC":"Le haut-commissaire","optionD":"Un fonctionnaire","correctAnswer":"B","explanation":"Le maire est élu par les conseillers municipaux."},
        {"question":"Le principe de légalité signifie que :","optionA":"L'administration fait ce qu'elle veut","optionB":"L'administration agit conformément au droit","optionC":"Tout est légal","optionD":"Les citoyens sont toujours coupables","correctAnswer":"B","explanation":"L'administration doit respecter la loi (principe de légalité)."},
        {"question":"L'acte administratif unilatéral :","optionA":"Est un contrat","optionB":"Impose une décision de l'autorité (arrêté, décret)","optionC":"Est un vote","optionD":"Est un jugement","correctAnswer":"B","explanation":"L'acte unilatéral est une décision imposée (décret, arrêté)."},
        {"question":"Le recours pour excès de pouvoir permet :","optionA":"De demander des dommages","optionB":"D'annuler un acte administratif illégal","optionC":"D'emprisonner un fonctionnaire","optionD":"De voter","correctAnswer":"B","explanation":"Le REP vise l'annulation d'un acte administratif illégal."},
        {"question":"La justice administrative est rendue au Burkina Faso par :","optionA":"Le tribunal de grande instance","optionB":"Le tribunal administratif et la Cour d'État","optionC":"La Cour de cassation","optionD":"Le Conseil constitutionnel","correctAnswer":"B","explanation":"Le tribunal administratif (1er degré) et la Cour d'État (appel)."},
        {"question":"L'ENAM forme :","optionA":"Des médecins","optionB":"Des magistrats, greffiers et administrateurs civils","optionC":"Des ingénieurs","optionD":"Des enseignants","correctAnswer":"B","explanation":"L'ENAM (École Nationale d'Administration et de Magistrature) forme magistrats et administrateurs."},
        {"question":"La fonction publique comprend :","optionA":"Seulement les militaires","optionB":"Les agents de l'État (civils et militaires)","optionC":"Les élus","optionD":"Les entrepreneurs","correctAnswer":"B","explanation":"La fonction publique regroupe les agents de l'État."},
        {"question":"Le statut de la fonction publique définit :","optionA":"Le salaire minimum","optionB":"Les droits et obligations des fonctionnaires","optionC":"Le code pénal","optionD":"Les impôts","correctAnswer":"B","explanation":"Le statut régit les droits et devoirs des fonctionnaires."},
        {"question":"Le détournement de fonds publics est :","optionA":"Un crime de droit commun","optionB":"Une infraction pénale (délit) punie par le code pénal","optionC":"Légal","optionD":"Un simple avertissement","correctAnswer":"B","explanation":"Le détournement de fonds publics est un délit pénal."},
        {"question":"La présomption d'innocence signifie :","optionA":"L'accusé est coupable","optionB":"Toute personne est présumée innocente jusqu'à condamnation définitive","optionC":"Le juge décide avant le procès","optionD":"Le témoin est coupable","correctAnswer":"B","explanation":"Présomption d'innocence : principe fondamental du droit pénal."},
        {"question":"Le droit international humanitaire est principalement contenu dans :","optionA":"Les Conventions de Genève de 1949","optionB":"Le code civil","optionC":"La Charte de l'ONU seule","optionD":"Le code pénal","correctAnswer":"A","explanation":"Les 4 Conventions de Genève (1949) et leurs protocoles additionnels."},
        {"question":"La Cour Pénale Internationale (CPI) juge :","optionA":"Les vols","optionB":"Les crimes les plus graves (génocide, crimes contre l'humanité, crimes de guerre, agression)","optionC":"Les contrats","optionD":"Les divorces","correctAnswer":"B","explanation":"La CPI juge les crimes les plus graves relevant du droit international."},
        {"question":"Le siège de la Cour Pénale Internationale est à :","optionA":"New York","optionB":"La Haye","optionC":"Genève","optionD":"Bruxelles","correctAnswer":"B","explanation":"La CPI a son siège à La Haye (Pays-Bas)."},
        {"question":"La Déclaration Universelle des Droits de l'Homme a été adoptée en :","optionA":"1789","optionB":"1919","optionC":"1948","optionD":"1989","correctAnswer":"C","explanation":"La DUDH a été adoptée le 10 décembre 1948 par l'ONU."},
        {"question":"La Journée internationale des droits de l'homme est le :","optionA":"10 décembre","optionB":"8 mars","optionC":"1er mai","optionD":"25 novembre","correctAnswer":"A","explanation":"Le 10 décembre commémore l'adoption de la DUDH (1948)."},
        {"question":"L'habeas corpus protège :","optionA":"Le droit de propriété","optionB":"Le droit de ne pas être détenu arbitrairement","optionC":"Le droit de vote","optionD":"Le droit au travail","correctAnswer":"B","explanation":"L'habeas corpus garantit la liberté individuelle contre la détention arbitraire."},
        {"question":"Le droit à un procès équitable inclut :","optionA":"Le secret","optionB":"Le contradictoire, un juge impartial, la publicité","optionC":"La condamnation sans défense","optionD":"La détention sans procès","correctAnswer":"B","explanation":"Le procès équitable : débat contradictoire, juge impartial, publicité."},
    ],
})

# ============================================================
# 13. CONCOURS DÉVELOPPEMENT RURAL
# ============================================================
BANKS.append({
    "bankKey": "concours-developpement-rural",
    "title": "Concours Développement Rural & Agronomie",
    "description": "Agriculture, élevage, environnement, gestion des ressources naturelles.",
    "category": "Concours",
    "subcategory": "Développement Rural",
    "icon": "Wheat",
    "color": "amber",
    "level": "LICENCE",
    "questions": [
        {"question":"La principale culture céréalière au Burkina Faso est :","optionA":"Le riz","optionB":"Le sorgho","optionC":"Le maïs","optionD":"Le mil","correctAnswer":"B","explanation":"Le sorgho est la première céréale cultivée au Burkina Faso."},
        {"question":"L'agriculture de subsistance vise :","optionA":"L'exportation","optionB":"L'autoconsommation","optionC":"Le commerce international","optionD":"L'industrie","correctAnswer":"B","explanation":"L'agriculture de subsistance nourrit essentiellement le producteur et sa famille."},
        {"question":"La jachère est :","optionA":"Une culture annuelle","optionB":"Une période de repos du sol","optionC":"Un engrais","optionD":"Un outil","correctAnswer":"B","explanation":"La jachère laisse le sol au repos pour restaurer sa fertilité."},
        {"question":"La rotation des cultures permet :","optionA":"D'épuiser le sol","optionB":"De préserver la fertilité du sol","optionC":"De réduire le rendement","optionD":"D'augmenter les maladies","correctAnswer":"B","explanation":"La rotation des cultures diversifie les prélèvements et limite les maladies."},
        {"question":"L'irrigation goutte-à-goutte est :","optionA":"Très gaspilleuse","optionB":"Économe en eau","optionC":"Inutile","optionD":"Toxique","correctAnswer":"B","explanation":"Le goutte-à-goutte économise l'eau en l'amenant directement aux racines."},
        {"question":"Le compost est :","optionA":"Un pesticide","optionB":"Un engrais organique issu de la décomposition","optionC":"Un herbicide","optionD":"Un fongicide","correctAnswer":"B","explanation":"Le compost est un amendement organique naturel issu de déchets végétaux."},
        {"question":"L'élevage bovin au Burkina Faso est concentré principalement :","optionA":"Dans le Sud-Ouest","optionB":"Dans le Sahel et le Nord","optionC":"À Ouagadougou","optionD":"Dans la boucle du Mouhoun uniquement","correctAnswer":"B","explanation":"L'élevage bovin est dominant dans les régions sahéliennes et nord."},
        {"question":"La trypanosomiase animale est transmise par :","optionA":"Le moustique","optionB":"La mouche tsé-tsé","optionC":"La tique","optionD":"La puce","correctAnswer":"B","explanation":"La mouche tsé-tsé transmet la trypanosomiase chez les animaux (et l'homme)."},
        {"question":"La période de gestation d'une vache est d'environ :","optionA":"3 mois","optionB":"6 mois","optionC":"9 mois","optionD":"12 mois","correctAnswer":"C","explanation":"La gestation de la vache dure environ 9 mois (280 jours)."},
        {"question":"La culture du coton au Burkina Faso est principalement dans :","optionA":"Le Sahel","optionB":"L'Ouest et le Centre-Ouest","optionC":"L'Est","optionD":"Le Centre-Est","correctAnswer":"B","explanation":"Le coton est cultivé principalement dans l'Ouest (Hauts-Bassins, Cascades)."},
        {"question":"Le réservoir de Samandéni est situé dans :","optionA":"La région du Centre","optionB":"La région des Hauts-Bassins","optionC":"La région du Sahel","optionD":"La région de l'Est","correctAnswer":"B","explanation":"Le barrage de Samandéni est dans les Hauts-Bassins."},
        {"question":"La déforestation contribue à :","optionA":"La baisse du CO₂","optionB":"L'augmentation du CO₂ et à la désertification","optionC":"Au refroidissement","optionD":"À la pluie","correctAnswer":"B","explanation":"La déforestation libère du CO₂ et favorise la désertification."},
        {"question":"L'agroforesterie consiste à :","optionA":"Couper tous les arbres","optionB":"Associer arbres et cultures","optionC":"Brûler la forêt","optionD":"Planter uniquement des eucalyptus","correctAnswer":"B","explanation":"L'agroforesterie associe arbres, cultures et/ou élevage sur une même parcelle."},
        {"question":"Le concept de développement durable repose sur :","optionA":"1 pilier","optionB":"2 piliers","optionC":"3 piliers (économique, social, environnemental)","optionD":"4 piliers","correctAnswer":"C","explanation":"3 piliers : économie, social, environnement (rapport Brundtland, 1987)."},
        {"question":"Le 'zaï' est une technique traditionnelle de :","optionA":"Pêche","optionB":"Restauration des sols dégradés en zone sahélienne","optionC":"Chasse","optionD":"Couture","correctAnswer":"B","explanation":"Le zaï consiste à creuser des trous, y mettre du compost et des graines."},
        {"question":"Les diguettes (cordons pierreux) servent à :","optionA":"Délimiter les propriétés","optionB":"Ralentir le ruissellement et favoriser l'infiltration","optionC":"Empêcher les vols","optionD":"Décorer","correctAnswer":"B","explanation":"Les diguettes anti-érosives ralentissent l'eau et favorisent l'infiltration."},
        {"question":"La culture attelée utilise :","optionA":"Des tracteurs","optionB":"Des animaux de trait (bœufs, ânes)","optionC":"Des machines","optionD":"Rien","correctAnswer":"B","explanation":"La culture attelée utilise la traction animale."},
        {"question":"Le semis direct est une technique :","optionA":"De labour profond","optionB":"Sans labour, sur couverture végétale","optionC":"De brûlis","optionD":"De drainage","correctAnswer":"B","explanation":"Le semis direct sur couverture végétale permanente (SCV) évite le labour."},
        {"question":"La riziculture irriguée au Burkina Faso est développée dans :","optionA":"Le Sahel","optionB":"La Vallée du Sourou et Bagré","optionC":"Ouagadougou","optionD":"Aucune région","correctAnswer":"B","explanation":"Les périmètres irrigués de la Vallée du Sourou et de Bagré produisent du riz."},
        {"question":"Le changement climatique affecte l'agriculture par :","optionA":"Plus de pluies","optionB":"Sécheresses, inondations, dérèglement des saisons","optionC":"Aucun effet","optionD":"Baisse du CO₂","correctAnswer":"B","explanation":"Le changement climatique perturbe les cycles de pluie et les rendements."},
        {"question":"La biodiversité agricole désigne :","optionA":"Une seule variété","optionB":"La diversité des espèces et variétés cultivées","optionC":"Les engrais","optionD":"Les pesticides","correctAnswer":"B","explanation":"La biodiversité agricole = variétés cultivées, races élevées, etc."},
        {"question":"Un OGM est :","optionA":"Un organisme génétiquement modifié","optionB":"Un engrais","optionC":"Un pesticide","optionD":"Une maladie","correctAnswer":"A","explanation":"OGM = Organisme Génétiquement Modifié par transgénèse."},
        {"question":"L'agriculture biologique exclut :","optionA":"Le compost","optionB":"Les pesticides de synthèse et OGM","optionC":"La rotation","optionD":"L'irrigation","correctAnswer":"B","explanation":"L'agriculture biologique proscrit pesticides de synthèse et OGM."},
        {"question":"La pêche continentale au Burkina Faso se pratique dans :","optionA":"La mer","optionB":"Les barrages et fleuves","optionC":"Les déserts","optionD":"Aucun lieu","correctAnswer":"B","explanation":"Le Burkina Faso n'a pas de mer ; la pêche est continentale (barrages, fleuves)."},
        {"question":"Le tilapia est :","optionA":"Une plante","optionB":"Un poisson d'eau douce","optionC":"Un bovin","optionD":"Un insecte","correctAnswer":"B","explanation":"Le tilapia est un poisson très répandu en élevage au Burkina Faso."},
        {"question":"L'apiculture produit :","optionA":"Du lait","optionB":"Du miel et de la cire","optionC":"Des œufs","optionD":"Du cuir","correctAnswer":"B","explanation":"L'apiculture produit du miel, de la cire et d'autres produits de la ruche."},
        {"question":"Le maraîchage désigne :","optionA":"La culture des céréales","optionB":"La culture de légumes et fruits sur petites surfaces","optionC":"L'élevage","optionD":"La pêche","correctAnswer":"B","explanation":"Le maraîchage produit des légumes (tomates, oignons, choux...)."},
        {"question":"La SODEBUR (Burkina Faso) s'occupe de :","optionA":"Du coton","optionB":"Du développement rural","optionC":"Des mines","optionD":"Du BTP","correctAnswer":"B","explanation":"SODEBUR = Société de Développement du Burkina (rural)."},
        {"question":"Le ministère en charge de l'agriculture au Burkina Faso est :","optionA":"MICA","optionB":"MRAH","optionC":"MEF","optionD":"MESSRS","correctAnswer":"B","explanation":"MRAH = Ministère de l'Agriculture, des Ressources Halieutiques..."},
    ],
})

# ============================================================
# 14. CONCOURS BTP & SÉCURITÉ
# ============================================================
BANKS.append({
    "bankKey": "concours-btp-securite",
    "title": "Concours BTP & Sécurité",
    "description": "Bâtiment, génie civil, travaux publics, sécurité, prévention des risques.",
    "category": "Concours",
    "subcategory": "BTP & Sécurité",
    "icon": "HardHat",
    "color": "sky",
    "level": "LICENCE",
    "questions": [
        {"question":"Que signifie l'acronyme BTP ?","optionA":"Bureau des Travaux Publics","optionB":"Bâtiment et Travaux Publics","optionC":"Banque du Territoire Public","optionD":"Bureau Technique Privé","correctAnswer":"B","explanation":"BTP = Bâtiment et Travaux Publics."},
        {"question":"Le symbole chimique du béton armé abrégé est :","optionA":"BA","optionB":"BC","optionC":"BO","optionD":"BT","correctAnswer":"A","explanation":"BA = Béton Armé."},
        {"question":"La résistance caractéristique du béton est exprimée en :","optionA":"MPa","optionB":"kg","optionC":"m³","optionD":"kWh","correctAnswer":"A","explanation":"La résistance du béton est en MPa (ex : C25/30)."},
        {"question":"Le symbole de l'acier d'armature est souvent :","optionA":"Fe","optionB":"Ac","optionC":"Ba","optionD":"St","correctAnswer":"A","explanation":"Fe (fer) désigne l'acier d'armature (ex : FeE500)."},
        {"question":"Le module de Young caractérise :","optionA":"La couleur","optionB":"L'élasticité d'un matériau","optionC":"La masse","optionD":"La température","correctAnswer":"B","explanation":"Le module de Young E mesure la rigidité élastique."},
        {"question":"La limite d'élasticité de l'acier est notée :","optionA":"Re","optionB":"Rm","optionC":"A%","optionD":"E","correctAnswer":"A","explanation":"Re = limite d'élasticité ; Rm = résistance à la traction."},
        {"question":"Un EPI est :","optionA":"Un équipement de protection individuelle","optionB":"Une entreprise publique","optionC":"Un type de ciment","optionD":"Un outil de mesure","correctAnswer":"A","explanation":"EPI = Équipement de Protection Individuelle (casque, gants, chaussures)."},
        {"question":"Le port du casque sur un chantier est :","optionA":"Optionnel","optionB":"Obligatoire","optionC":"Interdit","optionD":"Seulement pour les visiteurs","correctAnswer":"B","explanation":"Le port du casque est obligatoire sur les chantiers."},
        {"question":"La signalisation de sécurité triangulaire indique :","optionA":"Une interdiction","optionB":"Un danger","optionC":"Une obligation","optionD":"Une information","correctAnswer":"B","explanation":"Triangle = danger ; cercle rouge = interdiction ; cercle bleu = obligation."},
        {"question":"Un permis de feu est nécessaire pour :","optionA":"Sortir du chantier","optionB":"Les travaux par point chaud (soudure, meulage)","optionC":"Boire de l'eau","optionD":"Se garer","correctAnswer":"B","explanation":"Le permis de feu encadre les travaux générant des étincelles/heat."},
        {"question":"Le haubanage sert à :","optionA":"Décorer","optionB":"Stabiliser une structure (grue, échafaudage, mât)","optionC":"Mesurer","optionD":"Peindre","correctAnswer":"B","explanation":"Le haubanage stabilise par câbles tendus."},
        {"question":"La bêche est un outil de :","optionA":"Mesure","optionB":"Terrassement manuel","optionC":"Soudure","optionD":"Peinture","correctAnswer":"B","explanation":"La bêche sert à creuser la terre."},
        {"question":"La pelle mécanique est un engin de :","optionA":"Levage","optionB":"Terrassement","optionC":"Transport de personnes","optionD":"Soudure","correctAnswer":"B","explanation":"La pelle mécanique effectue les travaux de terrassement (creuser)."},
        {"question":"Le théodolite sert à :","optionA":"Mesurer des angles et des distances","optionB":"Souder","optionC":"Peindre","optionD":"Transporter","correctAnswer":"A","explanation":"Le théodolite mesure les angles horizontaux et verticaux en topographie."},
        {"question":"Le niveau de chantier permet de :","optionA":"Mesurer des différences d'altitude","optionB":"Souder","optionC":"Tirer","optionD":"Peindre","correctAnswer":"A","explanation":"Le niveau optique/laser mesure les altitudes pour les nivellements."},
        {"question":"Le béton est composé de :","optionA":"Ciment + eau + sable + gravier","optionB":"Acier + eau","optionC":"Bois + ciment","optionD":"Plastique + sable","correctAnswer":"A","explanation":"Le béton = ciment, eau, sable (granulat fin) et gravier (granulat grossier)."},
        {"question":"Le temps de prise du béton ordinaire est d'environ :","optionA":"30 minutes","optionB":"quelques heures (début de prise ~ 1h, fin ~ 24h)","optionC":"1 mois","optionD":"1 an","correctAnswer":"B","explanation":"Début de prise ~1h, fin de prise ~ 24h ; durcissement sur 28 jours."},
        {"question":"La cure du béton consiste à :","optionA":"À le refroidir","optionB":"À maintenir une humidité favorable pendant le durcissement","optionC":"À le peindre","optionD":"À le transporter","correctAnswer":"B","explanation":"La cure maintient l'hydratation du béton pour une bonne résistance."},
        {"question":"L'escalier classique a un giron (largeur de marche) typique d'environ :","optionA":"10 cm","optionB":"25-30 cm","optionC":"60 cm","optionD":"100 cm","correctAnswer":"B","explanation":"Giron typique d'un escalier : 25-30 cm."},
        {"question":"La hauteur de marche d'un escalier est typiquement :","optionA":"5 cm","optionB":"15-18 cm","optionC":"50 cm","optionD":"1 m","correctAnswer":"B","explanation":"La hauteur idéale d'une marche : 16-17 cm (loi de Blondel)."},
        {"question":"La loi de Blondel relie :","optionA":"La masse et le poids","optionB":"Hauteur de marche et giron : 2h + g ≈ 60-64 cm","optionC":"Le prix et la surface","optionD":"La vitesse et l'accélération","correctAnswer":"B","explanation":"Loi de Blondel : 2h + g = 60 à 64 cm pour un escalier confortable."},
        {"question":"La fondation superficielle est :","optionA":"Un radier","optionB":"Une semelle","optionC":"Un pieu","optionD":"Un puits","correctAnswer":"B","explanation":"La semelle est une fondation superficielle (radier aussi, mais plus étendu)."},
        {"question":"La fondation profonde est :","optionA":"La semelle","optionB":"Le pieu","optionC":"Le dallage","optionD":"La chape","correctAnswer":"B","explanation":"Le pieu est une fondation profonde qui reporte la charge sur un sol dur."},
        {"question":"Le flambement est un phénomène de :","optionA":"Compression sur une poutre longue","optionB":"Torsion","optionC":"Cisaillement pur","optionD":"Traction pure","correctAnswer":"A","explanation":"Le flambement est l'instabilité d'une pièce élancée sous compression."},
        {"question":"La contrainte admissible est :","optionA":"La contrainte de rupture","optionB":"La contrainte maximale autorisée (avec coefficient de sécurité)","optionC":"La contrainte nulle","optionD":"La masse","correctAnswer":"B","explanation":"σ_adm = σ_rupture / coefficient de sécurité."},
        {"question":"Le coefficient de sécurité typique en construction est :","optionA":"0,5","optionB":"1,0","optionC":"1,5","optionD":"10","correctAnswer":"C","explanation":"Le coefficient de sécurité est généralement 1,5 (béton armé)."},
        {"question":"La section d'une poutre rectangulaire est :","optionA":"b × h","optionB":"b + h","optionC":"b/h","optionD":"πr²","correctAnswer":"A","explanation":"Section rectangulaire = largeur × hauteur = b·h."},
        {"question":"Le moment quadratique d'une section rectangulaire est :","optionA":"bh³/12","optionB":"bh²/12","optionC":"bh/2","optionD":"b²h","correctAnswer":"A","explanation":"I = bh³/12 pour une section rectangulaire (axe horizontal)."},
        {"question":"La sécurité incendie d'un bâtiment public inclut :","optionA":"Caches d'issue","optionB":"Sorties de secours, extincteurs, alarmes","optionC":"Aucune mesure","optionD":"Verrouillage des portes","correctAnswer":"B","explanation":"Sorties de secours, extincteurs, désenfumage, alarmes sont obligatoires."},
        {"question":"Le périmètre de sécurité d'un chantier :","optionA":"Encourage l'intrusion","optionB":"Empêche l'accès aux non-autorisés","optionC":"Est facultatif","optionD":"Est décoratif","correctAnswer":"B","explanation":"Le balisage/gravillonnage protège le public et les travailleurs."},
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
