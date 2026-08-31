# GFA Check-In V2

Application web de gestion du club Group Fight Academy.

## Ce qui fonctionne déjà
- connexion / mode démo
- rôles : coach principal, coach assistant, adhérent
- gestion des adhérents
- pointage des présences
- suivi des grades et barrettes
- compétitions
- export CSV
- interface responsive mobile / tablette / ordinateur
- mode Firebase prêt à connecter

## Lancer en local
Le fichier utilise des modules JavaScript. Lance un petit serveur HTTP :

```bash
python3 -m http.server 8080
```

Puis ouvre :
http://localhost:8080

## Connecter Firebase
1. Créer un projet sur Firebase.
2. Activer Authentication > Email/Password.
3. Créer une base Firestore.
4. Dans les paramètres du projet, créer une application Web.
5. Copier les valeurs de configuration dans l'écran Paramètres de GFA Check-In.
6. Recharger l'application.

## Collections Firestore utilisées
- members
- attendance
- competitions

## À faire ensuite pour la production
- règles Firestore par rôle
- Firebase Storage pour certificats et documents
- comptes coachs assistants
- espace adhérent personnalisé
- gestion sécurisée des rôles via custom claims ou collection users


## Firebase déjà configuré
Cette version contient déjà la configuration Web du projet Firebase `gfa-chek-in`.

Il reste à :
- publier l'application sur un hébergement HTTPS ;
- se connecter avec le compte Firebase Authentication créé ;
- définir ensuite des rôles plus fins (coach principal / assistant / adhérent) dans Firestore.
