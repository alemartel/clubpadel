import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { currentLanguage, changeLanguage, isEnglish, isSpanish } = useTranslation();

  const toggleLanguage = () => {
    const newLanguage = isEnglish ? 'es' : 'en';
    changeLanguage(newLanguage);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2"
    >
      <Languages className="w-4 h-4" />
      <span className="hidden sm:inline">
        {isEnglish ? 'ES' : 'EN'}
      </span>
    </Button>
  );
}
