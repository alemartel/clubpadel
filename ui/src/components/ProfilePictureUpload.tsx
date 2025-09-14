import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Upload, X } from 'lucide-react';
import { cloudinary, uploadWidgetConfig } from '@/lib/cloudinary';

interface ProfilePictureUploadProps {
  currentImageUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  onImageChange: (imageUrl: string) => void;
  onImageRemove: () => void;
  onError?: (error: string) => void;
  loading?: boolean;
  error?: string;
}

export function ProfilePictureUpload({
  currentImageUrl,
  firstName,
  lastName,
  email,
  onImageChange,
  onImageRemove,
  onError,
  loading = false,
  error,
}: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const uploadWidgetRef = useRef<any>(null);

  const handleUploadClick = () => {
    if (uploadWidgetRef.current) {
      uploadWidgetRef.current.open();
      return;
    }

    // Create upload widget
    uploadWidgetRef.current = (window as any).cloudinary.createUploadWidget(
      uploadWidgetConfig,
      (error: any, result: any) => {
        if (error) {
          console.error('Upload error:', error);
          setIsUploading(false);
          
          // Provide user-friendly error messages
          let errorMessage = 'Upload failed. Please try again.';
          
          if (error.status === 'Unknown API key') {
            errorMessage = 'Upload service is not configured. Please contact support.';
          } else if (error.status === 401) {
            errorMessage = 'Upload failed due to authentication error. Please try again.';
          } else if (error.status === 413) {
            errorMessage = 'File is too large. Please choose a smaller image.';
          } else if (error.message) {
            errorMessage = error.message;
          } else if (error.statusText) {
            errorMessage = error.statusText;
          }
          
          onError?.(errorMessage);
          return;
        }

        if (result && result.event === 'success') {
          const imageUrl = result.info.secure_url;
          onImageChange(imageUrl);
          setIsUploading(false);
        } else if (result && result.event === 'close') {
          // User closed the widget without uploading
          setIsUploading(false);
        }
      }
    );

    uploadWidgetRef.current.open();
    setIsUploading(true);
  };

  const handleRemoveClick = () => {
    setShowRemoveDialog(true);
  };

  const handleConfirmRemove = () => {
    onImageRemove();
    setShowRemoveDialog(false);
  };

  const handleCancelRemove = () => {
    setShowRemoveDialog(false);
  };

  const userData = {
    photo_url: null, // Firebase photo_url (not used for custom pictures)
    profile_picture_url: currentImageUrl,
    first_name: firstName,
    last_name: lastName,
    email: email,
  };

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Upload a profile picture that will be displayed in your profile and throughout the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Profile Picture */}
        <div className="flex items-center gap-4">
          <UserAvatar
            user={userData}
            size="lg"
            className="border-2 border-border"
          />
          <div className="flex-1">
            <h4 className="font-medium">Current Picture</h4>
            <p className="text-sm text-muted-foreground">
              {currentImageUrl ? 'You have a custom profile picture' : 'No custom picture set'}
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleUploadClick}
            disabled={loading || isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {currentImageUrl ? 'Change Picture' : 'Upload Picture'}
              </>
            )}
          </Button>
          
          {currentImageUrl && (
            <Button
              onClick={handleRemoveClick}
              disabled={loading || isUploading}
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-2" />
              Remove
            </Button>
          )}
        </div>

      </CardContent>

      {/* Remove Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Profile Picture</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove your profile picture? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelRemove}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Picture'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
