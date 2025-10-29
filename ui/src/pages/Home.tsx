import { useAuth } from "@/lib/auth-context";
import { ProfileWarning } from "@/components/ProfileWarning";

export function Home() {
  const { serverUser, isAdmin } = useAuth();

  return (
    <div className="fixed inset-0 w-full h-full">
      <img 
        src="/landing.jpg" 
        alt="Club Padel" 
        className="w-full h-full object-cover"
      />
      <div className="absolute top-12 left-0 right-0 p-2 sm:p-4 z-10 max-w-4xl mx-auto">
        <ProfileWarning serverUser={serverUser} isAdmin={isAdmin} />
      </div>
    </div>
  );
} 