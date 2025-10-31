import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import type { ServerUser } from "@/lib/auth-context";

interface ProfileWarningProps {
  serverUser: ServerUser | null;
  isAdmin: boolean;
}

export function ProfileWarning({ serverUser, isAdmin }: ProfileWarningProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  // Don't show warning for admins
  if (isAdmin) {
    return null;
  }

  // Don't show if user data not loaded
  if (!serverUser) {
    return null;
  }

  // Check if fields are missing (undefined, null, empty string, or whitespace-only)
  const isFieldMissing = (field: string | undefined | null): boolean => {
    if (!field) return true;
    return field.trim().length === 0;
  };

  const missingFields: string[] = [];
  
  if (isFieldMissing(serverUser.phone_number)) {
    missingFields.push(t('profileMissingPhoneNumber'));
  }
  
  if (isFieldMissing(serverUser.dni)) {
    missingFields.push(t('profileMissingDNI'));
  }
  
  if (isFieldMissing(serverUser.tshirt_size)) {
    missingFields.push(t('profileMissingTshirtSize'));
  }
  
  if (isFieldMissing(serverUser.gender)) {
    missingFields.push(t('profileMissingGender'));
  }
  
  if (isFieldMissing(serverUser.profile_picture_url)) {
    missingFields.push(t('profileMissingProfilePicture'));
  }

  // Don't show warning if all fields are present
  if (missingFields.length === 0) {
    return null;
  }

  const handleUpdateProfile = () => {
    navigate('/profile');
  };

  // Format the message to list missing fields dynamically
  const getMessage = () => {
    if (missingFields.length === 1) {
      return t('profileIncompleteWarningDescriptionSingle', { field: missingFields[0] });
    }
    // Join missing fields with commas and "and" for the last one
    const fieldsList = missingFields.length === 2
      ? `${missingFields[0]} ${t('and')} ${missingFields[1]}`
      : missingFields.slice(0, -1).join(', ') + ` ${t('and')} ${missingFields[missingFields.length - 1]}`;
    return t('profileIncompleteWarningDescriptionMultiple', { fields: fieldsList });
  };

  return (
    <Alert className="mb-4 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">
        {t('profileIncompleteWarningTitle')}
      </AlertTitle>
      <AlertDescription className="space-y-3 text-yellow-700 dark:text-yellow-300">
        <p>{getMessage()}</p>
        <Button
          onClick={handleUpdateProfile}
          variant="outline"
          size="sm"
          className="mt-2 border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-300 dark:hover:bg-yellow-900/20"
        >
          {t('profileIncompleteUpdateButton')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

