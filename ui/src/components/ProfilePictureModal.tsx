import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";

interface ProfilePictureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export function ProfilePictureModal({
  open,
  onOpenChange,
  imageUrl,
  firstName,
  lastName,
  email,
}: ProfilePictureModalProps) {
  const [imageError, setImageError] = useState(false);

  // Reset error state when imageUrl or open changes
  useEffect(() => {
    if (open && imageUrl) {
      setImageError(false);
    }
  }, [open, imageUrl]);

  // Don't show if there's no image
  if (!imageUrl) {
    return null;
  }

  const displayName = `${firstName || ""} ${lastName || ""}`.trim() || email || "Profile picture";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">{displayName}</DialogTitle>
        <DialogDescription className="sr-only">Profile picture for {displayName}</DialogDescription>
        <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {imageError ? (
            <UserAvatar
              user={{
                photo_url: null,
                profile_picture_url: null,
                first_name: firstName,
                last_name: lastName,
                email: email,
              }}
              size="lg"
              className="w-64 h-64"
            />
          ) : (
            <img
              src={imageUrl}
              alt={`${firstName || ""} ${lastName || ""}`.trim() || email || "Profile picture"}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

