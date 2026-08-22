# Mise en conformité religieuse et corrections UX — Mirath

Compréhension et périmètre point par point, avec fichiers/tables impactés. Le calcul des fara'id est explicitement hors périmètre ; la structure de données du testament reste extensible.

## 1. Wasiyya restreinte aux non-héritiers
Dans la section « Wasiyya » du testament, chaque bénéficiaire reçoit un sélecteur de catégorie : héritier légal (conjoint, enfant, parent, frère/soeur) ou non-héritier. Si héritier légal : bandeau d'avertissement avec le hadith (Abu Dawud, At-Tirmidhi) + case à cocher obligatoire de consentement (bloque la sauvegarde tant qu'elle n'est pas cochée). Le flag `requiresHeirConsent` et la catégorie sont stockés dans l'objet testament déjà chiffré (aucune migration : le testament est un blob chiffré dans `vault_items`).
- `src/pages/Testament.tsx` (type `WasiyyaBeneficiary`, UI, export PDF)

## 2. Témoins du testament
Reprise du modèle Dettes : jusqu'à 2 témoins (nom, email, téléphone), stockés chiffrés dans le blob testament. Avertissement si le nom du témoin correspond à un bénéficiaire. Notification email via une Edge Function réutilisant Resend (contenu non sensible : nom du testateur + date). Ajout d'une ligne « Témoins » dans le PDF.
- `src/pages/Testament.tsx`, nouvelle fonction `supabase/functions/send-testament-witness-notice/`

## 3. Pénalités de retard (contrats) — ribâ
Le champ « Pénalités » gagne un sélecteur obligatoire « Destination de la pénalité » : (a) oeuvre caritative (dropdown de suggestions + texte libre), (b) autre → avertissement fiqhi non bloquant + lien ressource. Aucun défaut « acquise au créancier » sans avertissement.
- `src/components/contracts/ContractFormDialog.tsx`, `src/lib/contractPdf.ts`, `src/pages/Contracts.tsx` (champ chiffré ajouté au payload existant)

## 4. Zakât — lunaire par défaut
`calendar_type` par défaut = `hijri` à la création des réglages. Libellé solaire reformulé (« Année solaire — ajustement automatique, confort comptable »). Vérification/implémentation de l'ajustement de taux (2,577 % vs 2,5 %) en mode solaire dans le calcul et l'affichage.
- `src/hooks/useZakatData.ts`, `src/components/zakat/ZakatSettings.tsx`, `src/lib/zakatCalc.ts`, `src/components/zakat/ZakatDashboard.tsx`

## 5. Rappel hadith « deux nuits »
Bannière discrète sur le dashboard tant que le testament n'est pas complété : citation arabe + traduction de sens, mention Al-Bukhari & Muslim, bouton « Rédiger mon testament » et fermeture mémorisée par session.
- `src/pages/Dashboard.tsx` (nouveau composant `src/components/WasiyyaReminder.tsx`), `src/lib/i18n.ts`

## 6. Audit des icônes
Remplacement des icônes figuratives (`User`, `Users`, `UserPlus`, `Contact`, `Eye`) par des équivalents abstraits/géométriques (`IdCard`, `Network`/`ShieldCheck`, `CirclePlus`, `BookUser` → `NotebookText`, `Scan`), en cohérence avec le motif mashrabiya.
- `src/pages/Dashboard.tsx`, `src/components/Layout.tsx`, `Contacts.tsx`, `Wakils.tsx`, `Identity.tsx`, `Profile.tsx`

## 7. Typographie arabe UI vs citations
Ajout de Cairo comme police arabe d'UI (`font-arabic-ui`), Amiri réservée aux citations religieuses (`font-arabic`). Application via une règle `[lang="ar"]`/RTL sur le body et les composants d'UI.
- `src/index.css`, `tailwind.config.ts`, composants affichant du texte arabe d'interface

## 8. Majuscules non appliquées à l'arabe
`text-transform: uppercase` et le letter-spacing des titres neutralisés lorsque la langue est l'arabe (`html[dir="rtl"] h1,h2,h3 { text-transform:none; letter-spacing:normal }`), plus vérification des `uppercase`/`tracking-*` posés en classes sur des titres traduits.
- `src/index.css`, composants de titres

## 9. Contraste WCAG
Audit des paires doré/beige sur charcoal (texte normal ≥ 4.5:1, titres ≥ 3:1) ; remontée de la luminosité des tokens `--primary`, `--muted-foreground`, `--gold-dim` et `text-gold-gradient` juste assez pour passer AA, sans changer la teinte dorée.
- `src/index.css`, `tailwind.config.ts`

## 10. Affordance du flip
Petite icône de rotation en coin de carte (opacité faible) + micro-animation « nudge » une seule fois par session sur la première carte.
- `src/pages/Dashboard.tsx`, `src/index.css`

## 11. RTL
Mirror des icônes directionnelles en RTL (utilitaire `.rtl-flip` appliqué aux chevrons/flèches) et forçage `dir="ltr"` + `font-variant-numeric` sur les champs montants, dates et codes.
- `src/index.css`, pages Dettes / Contrats / Zakât / Testament, `src/components/Layout.tsx`

## Notes techniques
- Aucune migration SQL nécessaire : les nouveaux champs testament/contrat vivent dans les blobs déjà chiffrés (AES-256-GCM, IV par ligne).
- Toutes les nouvelles chaînes ajoutées en FR/EN/AR dans `src/lib/i18n.ts`.
- Livraison possible par lots (1-2, 3-5, 6-11) si tu préfères valider progressivement.
