import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation, type Language } from '@/lib/i18n';
import { Shield, FileText, Wallet, Users, Settings, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, language, setLanguage } = useAuth();
  const t = useTranslation(language);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: t('dashboard'), icon: Shield },
    { path: '/testament', label: t('testament'), icon: FileText },
    { path: '/debts', label: t('debts'), icon: Wallet },
    { path: '/wakils', label: t('wakils'), icon: Users },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background islamic-pattern">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="font-serif text-lg text-primary-foreground">س</span>
              </div>
              <span className="font-serif text-xl font-bold text-foreground">Sabeel</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              className="text-xs"
            >
              {language === 'fr' ? 'EN' : 'FR'}
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Mobile nav overlay */}
        {menuOpen && (
          <div className="fixed inset-0 z-40 bg-background/80 md:hidden" onClick={() => setMenuOpen(false)} />
        )}

        {/* Sidebar nav */}
        <nav
          className={`fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-64 border-r border-border bg-card p-4 transition-transform md:sticky md:translate-x-0 ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-border">
            <Link
              to="/wakil-access"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sabeel-gold hover:bg-muted transition-colors"
            >
              <Shield className="h-4 w-4" />
              {t('wakilMode')}
            </Link>
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
