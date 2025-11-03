import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getAllPlayers,
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
import { Search, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

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

  // State for all players
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

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
              {filteredPlayers.map((player) => (
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
                  <CardFooter className="pt-0">
                    <div className="text-sm text-muted-foreground">
                      {t('joinedOn')}: {new Date(player.created_at).toLocaleDateString()}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

