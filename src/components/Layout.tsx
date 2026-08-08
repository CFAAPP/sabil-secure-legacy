import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation, isRTL, LANGUAGE_LABELS, type Language } from '@/lib/i18n';
import { Shield, FileText, Wallet, Users, LogOut, Menu, X, UserCircle, ArrowLeft, Calculator, Globe, ScrollText, Inbox, Contact as ContactIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import mirathLogo from '@/assets/mirath-logo.png';
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
    { path: '/dashboard', label: t('dashboard'), icon: Shield },
    { path: '/testament', label: t('testament'), icon: FileText },
    { path: '/debts', label: t('debts'), icon: Wallet },
    { path: '/contracts', label: t('contracts'), icon: ScrollText },
    { path: '/zakat', label: 'Zakât', icon: Calculator },
    { path: '/shared', label: t('sharedWithMe'), icon: Inbox },
    { path: '/contacts', label: t('contacts'), icon: ContactIcon },
    { path: '/identity', label: t('identity'), icon: UserCircle },
    { path: '/profile', label: t('profileHeirs'), icon: UserCircle },
    { path: '/wakils', label: t('wakils'), icon: Users },
  ];

  const isActive = (path: string) => location.pathname === path;

  const languages: Language[] = ['fr', 'en', 'ar'];

  return (
    <div className="min-h-screen islamic-pattern">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-xl shadow-sm">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="relative">
                <img src={mirathLogo} alt="Mirath" className="h-8 w-8 rounded-lg object-cover" />
                <div className="absolute inset-0 rounded-lg ring-1 ring-gold/30 group-hover:ring-gold/60 transition-all" />
              </div>
              <span
                className="text-foreground font-display text-xl font-bold tracking-[0.12em] uppercase"
              >
                {language === 'ar' ? 'ميراث' : 'MIRATH'}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 tracking-widest font-medium min-w-[40px] gap-1"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {LANGUAGE_LABELS[language]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[120px]">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={language === lang ? 'bg-primary/10 text-primary font-medium' : ''}
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
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Mobile nav overlay */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <nav
          className={`fixed top-14 z-40 h-[calc(100vh-3.5rem)] w-60 border-border bg-card p-4 shadow-sm transition-transform duration-300 md:sticky md:translate-x-0 overflow-y-auto ${
            isRTL(language) 
              ? `right-0 border-l ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`
              : `left-0 border-r ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`
          }`}
        >
          {/* Glow top */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-gold/10 shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent'
                }`}
              >
                {isActive(item.path) ? (
                  <div className="flex items-center justify-center w-6 h-6">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                ) : (
                  <item.icon className="h-4 w-4" />
                )}
                {item.label}
                {isActive(item.path) && (
                  <div className="ms-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(43_72%_58%/0.8)]" />
                )}
              </Link>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border/50">
            <Link
              to="/wakil-access"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all border border-transparent"
            >
              <Shield className="h-4 w-4 text-primary/60" />
              {t('wakilMode')}
            </Link>
          </div>

          {/* Bottom decoration */}
          <div className="absolute bottom-6 left-4 right-4 text-center">
            <p className="text-xs text-muted-foreground/40 font-arabic">بِسْمِ اللَّهِ</p>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden px-4 py-6 md:px-8">
          <div className="mx-auto w-full max-w-3xl min-w-0">
            <OnboardingGate>{children}</OnboardingGate>
          </div>
        </main>
      </div>


      {/* Floating home button — visible on mobile when sidebar is hidden */}
      {location.pathname !== '/dashboard' && (
        <Link
          to="/dashboard"
          className={`lg:hidden fixed bottom-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-card border border-primary/30 shadow-lg shadow-black/30 hover:bg-primary/10 hover:border-primary/60 transition-all active:scale-95 ${
            isRTL(language) ? 'right-5' : 'left-5'
          }`}
          aria-label={t('dashboard')}
        >
          <ArrowLeft className={`h-5 w-5 text-primary ${isRTL(language) ? 'rotate-180' : ''}`} />
        </Link>
      )}
    </div>
  );
}
