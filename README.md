# Sabeel: Your Islamic Legacy

Je veux créer une application web mobile-first appelée "Sabeel".

Objectif :

Application destinée aux musulmans pour gérer un testament islamique, leurs dettes, désigner des personnes de confiance (wakils) et permettre un accès post-mortem sécurisé.

Exigences générales :

- Design moderne, minimaliste, avec touches islamiques discrètes (vert doux, beige, doré).

- Responsive mobile-first.

- Interface en français et anglais.

- UX simple et claire.

Architecture de sécurité (très important) :

- Toutes les données sensibles (testament, dettes, contrats) doivent être chiffrées côté client avant d’être envoyées en base.

- Le serveur ne doit stocker que des données chiffrées (ciphertext).

- Utiliser un chiffrement moderne type AES-GCM ou équivalent.

- La clé de chiffrement doit être dérivée d’une phrase secrète choisie par l’utilisateur (jamais stockée en base).

- Implémenter une protection contre brute force (limite de tentatives).

- Mettre en place Row Level Security stricte pour chaque utilisateur.

Fonctionnalités V1 :

1. Authentification email + code PIN.

2. Coffre-fort chiffré.

3. Section "Mon Testament" (texte libre + sauvegarde).

4. Section "Mes Dettes" (je dois / on me doit).

5. Section "Mes Wakils" :

   - Ajouter wakil

   - Générer code wakil unique

   - Révocation possible

6. Mode Wakil :

   - Accès via ID utilisateur + code wakil

   - Lecture seule

   - Déchiffrement via phrase secrète

Base de données :

Propose une structure de tables sécurisée (users, vault_items, wakils, audit_logs).

Commence par :

- Générer l’architecture technique

- Générer les pages principales

- Proposer la structure base de données sécurisée

- Mettre en place les règles RLS

Ne simplifie pas la sécurité.

Priorité absolue : protection des données.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sabil-secure-legacy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e28ad1b7-f723-4d58-9cf0-03d9698a5bcb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
