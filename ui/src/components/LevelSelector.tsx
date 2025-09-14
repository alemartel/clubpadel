import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LevelStatusBadge } from "./LevelStatusBadge";
import { LevelValidationStatus } from "@/lib/serverComm";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface LevelSelectorProps {
  value?: string;
  onChange: (level: string) => void;
  disabled?: boolean;
  validationStatus: LevelValidationStatus;
  notes?: string;
  validatedAt?: string;
  className?: string;
}

export function LevelSelector({
  value,
  onChange,
  disabled,
  validationStatus,
  notes,
  validatedAt,
  className,
}: LevelSelectorProps) {
  const { t } = useTranslation('profile');
  const isDisabled = disabled || validationStatus === "pending";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('playerLevel')}</label>
        <Select
          value={value}
          onValueChange={onChange}
          disabled={isDisabled}
        >
          <SelectTrigger className={cn(isDisabled && "opacity-50")}>
            <SelectValue placeholder={t('selectYourLevel')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">{t('level1')}</SelectItem>
            <SelectItem value="2">{t('level2')}</SelectItem>
            <SelectItem value="3">{t('level3')}</SelectItem>
            <SelectItem value="4">{t('level4')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <LevelStatusBadge
        status={validationStatus}
        level={value}
        notes={notes}
        validatedAt={validatedAt}
      />
      
      {validationStatus === "pending" && (
        <p className="text-sm text-orange-600">
          {t('levelChangePending')}
        </p>
      )}
    </div>
  );
}
