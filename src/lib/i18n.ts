export type Language = 'fr' | 'en';

const translations = {
  fr: {
    // App
    appName: 'Sabeel',
    appTagline: 'Votre testament islamique sécurisé',
    
    // Auth
    login: 'Se connecter',
    signup: 'Créer un compte',
    email: 'Email',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    forgotPassword: 'Mot de passe oublié ?',
    noAccount: "Pas encore de compte ?",
    hasAccount: 'Déjà un compte ?',
    signupSuccess: 'Vérifiez votre email pour confirmer votre inscription.',
    loginError: 'Email ou mot de passe incorrect.',
    logout: 'Déconnexion',
    
    // PIN
    enterPin: 'Entrez votre code PIN',
    createPin: 'Créez votre code PIN (6 chiffres)',
    confirmPin: 'Confirmez votre code PIN',
    pinMismatch: 'Les codes PIN ne correspondent pas.',
    pinLocked: 'Trop de tentatives. Réessayez dans',
    minutes: 'minutes',
    
    // Passphrase
    enterPassphrase: 'Entrez votre phrase secrète',
    createPassphrase: 'Créez votre phrase secrète de chiffrement',
    passphraseHint: 'Cette phrase ne sera jamais stockée. Elle est nécessaire pour déchiffrer vos données.',
    passphraseWarning: '⚠️ Si vous perdez cette phrase, vos données seront irrécupérables.',
    
    // Navigation
    dashboard: 'Tableau de bord',
    testament: 'Mon Testament',
    debts: 'Mes Dettes',
    wakils: 'Mes Wakils',
    settings: 'Paramètres',
    vault: 'Coffre-fort',
    
    // Dashboard
    welcomeBack: 'Bienvenue',
    securityStatus: 'Statut de sécurité',
    encrypted: 'Chiffré',
    lastAccess: 'Dernier accès',
    
    // Testament
    testamentTitle: 'Mon Testament',
    testamentPlaceholder: 'Rédigez votre testament ici...',
    save: 'Sauvegarder',
    saved: 'Sauvegardé',
    saving: 'Sauvegarde...',
    
    // Debts
    debtsTitle: 'Mes Dettes',
    iOwe: 'Je dois',
    owedToMe: 'On me doit',
    addDebt: 'Ajouter une dette',
    amount: 'Montant',
    description: 'Description',
    creditorDebtor: 'Créancier / Débiteur',
    settled: 'Réglée',
    markSettled: 'Marquer comme réglée',
    delete: 'Supprimer',
    
    // Wakils
    wakilsTitle: 'Mes Wakils',
    addWakil: 'Ajouter un Wakil',
    wakilName: 'Nom du Wakil',
    wakilEmail: 'Email',
    wakilPhone: 'Téléphone',
    wakilCode: 'Code Wakil',
    revokeWakil: 'Révoquer',
    activeWakil: 'Actif',
    revokedWakil: 'Révoqué',
    copyCode: 'Copier le code',
    codeCopied: 'Code copié !',
    
    // Wakil Mode
    wakilMode: 'Mode Wakil',
    wakilModeDesc: 'Accéder aux données d\'un proche',
    enterUserId: 'ID utilisateur',
    enterWakilCode: 'Code Wakil',
    accessData: 'Accéder aux données',
    readOnly: 'Lecture seule',
    
    // Common
    cancel: 'Annuler',
    confirm: 'Confirmer',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
  },
  en: {
    appName: 'Sabeel',
    appTagline: 'Your secure Islamic will',
    
    login: 'Log in',
    signup: 'Sign up',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    signupSuccess: 'Check your email to confirm your registration.',
    loginError: 'Invalid email or password.',
    logout: 'Log out',
    
    enterPin: 'Enter your PIN',
    createPin: 'Create your PIN (6 digits)',
    confirmPin: 'Confirm your PIN',
    pinMismatch: 'PINs do not match.',
    pinLocked: 'Too many attempts. Try again in',
    minutes: 'minutes',
    
    enterPassphrase: 'Enter your passphrase',
    createPassphrase: 'Create your encryption passphrase',
    passphraseHint: 'This phrase is never stored. It is required to decrypt your data.',
    passphraseWarning: '⚠️ If you lose this phrase, your data will be unrecoverable.',
    
    dashboard: 'Dashboard',
    testament: 'My Will',
    debts: 'My Debts',
    wakils: 'My Wakils',
    settings: 'Settings',
    vault: 'Vault',
    
    welcomeBack: 'Welcome back',
    securityStatus: 'Security status',
    encrypted: 'Encrypted',
    lastAccess: 'Last access',
    
    testamentTitle: 'My Will',
    testamentPlaceholder: 'Write your will here...',
    save: 'Save',
    saved: 'Saved',
    saving: 'Saving...',
    
    debtsTitle: 'My Debts',
    iOwe: 'I owe',
    owedToMe: 'Owed to me',
    addDebt: 'Add a debt',
    amount: 'Amount',
    description: 'Description',
    creditorDebtor: 'Creditor / Debtor',
    settled: 'Settled',
    markSettled: 'Mark as settled',
    delete: 'Delete',
    
    wakilsTitle: 'My Wakils',
    addWakil: 'Add a Wakil',
    wakilName: 'Wakil name',
    wakilEmail: 'Email',
    wakilPhone: 'Phone',
    wakilCode: 'Wakil Code',
    revokeWakil: 'Revoke',
    activeWakil: 'Active',
    revokedWakil: 'Revoked',
    copyCode: 'Copy code',
    codeCopied: 'Code copied!',
    
    wakilMode: 'Wakil Mode',
    wakilModeDesc: "Access a loved one's data",
    enterUserId: 'User ID',
    enterWakilCode: 'Wakil Code',
    accessData: 'Access data',
    readOnly: 'Read only',
    
    cancel: 'Cancel',
    confirm: 'Confirm',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
  },
} as const;

export type TranslationKey = keyof typeof translations.fr;

export function t(key: TranslationKey, lang: Language = 'fr'): string {
  return translations[lang][key] || key;
}

export function useTranslation(lang: Language) {
  return (key: TranslationKey) => t(key, lang);
}
