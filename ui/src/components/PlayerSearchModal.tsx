import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/serverComm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Player {
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
  };
}

interface PlayerSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  leagueId: string | null;
  level?: string;
  gender: string;
  onMemberAdded?: () => void;
}

export function PlayerSearchModal({ 
  open, 
  onOpenChange, 
  teamId, 
  leagueId,
  level, 
  gender, 
  onMemberAdded 
}: PlayerSearchModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open) {
      loadPlayers();
    }
  }, [open, level, gender, leagueId]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.searchPlayers(level, leagueId || null, gender);
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
      setError(null);
      
      const response = await api.addTeamMember(teamId, { user_id: userId });
      if (response.error) {
        setError(response.error);
      } else {
        // Remove the player from the list and notify parent
        setPlayers(prev => prev.filter(p => p.user.id !== userId));
        onMemberAdded?.();
        // Close the modal after successfully adding a player
        onOpenChange(false);
      }
    } catch (err) {
      setError("Failed to add player to team");
      console.error("Error adding player:", err);
    }
  };

  const filteredPlayers = players.filter(player => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const firstName = (player.user.first_name || '').toLowerCase();
    const lastName = (player.user.last_name || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();
    
    return firstName.includes(searchLower) || 
           lastName.includes(searchLower) ||
           fullName.includes(searchLower);
  });


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Player Search
          </DialogTitle>
          <DialogDescription className="text-left">
            Search players by first or last name to add to your team
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {error && (
            <div className="p-3 border border-destructive/20 bg-destructive/10 rounded-md">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by first or last name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
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
                  {searchTerm ? "No players found matching your search" : "No available players found"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
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
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddPlayer(player.user.id)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

