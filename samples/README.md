# samples/

Déposez ici **3 à 5 bulletins de paie SAP au format PDF** pour servir de cas de test
à l'extracteur.

- Vous pouvez masquer les données personnelles (nom, adresse, n° de sécurité sociale)
  avant de les déposer — l'analyse n'en a pas besoin.
- Ces fichiers **ne sont pas versionnés** (`.gitignore`) et **ne quittent jamais votre
  machine** : PayLumo fonctionne 100 % en local.
- Formats acceptés : PDF texte (généré par le logiciel de paie). Les PDF scannés
  (photos) ne sont pas encore pris en charge.

Tant qu'aucun bulletin réel n'est fourni, le développement s'appuie sur des PDF
synthétiques générés dans `tests/fixtures/`.
