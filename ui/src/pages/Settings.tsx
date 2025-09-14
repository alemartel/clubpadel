import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';

export function Settings() {
  const { t } = useTranslation('common');
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('settings')}</h1>
          <p className="text-muted-foreground">
            {t('manageAccountSettings')}
          </p>
        </div>

        {/* Settings content will be added here */}
        <Card>
          <CardHeader>
            <CardDescription>
              {t('configureSystemSettings')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('settingsOptionsFuture')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 