import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation, type Language } from '@/lib/i18n';
import { Shield, FileText, Wallet, Users, LogOut, Menu, X, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import mirathLogo from '@/assets/mirath-logo.png';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, language, setLanguage } = useAuth();
  const t = useTranslation(language);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return <Navigate to="/" replace />;

  const navItems = [
    { path: '/dashboard', label: t('dashboard'), icon: Shield },
    { path: '/testament', label: t('testament'), icon: FileText },
    { path: '/debts', label: t('debts'), icon: Wallet },
    { path: '/profile', label: language === 'fr' ? 'Profil & Héritiers' : 'Profile & Heirs', icon: UserCircle },
    { path: '/wakils', label: t('wakils'), icon: Users },
  ];

  const isActive = (path: string) => location.pathname === path;

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
                className="text-gold-gradient font-display text-xl font-bold tracking-[0.12em] uppercase"
              >
                MIRATH
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              className="text-xs text-muted-foreground hover:text-gold hover:bg-gold/5 tracking-widest font-medium"
            >
              {language === 'fr' ? 'EN' : 'FR'}
            </Button>
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
          className={`fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-60 border-r border-border bg-card p-4 shadow-sm transition-transform duration-300 md:sticky md:translate-x-0 ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
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
                    ? 'bg-gold/10 text-gold border border-gold/20 shadow-gold/10 shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent'
                }`}
              >
                {isActive(item.path) ? (
                  <div className="flex items-center justify-center w-6 h-6">
                    <item.icon className="h-4 w-4 text-gold" />
                  </div>
                ) : (
                  <item.icon className="h-4 w-4" />
                )}
                {item.label}
                {isActive(item.path) && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_6px_hsl(43_72%_58%/0.8)]" />
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
              <Shield className="h-4 w-4 text-gold/60" />
              {t('wakilMode')}
            </Link>
          </div>

          {/* Bottom decoration */}
          <div className="absolute bottom-6 left-4 right-4 text-center">
            <p className="text-xs text-muted-foreground/40 font-arabic">بِسْمِ اللَّهِ</p>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
