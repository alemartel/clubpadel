import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getAllPlayers,
  getPlayerTeams,
  type PlayerTeamInfo,
} from "@/lib/serverComm";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, Users, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ProfilePictureModal } from "@/components/ProfilePictureModal";

interface Player {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  phone_number?: string;
  profile_picture_url?: string;
  dni?: string;
  tshirt_size?: string;
  gender?: string;
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
  const { t: tLeagues } = useTranslation('leagues');

  // State for all players
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // State for player teams
  const [playerTeamsMap, setPlayerTeamsMap] = useState<Record<string, PlayerTeamInfo[]>>({});
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
  const [teamsLoadingMap, setTeamsLoadingMap] = useState<Record<string, boolean>>({});
  
  // Player detail modal state
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showPictureModal, setShowPictureModal] = useState(false);

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
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('playerManagement')}</h1>
          <p className="text-muted-foreground">{t('manageAllPlayers')}</p>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="flex items-center gap-3 sm:gap-4 -mt-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={t('searchByNameOrEmail')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <p className="text-lg font-bold">{players.length}</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Players List */}
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
                  <Card key={player.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pt-6 pb-0 px-4">
                      <CardTitle className="text-base truncate">
                        <div 
                          className="flex items-center gap-2 flex-wrap cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedPlayer(player)}
                        >
                          <UserAvatar
                            user={{
                              photo_url: null,
                              profile_picture_url: player.profile_picture_url || null,
                              first_name: player.first_name || null,
                              last_name: player.last_name || null,
                              email: player.email,
                            }}
                            size="sm"
                          />
                          <span>{getPlayerName(player)}</span>
                          <span className="text-sm font-normal text-muted-foreground truncate">
                            ({player.email})
                          </span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2 px-4 pb-4">
                      <div className="space-y-3">
                        {/* Teams Collapsible Section */}
                        <Collapsible
                          open={isExpanded}
                          onOpenChange={() => handleToggleTeams(player.id)}
                        >
                          <div className="border-t pt-3 mt-3">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-full justify-between">
                                <span className="flex items-center gap-2">
                                  <Shield className="w-4 h-4" />
                                  <span>
                                    {tCommon('playerTeams')}
                                    {isExpanded && teamsCount > 0 && (
                                      <> ({teamsCount})</>
                                    )}
                                  </span>
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
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
                                      <div 
                                        key={teamInfo.team_member_id} 
                                        className="p-2 border rounded-md"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="min-w-0 flex-1">
                                              <div className="text-sm font-medium truncate">
                                                {displayName}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                        </div>
                      )}
                            </CollapsibleContent>
                    </div>
                        </Collapsible>
                    </div>
                    </CardContent>
                </Card>
                );
              })}
        </div>
      )}

      {/* Player Detail Modal */}
      <Dialog open={!!selectedPlayer} onOpenChange={(open) => !open && setSelectedPlayer(null)}>
        <DialogContent className="max-w-[min(42rem,calc(100%-2rem))] p-4">
          <DialogHeader>
            <DialogTitle>{tCommon('playerDetails') || "Player Details"}</DialogTitle>
          </DialogHeader>
          {selectedPlayer && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <UserAvatar
                  user={{
                    photo_url: null,
                    profile_picture_url: selectedPlayer.profile_picture_url || null,
                    first_name: selectedPlayer.first_name || null,
                    last_name: selectedPlayer.last_name || null,
                    email: selectedPlayer.email,
                  }}
                  size="lg"
                  className={selectedPlayer.profile_picture_url ? "cursor-pointer hover:opacity-80 transition-opacity" : undefined}
                  onClick={selectedPlayer.profile_picture_url ? () => setShowPictureModal(true) : undefined}
                />
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedPlayer.first_name && selectedPlayer.last_name 
                      ? `${selectedPlayer.first_name} ${selectedPlayer.last_name}`
                      : selectedPlayer.first_name || selectedPlayer.last_name || selectedPlayer.email
                    }
                  </h3>
                  <p className="text-sm text-muted-foreground">{selectedPlayer.email}</p>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                <div>
                  <Label className="text-sm font-medium">{tCommon('dni') || "DNI"}</Label>
                  <p className="text-sm mt-1">{selectedPlayer.dni || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{tCommon('tshirtSize') || "T-shirt Size"}</Label>
                  <p className="text-sm mt-1">{selectedPlayer.tshirt_size || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{tCommon('phoneNumber') || "Phone Number"}</Label>
                  <p className="text-sm mt-1">{selectedPlayer.phone_number || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{tTeams('gender') || "Gender"}</Label>
                  <p className="text-sm mt-1">
                    {selectedPlayer.gender === 'male' 
                      ? (tTeams('masculine') || "Masculine")
                      : selectedPlayer.gender === 'female'
                      ? (tTeams('femenine') || "Feminine")
                      : selectedPlayer.gender === 'mixed'
                      ? (tTeams('mixed') || "Mixed")
                      : "-"
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('joinedOn')}</Label>
                  <p className="text-sm mt-1">{new Date(selectedPlayer.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSelectedPlayer(null)}>
              {tCommon('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Picture Modal */}
      {selectedPlayer && (
        <ProfilePictureModal
          open={showPictureModal}
          onOpenChange={setShowPictureModal}
          imageUrl={selectedPlayer.profile_picture_url || null}
          firstName={selectedPlayer.first_name || null}
          lastName={selectedPlayer.last_name || null}
          email={selectedPlayer.email}
        />
      )}

    </div>
  );
}

