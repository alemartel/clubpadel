import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation('common');
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="flex items-center gap-2">
        <Sun className="w-4 h-4" />
        <span className="hidden sm:inline">{t('light')}</span>
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="hidden sm:inline">
        {theme === "light" ? t('light') : t('dark')}
      </span>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
} 