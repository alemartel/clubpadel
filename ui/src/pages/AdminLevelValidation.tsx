import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getAllPlayers,
  approveLevelValidation,
  rejectLevelValidation,
} from "@/lib/serverComm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Search, Users, Filter, CheckSquare, Square, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Player {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  phone_number?: string;
  role: string;
  claimed_level: string;
  level_validation_status: "pending" | "approved" | "rejected" | "none" | null;
  level_validation_notes?: string;
  level_validated_at?: string;
  level_validated_by?: string;
  created_at: string;
  updated_at: string;
}

export function AdminLevelValidation() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  // State for all players
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

  // Modal states
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/", { state: { error: "Admin access required" } });
    }
  }, [isAdmin, loading, navigate]);

  // Load all players on mount
  useEffect(() => {
    if (isAdmin) {
      loadAllPlayers();
    }
  }, [isAdmin]);

  // Filter players based on search term and status
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

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((player) => player.level_validation_status === statusFilter);
    }

    setFilteredPlayers(filtered);
  }, [players, searchTerm, statusFilter]);

  const loadAllPlayers = async () => {
    setLoadingPlayers(true);
    setError("");

    try {
      const response = await getAllPlayers();
      setPlayers(response.players);
    } catch (err: any) {
      setError(err.message || "Failed to load players");
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleApprove = async (playerId?: string) => {
    const targetPlayer = playerId ? players.find(p => p.id === playerId) : selectedPlayer;
    if (!targetPlayer) return;

    setActionLoading(true);
    try {
      // For now, we'll use the existing approveLevelValidation function
      // In a real implementation, you might want a different endpoint for direct approval
      await approveLevelValidation(targetPlayer.id, notes || undefined);
      setShowApproveModal(false);
      setSelectedPlayer(null);
      setNotes("");
      await loadAllPlayers();
    } catch (err: any) {
      setError(err.message || "Failed to approve validation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (playerId?: string) => {
    const targetPlayer = playerId ? players.find(p => p.id === playerId) : selectedPlayer;
    if (!targetPlayer || !notes.trim()) return;

    setActionLoading(true);
    try {
      await rejectLevelValidation(targetPlayer.id, notes);
      setShowRejectModal(false);
      setSelectedPlayer(null);
      setNotes("");
      await loadAllPlayers();
    } catch (err: any) {
      setError(err.message || "Failed to reject validation");
    } finally {
      setActionLoading(false);
    }
  };

  const openApproveModal = (player: Player) => {
    setSelectedPlayer(player);
    setNotes("");
    setShowApproveModal(true);
  };

  const openRejectModal = (player: Player) => {
    setSelectedPlayer(player);
    setNotes("");
    setShowRejectModal(true);
  };

  const handleSelectPlayer = (playerId: string) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPlayers.size === filteredPlayers.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(filteredPlayers.map(p => p.id)));
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "none":
        return <Badge variant="outline">No Request</Badge>;
      default:
        return <Badge variant="outline">No Request</Badge>;
    }
  };

  const getLevelBadge = (level: string) => {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700">
        Level {level}
      </Badge>
    );
  };

  const getPlayerName = (player: Player) => {
    if (player.display_name) return player.display_name;
    if (player.first_name && player.last_name) return `${player.first_name} ${player.last_name}`;
    return "Unknown Player";
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  const pendingCount = players.filter(p => p.level_validation_status === "pending").length;
  const approvedCount = players.filter(p => p.level_validation_status === "approved").length;
  const rejectedCount = players.filter(p => p.level_validation_status === "rejected").length;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Player Management</h1>
          <p className="text-muted-foreground">Manage all players and their level validation status</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {filteredPlayers.length} of {players.length} players
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Players</p>
                <p className="text-2xl font-bold">{players.length}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Players</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="null">No Request</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={loadAllPlayers} disabled={loadingPlayers}>
          <Filter className="w-4 h-4 mr-2" />
          Refresh
        </Button>
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
              <CardTitle>All Players</CardTitle>
              <CardDescription>
                Manage player level validation requests and view player information
              </CardDescription>
            </div>
            {selectedPlayers.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedPlayers.size} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedPlayers(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingPlayers ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-muted-foreground">Loading players...</span>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {searchTerm || statusFilter !== "all" ? "No matching players found" : "No players found"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search terms or filters"
                  : "No players have been registered yet"
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-6 w-6 p-0"
                    >
                      {selectedPlayers.size === filteredPlayers.length ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectPlayer(player.id)}
                        className="h-6 w-6 p-0"
                      >
                        {selectedPlayers.has(player.id) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{getPlayerName(player)}</div>
                        {player.phone_number && (
                          <div className="text-sm text-muted-foreground">{player.phone_number}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{player.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getLevelBadge(player.claimed_level)}
                        {player.level_validation_status === "approved" && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(player.level_validation_status)}</TableCell>
                    <TableCell>
                      {new Date(player.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {player.level_validation_status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openApproveModal(player)}
                              className="text-green-600 border-green-200 hover:bg-green-50"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRejectModal(player)}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {player.level_validation_status === "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openApproveModal(player)}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Level Validation</DialogTitle>
            <DialogDescription>
              Approve the level validation for {selectedPlayer && getPlayerName(selectedPlayer)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Player Details</h4>
              <p><strong>Player:</strong> {selectedPlayer && getPlayerName(selectedPlayer)}</p>
              <p><strong>Email:</strong> {selectedPlayer?.email}</p>
              <p><strong>Claimed Level:</strong> Level {selectedPlayer?.claimed_level}</p>
            </div>
            <div>
              <Label htmlFor="approve-notes">Optional Notes</Label>
              <Textarea
                id="approve-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleApprove()}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? "Approving..." : "Approve Level"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Level Validation</DialogTitle>
            <DialogDescription>
              Reject the level validation for {selectedPlayer && getPlayerName(selectedPlayer)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Player Details</h4>
              <p><strong>Player:</strong> {selectedPlayer && getPlayerName(selectedPlayer)}</p>
              <p><strong>Email:</strong> {selectedPlayer?.email}</p>
              <p><strong>Claimed Level:</strong> Level {selectedPlayer?.claimed_level}</p>
            </div>
            <div>
              <Label htmlFor="reject-notes">Rejection Reason *</Label>
              <Textarea
                id="reject-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Please provide a reason for rejecting this level request..."
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                This reason will be shown to the player
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleReject()}
              disabled={actionLoading || !notes.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? "Rejecting..." : "Reject Level"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}