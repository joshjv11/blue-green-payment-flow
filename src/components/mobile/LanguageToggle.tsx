import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Locale } from '@/utils/locale';

export function LanguageToggle() {
  const [locale, setLocale] = useLocalStorage<Locale>('invoiceflow_locale', 'en-IN');

  const toggleLanguage = () => {
    setLocale(locale === 'en-IN' ? 'hi-IN' : 'en-IN');
    // Reload page to apply language changes
    window.location.reload();
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleLanguage}
      className="min-h-[48px] min-w-[48px]"
      title={locale === 'en-IN' ? 'Switch to Hindi' : 'Switch to English'}
    >
      <Languages className="h-5 w-5" />
      <span className="sr-only">{locale === 'en-IN' ? 'हिंदी' : 'English'}</span>
    </Button>
  );
}

