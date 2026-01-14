import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { TeamWithDetails } from "@/lib/serverComm";
import type { ServerUser } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PaymentWarningProps {
  teams: TeamWithDetails[];
  isAdmin: boolean;
  serverUser: ServerUser | null;
}

// Helper function to calculate league status
function getLeagueStatus(league: { start_date: string | null; end_date: string | null }): "not_started" | "in_progress" | "completed" {
  const now = new Date();
  
  if (!league.start_date || !league.end_date) {
    return "not_started";
  }
  
  const startDate = new Date(league.start_date);
  const endDate = new Date(league.end_date);
  
  if (startDate > now) {
    return "not_started";
  }
  if (startDate <= now && endDate >= now) {
    return "in_progress";
  }
  return "completed";
}

export function PaymentWarning({ teams, isAdmin, serverUser }: PaymentWarningProps) {
  const { t } = useTranslation('common');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Don't show warning for admins
  if (isAdmin) {
    return null;
  }

  // Don't show if no teams
  if (!teams || teams.length === 0) {
    return null;
  }

  // Filter teams that need payment
  const unpaidActiveLeagues = teams.filter(team => {
    // Must have a league
    if (!team.league) {
      return false;
    }

    // League must be active (not_started or in_progress)
    const status = getLeagueStatus(team.league);
    if (status === "completed") {
      return false;
    }

    // User must not have paid
    const paymentStatus = team.user_payment_status;
    if (!paymentStatus || paymentStatus.paid === true) {
      return false;
    }

    return true;
  });

  // Don't show warning if no unpaid active leagues
  if (unpaidActiveLeagues.length === 0) {
    return null;
  }

  // Format the message
  const getMessage = () => {
    if (unpaidActiveLeagues.length === 1) {
      const team = unpaidActiveLeagues[0];
      return t('paymentWarningDetails', {
        teamName: team.team.name,
        leagueName: team.league?.name || ''
      });
    }
    return t('paymentWarningMultipleTeams', { count: unpaidActiveLeagues.length });
  };

  // Get player first name for payment info (Bizum concept only uses first name)
  const getPlayerFirstName = () => {
    if (!serverUser) return '';
    // ServerUser has `first_name` per the repository's type
    if (serverUser.first_name) return serverUser.first_name;
    // Fallback to email local part if no first_name
    return serverUser.email?.split('@')[0] || '';
  };

  // Get first unpaid team name for Bizum concept
  const getTeamName = () => {
    if (unpaidActiveLeagues.length > 0) {
      return unpaidActiveLeagues[0].team.name;
    }
    return '';
  };

  return (
    <>
      <Alert className="mb-4 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-200">
          {t('paymentWarningTitle')}
        </AlertTitle>
        <AlertDescription className="space-y-3 text-yellow-700 dark:text-yellow-300">
          <p>{getMessage()}</p>
          <Button
            onClick={() => setShowPaymentModal(true)}
            variant="outline"
            size="sm"
            className="mt-2 border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-300 dark:hover:bg-yellow-900/20"
          >
            {t('paymentHowToPay')}
          </Button>
        </AlertDescription>
      </Alert>

      {/* Payment Information Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-[min(42rem,calc(100%-2rem))] p-4">
          <DialogHeader>
            <DialogTitle>{t('paymentOptions')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <ul className="space-y-2 list-disc list-inside text-sm">
                <li>{t('paymentOptionClub')}</li>
                <li>
                  {t('paymentOptionBizum', {
                    concept: (() => {
                      const playerFirstName = getPlayerFirstName();
                      const teamName = getTeamName();
                      if (playerFirstName && teamName) {
                        return `${playerFirstName} ${teamName}`;
                      }
                      return playerFirstName || teamName || '';
                    })(),
                    phone: '666 666 666'
                  })}
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPaymentModal(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
