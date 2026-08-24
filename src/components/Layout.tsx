import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation, isRTL, LANGUAGE_LABELS, type Language } from '@/lib/i18n';
import { Shield, FileText, Wallet, Users, LogOut, X, UserCircle, UserCog, Calculator, Globe, ScrollText, Inbox, Contact as ContactIcon, Home, LayoutGrid } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import hisabLogo from '@/assets/hisab-logo.png';
import OnboardingGate from '@/components/OnboardingGate';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, language, setLanguage } = useAuth();
  const t = useTranslation(language);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Apply RTL direction to document
  useEffect(() => {
    const rtl = isRTL(language);
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  if (!user) return <Navigate to="/" replace />;

  const navItems = [
    { path: '/dashboard', label: t('dashboard'), icon: Home },
    { path: '/testament', label: t('testament'), icon: FileText },
    { path: '/debts', label: t('debts'), icon: Wallet },
    { path: '/contracts', label: t('contracts'), icon: ScrollText },
    { path: '/zakat', label: 'Zakât', icon: Calculator },
    { path: '/shared', label: t('sharedWithMe'), icon: Inbox },
    { path: '/contacts', label: t('contacts'), icon: ContactIcon },
    { path: '/identity', label: t('identity'), icon: UserCircle },
    { path: '/profile', label: t('profileHeirs'), icon: UserCircle },
    { path: '/users', label: language === 'ar' ? 'حسابي' : language === 'en' ? 'My account' : 'Mon compte', icon: UserCog },
    { path: '/wakils', label: t('wakils'), icon: Users },
  ];

  // Onglets principaux de la bottom bar
  const bottomItems = navItems.slice(0, 4);

  const isActive = (path: string) => location.pathname === path;

  const languages: Language[] = ['fr', 'en', 'ar'];
  const rtl = isRTL(language);

  return (
    <div className="min-h-screen islamic-pattern">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <img src={hisabLogo} alt="Hisab" className="h-9 w-9 rounded-2xl object-cover" />
            <span className="text-foreground font-display text-xl font-bold tracking-[0.1em] uppercase">
              {language === 'ar' ? 'حساب' : 'HISAB'}
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full bg-card text-xs text-muted-foreground hover:text-primary tracking-widest font-medium min-w-[44px] gap-1"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {LANGUAGE_LABELS[language]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[120px] rounded-2xl">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={language === lang ? 'bg-primary/15 text-primary font-medium' : ''}
                  >
                    {LANGUAGE_LABELS[lang]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="rounded-full bg-card text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <nav className="sticky top-16 z-40 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto p-3 lg:block">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.8} />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border/60">
            <Link
              to="/wakil-access"
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground transition-all"
            >
              <Shield className="h-4 w-4 text-primary" strokeWidth={1.8} />
              {t('wakilMode')}
            </Link>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden px-4 pb-28 pt-5 md:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-3xl min-w-0">
            <OnboardingGate>{children}</OnboardingGate>
          </div>
        </main>
      </div>

      {/* ── Feuille « Tous les menus » (mobile) ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[32px] border-t border-border bg-card p-5 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-base uppercase tracking-[0.08em] text-foreground">
                {language === 'ar' ? 'القوائم' : language === 'en' ? 'All menus' : 'Tous les menus'}
              </p>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                aria-label="close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={`flex flex-col items-center gap-2 rounded-3xl px-2 py-4 text-center text-[11px] font-medium leading-tight transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground active:bg-primary/20'
                  }`}
                >
                  <item.icon className="h-5 w-5" strokeWidth={1.8} />
                  {item.label}
                </Link>
              ))}
              <Link
                to="/wakil-access"
                onClick={() => setMenuOpen(false)}
                className="flex flex-col items-center gap-2 rounded-3xl bg-secondary px-2 py-4 text-center text-[11px] font-medium leading-tight text-muted-foreground"
              >
                <Shield className="h-5 w-5 text-primary" strokeWidth={1.8} />
                {t('wakilMode')}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom navigation bar ── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 lg:hidden"
        dir={rtl ? 'rtl' : 'ltr'}
        aria-label="navigation"
      >
        <div className="mx-auto mb-3 flex max-w-md items-center justify-between gap-1 rounded-full border border-border bg-card/95 px-2 py-2 shadow-card backdrop-blur-xl">
          {bottomItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-label={item.label}
                className={`flex h-11 flex-1 items-center justify-center rounded-full transition-all duration-300 ${
                  active ? 'bg-primary text-primary-foreground shadow-gold' : 'text-muted-foreground active:bg-secondary'
                }`}
              >
                <item.icon className="h-5 w-5" strokeWidth={1.9} />
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={language === 'ar' ? 'القوائم' : language === 'en' ? 'All menus' : 'Tous les menus'}
            className={`flex h-11 flex-1 items-center justify-center rounded-full transition-all duration-300 ${
              menuOpen ? 'bg-primary text-primary-foreground' : 'text-muted-foreground active:bg-secondary'
            }`}
          >
            <LayoutGrid className="h-5 w-5" strokeWidth={1.9} />
          </button>
        </div>
      </nav>
    </div>
  );
}
