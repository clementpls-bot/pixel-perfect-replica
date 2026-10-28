# Passer à Marque → Modèle → Variantes de design → Coffre du joueur

## Ce qui change pour toi
- Chaque marque contient des **modèles** (ex. Mango Loco).
- Chaque modèle a plusieurs **variantes de design**. C'est elles que l'on collectionne.
- Dans ta collection, tu indiques **quelle variante** tu possèdes, **combien**, et dans **quel état** : Pleine, Vide, ou Vide percée par le bas.
- Les canettes déjà présentes et ta collection actuelle sont conservées. Chaque canette devient automatiquement un modèle avec une variante « Standard ».

## Écrans adaptés
1. **Page marque** : on affiche la liste des modèles. Chaque carte indique le nombre de variantes possédées, par exemple « 2/4 variantes ».
2. **Nouvelle page modèle** : on y trouve la fiche du modèle et une grille de ses variantes (photo, format, région, année, édition, languette). Celles que tu ne possèdes pas apparaissent grisées.
3. **Page canette (variante)** : on y trouve les détails de la variante et les liens vers ses variantes sœurs. Les quantités se règlent séparément pour chaque état.
4. **Scan** : un code-barres ouvre directement la bonne variante.
5. **Collection** : on affiche une carte par variante possédée, avec le logo, la quantité, le badge « Possédé » et l'état.
6. **Proposer une canette** : tu choisis d'abord un modèle existant ou tu en crées un nouveau, puis tu remplis les infos de la variante.
7. **Succès et progression** : ils comptent les variantes. On ajoute aussi des succès « Tous les designs d'un modèle ».

## Détails techniques
- La nouvelle table `can_models` contient : id, brand_id, slug, name, flavour, description et image de couverture. Elle est lisible par tous. Elle a les GRANT et les règles d'accès habituelles, et seuls les admins peuvent la modifier.
- La table `cans` est conservée et sert de **table des variantes**, pour ne rien casser. On y ajoute model_id, variant_name (par défaut « Standard »), region, edition_type (standard / limited / collab / import / redesign), tab_color et notes. Ces colonnes sont soit vides, soit dotées d'une valeur par défaut.
- Une étape de rattrapage crée un modèle par couple (marque, nom de canette) et relie chaque canette à son modèle.
- La table `user_cans` reçoit une colonne `condition` (full / empty / empty_bottom_opened, par défaut full). La règle d'unicité devient (utilisateur, canette, état). Les lignes existantes passent à l'état full.
- Les tables `can_submissions` et `can_reports` reçoivent un model_id facultatif. La fonction d'approbation est mise à jour pour réutiliser ou créer le modèle.
- Dans le code : `useCatalog` charge aussi les modèles, `useOwned` regroupe par variante et par état, et les tests des succès sont adaptés.
- Rien n'est supprimé. L'ancien fonctionnement continue de marcher pendant la transition.
