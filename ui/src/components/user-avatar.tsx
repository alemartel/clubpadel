import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  user: {
    photo_url?: string | null;
    profile_picture_url?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
  className?: string;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

export function UserAvatar({
  user,
  className,
  onClick,
  size = "md",
}: UserAvatarProps) {
  const getInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) {
      return user.first_name[0].toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const sizeClasses = {
    sm: "size-6",
    md: "size-8",
    lg: "size-12",
  };

  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={onClick}
    >
      {(user.profile_picture_url || user.photo_url) && (
        <AvatarImage 
          src={user.profile_picture_url || user.photo_url || ""} 
          alt="User avatar" 
        />
      )}
      <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
}
