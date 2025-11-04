import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getAllPlayers,
  getPlayerTeams,
  updateMemberPaid,
  type PlayerTeamInfo,
} from "@/lib/serverComm";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, Users, ChevronDown, ChevronUp, CheckCircle2, XCircle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Player {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  phone_number?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export function AdminPlayers() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('players');
  const { t: tCommon } = useTranslation('common');
  const { t: tTeams } = useTranslation('teams');

  // State for all players
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // State for player teams and payments
  const [playerTeamsMap, setPlayerTeamsMap] = useState<Record<string, PlayerTeamInfo[]>>({});
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
  const [teamsLoadingMap, setTeamsLoadingMap] = useState<Record<string, boolean>>({});
  
  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentTeamId, setPaymentTeamId] = useState<string | null>(null);
  const [paymentUserId, setPaymentUserId] = useState<string | null>(null);
  const [paymentPlayerId, setPaymentPlayerId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentError, setPaymentError] = useState<string>("");
  
  // Payment details modal state
  const [showPaymentDetailsDialog, setShowPaymentDetailsDialog] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{ amount: number | null; date: string | null } | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/", { state: { error: t('adminAccessRequired') } });
    }
  }, [isAdmin, loading, navigate, t]);

  // Load all players on mount
  useEffect(() => {
    if (isAdmin) {
      loadAllPlayers();
    }
  }, [isAdmin]);

  // Filter players based on search term
  useEffect(() => {
    let filtered = players;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (player) =>
          player.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (player.first_name && player.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (player.last_name && player.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (player.display_name && player.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredPlayers(filtered);
  }, [players, searchTerm]);

  const loadAllPlayers = async () => {
    setLoadingPlayers(true);
    setError("");

    try {
      const response = await getAllPlayers();
      setPlayers(response.players);
    } catch (err: any) {
      setError(err.message || t('failedToLoadPlayers'));
    } finally {
      setLoadingPlayers(false);
    }
  };

  const getPlayerName = (player: Player) => {
    if (player.display_name) return player.display_name;
    if (player.first_name && player.last_name) return `${player.first_name} ${player.last_name}`;
    return t('unknownPlayer');
  };

  const loadPlayerTeams = async (playerId: string) => {
    // Prevent duplicate loads
    if (playerTeamsMap[playerId] || teamsLoadingMap[playerId]) return;
    
    setTeamsLoadingMap(prev => ({ ...prev, [playerId]: true }));
    try {
      const response = await getPlayerTeams(playerId);
      setPlayerTeamsMap(prev => ({ ...prev, [playerId]: response.teams || [] }));
    } catch (error) {
      console.error("Failed to load player teams:", error);
      toast.error(tCommon('failedToLoadTeams') || "Failed to load teams");
    } finally {
      setTeamsLoadingMap(prev => ({ ...prev, [playerId]: false }));
    }
  };

  const handleToggleTeams = (playerId: string) => {
    const newExpanded = new Set(expandedPlayers);
    if (newExpanded.has(playerId)) {
      newExpanded.delete(playerId);
    } else {
      newExpanded.add(playerId);
      // Load teams when expanding
      loadPlayerTeams(playerId);
    }
    setExpandedPlayers(newExpanded);
  };

  const handleMarkPaid = async (
    playerId: string,
    teamId: string,
    userId: string,
    _teamMemberId: string,
    currentPaid: boolean,
    desiredPaid: boolean
  ) => {
    if (!currentPaid && desiredPaid) {
      // Going from unpaid to paid, open modal
      setPaymentTeamId(teamId);
      setPaymentUserId(userId);
      setPaymentPlayerId(playerId);
      setPaymentAmount("");
      setPaymentError("");
      setShowPaymentDialog(true);
    } else if (currentPaid && !desiredPaid) {
      // Going from paid to unpaid
      try {
        await updateMemberPaid(teamId, userId, { paid: false });
        toast.success(tTeams('memberMarkedUnpaid') || "Member marked as unpaid");
        // Refresh teams for this player
        setPlayerTeamsMap(prev => {
          const updated = { ...prev };
          delete updated[playerId];
          return updated;
        });
        setTeamsLoadingMap(prev => {
          const updated = { ...prev };
          delete updated[playerId];
          return updated;
        });
        loadPlayerTeams(playerId);
      } catch (err: any) {
        console.error("Failed to update payment status:", err);
        toast.error(err.message || tTeams('failedToUpdatePayment') || "Failed to update payment status");
      }
    }
  };

  const handlePaymentDialogConfirm = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError(tTeams("amountPaid") + ": " + tCommon("pleaseFillAllFields"));
      return;
    }
    if (paymentTeamId && paymentUserId && paymentPlayerId) {
      try {
        await updateMemberPaid(paymentTeamId, paymentUserId, { paid: true, paid_amount: amount });
        toast.success(tTeams('memberMarkedPaid') || "Member marked as paid");
        setShowPaymentDialog(false);
        setPaymentError("");
        setPaymentAmount("");
        // Refresh teams for this player
        setPlayerTeamsMap(prev => {
          const updated = { ...prev };
          delete updated[paymentPlayerId];
          return updated;
        });
        setTeamsLoadingMap(prev => {
          const updated = { ...prev };
          delete updated[paymentPlayerId];
          return updated;
        });
        loadPlayerTeams(paymentPlayerId);
      } catch (err: any) {
        setPaymentError(err.message || tCommon("error"));
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">{tCommon('loading')}</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }


  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('playerManagement')}</h1>
          <p className="text-muted-foreground">{t('manageAllPlayers')}</p>
        </div>
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">{t('total')}</p>
              <p className="text-lg md:text-2xl font-bold">{players.length}</p>
            </div>
            <Users className="w-5 h-5 md:w-8 md:h-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={t('searchByNameOrEmail')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Players Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('allPlayersTitle')}</CardTitle>
              <CardDescription>
                {t('manageAllPlayers')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPlayers ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-muted-foreground">{t('loadingPlayers')}</span>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {searchTerm ? t('noMatchingPlayersFound') : t('noPlayersFound')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? t('tryAdjustingSearch')
                  : t('noPlayersRegisteredYet')
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredPlayers.map((player) => {
                const teams = playerTeamsMap[player.id] || [];
                const isExpanded = expandedPlayers.has(player.id);
                const isLoading = teamsLoadingMap[player.id];
                const teamsCount = teams.length;

                return (
                  <Card key={player.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {getPlayerName(player)}
                        </CardTitle>
                        <CardDescription className="truncate">
                          {player.email}
                        </CardDescription>
                        {player.phone_number && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {player.phone_number}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Collapsible open={isExpanded} onOpenChange={() => handleToggleTeams(player.id)}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full text-left text-sm font-medium hover:text-foreground transition-colors">
                          <span>
                            {isExpanded && teamsCount > 0 
                              ? tCommon('playerTeamsCount', { count: teamsCount })
                              : tCommon('playerTeams')
                            }
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 mt-2">
                          {isLoading ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                              {tCommon('loading')}
                            </div>
                          ) : teams.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                              {tCommon('noTeamsForPlayer')}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {teams.map((teamInfo) => {
                                const displayName = teamInfo.league
                                  ? tCommon('leagueTeamDisplay', {
                                      leagueName: teamInfo.league.name,
                                      teamName: teamInfo.team.name
                                    })
                                  : `${teamInfo.team.name} (${tCommon('noLeagueForTeam')})`;
                                
                                return (
                                  <div key={teamInfo.team_member_id} className="p-2 border rounded-md">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {teamInfo.payment_status.paid ? (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="inline-flex items-center gap-1 text-green-600 text-sm cursor-pointer">
                                                <CheckCircle2 className="w-4 h-4" />
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">{tCommon('paid')}</TooltipContent>
                                          </Tooltip>
                                        ) : (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="inline-flex items-center gap-1 text-amber-600 text-sm cursor-pointer">
                                                <XCircle className="w-4 h-4" />
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">{tCommon('notPaid')}</TooltipContent>
                                          </Tooltip>
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <div className="text-sm font-medium truncate">
                                            {displayName}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end min-w-0 ml-2">
                                        <Switch
                                          checked={!!teamInfo.payment_status.paid}
                                          onCheckedChange={(checked) => {
                                            handleMarkPaid(
                                              player.id,
                                              teamInfo.team.id,
                                              player.id,
                                              teamInfo.team_member_id,
                                              !!teamInfo.payment_status.paid,
                                              checked
                                            );
                                          }}
                                          id={`switch-paid-${player.id}-${teamInfo.team_member_id}`}
                                          aria-label={tCommon('paid')}
                                        />
                                        {teamInfo.payment_status.paid && (
                                          <button
                                            onClick={() => {
                                              setPaymentDetails({
                                                amount: teamInfo.payment_status.paid_amount ? parseFloat(String(teamInfo.payment_status.paid_amount)) : null,
                                                date: teamInfo.payment_status.paid_at || null
                                              });
                                              setShowPaymentDetailsDialog(true);
                                            }}
                                            className="text-xs text-muted-foreground mt-1 hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
                                          >
                                            {teamInfo.payment_status.paid_amount ?? 0}€
                                            <Info className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="text-sm text-muted-foreground">
                        {t('joinedOn')}: {new Date(player.created_at).toLocaleDateString()}
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-[min(42rem,calc(100%-2rem))] p-4">
          <DialogHeader>
            <DialogTitle>{tTeams("markPaid")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              type="number"
              min={0.01}
              step="any"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              placeholder={tTeams("amountPaid")}
            />
            {paymentError && (
              <div className="text-destructive text-xs">{paymentError}</div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentDialog(false);
                setPaymentError("");
                setPaymentAmount("");
              }}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handlePaymentDialogConfirm}
              title={tTeams("markPaid")}
              aria-label={tTeams("markPaid")}
            >
              {tTeams("markPaid")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Details Dialog */}
      <Dialog open={showPaymentDetailsDialog} onOpenChange={setShowPaymentDetailsDialog}>
        <DialogContent className="max-w-[min(42rem,calc(100%-2rem))] p-4">
          <DialogHeader>
            <DialogTitle>{tTeams('paymentDetails')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {paymentDetails && (
              <>
                <div>
                  <Label className="text-sm font-medium">{tTeams('amountPaid')}</Label>
                  <p className="text-lg font-semibold mt-1">{paymentDetails.amount ?? 0}€</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{tTeams('paidDate')}</Label>
                  {paymentDetails.date ? (
                    <p className="text-base mt-1 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      {new Date(paymentDetails.date).toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">-</p>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPaymentDetailsDialog(false)}>
              {tCommon('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

