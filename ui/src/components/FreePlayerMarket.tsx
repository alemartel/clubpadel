import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/serverComm";
import { getLevelBadgeVariant } from "@/lib/badge-utils";

interface Player {
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
    claimed_level?: string;
  };
}

interface FreePlayerMarketProps {
  teamId: string;
  leagueId: string;
  level: string;
  gender: string;
  onMemberAdded?: () => void;
}

export function FreePlayerMarket({ teamId, leagueId, level, gender, onMemberAdded }: FreePlayerMarketProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingPlayer, setAddingPlayer] = useState<string | null>(null);

  useEffect(() => {
    loadPlayers();
  }, [level, gender, leagueId]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getFreePlayers(level, leagueId, gender);
      if (response.error) {
        setError(response.error);
      } else {
        setPlayers(response.players);
      }
    } catch (err) {
      setError("Failed to load available players");
      console.error("Error loading players:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (userId: string) => {
    try {
      setAddingPlayer(userId);
      setError(null);
      
      const response = await api.addTeamMember(teamId, { user_id: userId });
      if (response.error) {
        setError(response.error);
      } else {
        // Remove the player from the list and notify parent
        setPlayers(prev => prev.filter(p => p.user.id !== userId));
        onMemberAdded?.();
      }
    } catch (err) {
      setError("Failed to add player to team");
      console.error("Error adding player:", err);
    } finally {
      setAddingPlayer(null);
    }
  };

  const filteredPlayers = players.filter(player => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const name = player.user.display_name || 
                 `${player.user.first_name || ''} ${player.user.last_name || ''}`.trim() || 
                 player.user.email;
    
    return name.toLowerCase().includes(searchLower) || 
           player.user.email.toLowerCase().includes(searchLower);
  });


  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Free Player Market
        </CardTitle>
        <CardDescription>
          Available players for Level {level} • {gender}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 border border-destructive/20 bg-destructive/10 rounded-md">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading players...</p>
            </div>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchTerm ? "No players found matching your search" : "No available players"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredPlayers.map((player) => (
              <div key={player.user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {player.user.display_name || 
                     `${player.user.first_name || ''} ${player.user.last_name || ''}`.trim() || 
                     player.user.email}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {player.user.email}
                  </div>
                  {player.user.claimed_level && (
                    <Badge variant={getLevelBadgeVariant(player.user.claimed_level)} className="mt-1">
                      Level {player.user.claimed_level}
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAddPlayer(player.user.id)}
                  disabled={addingPlayer === player.user.id}
                >
                  {addingPlayer === player.user.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadPlayers}
            disabled={loading}
            className="w-full"
          >
            Refresh Players
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
