import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  Group,
  NewGroup,
} from "@/lib/serverComm";
import {
  validateGroup,
  getFieldError,
  hasFieldError,
} from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ArrowLeft, Plus, Users, Trophy } from "lucide-react";
import { getLevelBadgeVariant, getGenderBadgeVariant } from "@/lib/badge-utils";

export function AdminGroups() {
  const { isAdmin, loading } = useAuth();
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();

  // State for groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState("");
  const [leagueName, setLeagueName] = useState("");

  // Form states
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Form data
  const [groupForm, setGroupForm] = useState<NewGroup>({
    name: "",
    level: "1",
    gender: "mixed",
  });

  // Validation errors
  const [groupErrors, setGroupErrors] = useState<any[]>([]);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/", { state: { error: "Admin access required" } });
    }
  }, [isAdmin, loading, navigate]);

  // Load groups and league info on mount
  useEffect(() => {
    if (isAdmin && leagueId) {
      loadGroups();
      loadLeagueInfo();
    }
  }, [isAdmin, leagueId]);

  const loadGroups = async () => {
    if (!leagueId) return;
    
    setGroupsLoading(true);
    setGroupsError("");
    try {
      const response = await api.getGroups(leagueId);
      setGroups(response.groups);
    } catch (error) {
      console.error("Failed to load groups:", error);
      setGroupsError("Failed to load groups");
    } finally {
      setGroupsLoading(false);
    }
  };

  const loadLeagueInfo = async () => {
    if (!leagueId) return;
    
    try {
      const response = await api.getLeagues();
      const league = response.leagues.find((l: any) => l.id === leagueId);
      if (league) {
        setLeagueName(league.name);
      }
    } catch (error) {
      console.error("Failed to load league info:", error);
    }
  };

  const handleCreateGroup = async () => {
    if (!leagueId) return;

    const validation = validateGroup(groupForm);
    if (!validation.isValid) {
      setGroupErrors(validation.errors);
      return;
    }

    try {
      await api.createGroup(leagueId, groupForm);
      setShowCreateGroup(false);
      setGroupForm({ name: "", level: "1", gender: "mixed" });
      setGroupErrors([]);
      loadGroups();
    } catch (error) {
      console.error("Failed to create group:", error);
      setGroupErrors([{ field: "general", message: "Failed to create group" }]);
    }
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

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/leagues")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Leagues</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                <span className="hidden sm:inline">Groups - {leagueName}</span>
                <span className="sm:hidden">Groups</span>
              </h1>
              <p className="text-muted-foreground">
                <span className="hidden sm:inline">Manage groups for this league</span>
                <span className="sm:hidden">{leagueName}</span>
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateGroup(true)}>
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Create Group</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </div>

      {/* Groups Section */}
      <Card>
        <CardHeader>
          <CardDescription className="text-sm sm:text-base">Manage all groups in this league</CardDescription>
        </CardHeader>
        <CardContent>
          {groupsLoading ? (
            <div className="text-center py-4">Loading groups...</div>
          ) : groupsError ? (
            <div className="text-center text-red-500 py-4">{groupsError}</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No groups created yet</p>
              <p className="text-sm">Create your first group to get started</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Card 
                  key={group.id} 
                  className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => navigate(`/admin/leagues/${leagueId}/groups/${group.id}/teams`)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl flex items-center justify-between">
                      {group.name}
                      <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge variant={getLevelBadgeVariant(group.level)}>
                        Level {group.level}
                      </Badge>
                      <Badge variant={getGenderBadgeVariant(group.gender)}>
                        {group.gender}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Enter the details for the new group in {leagueName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={groupForm.name}
                onChange={(e) =>
                  setGroupForm({ ...groupForm, name: e.target.value })
                }
                className={
                  hasFieldError(groupErrors, "name") ? "border-red-500" : ""
                }
              />
              {getFieldError(groupErrors, "name") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(groupErrors, "name")}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="group-level">Level</Label>
              <Select
                value={groupForm.level}
                onValueChange={(value) =>
                  setGroupForm({
                    ...groupForm,
                    level: value as "1" | "2" | "3" | "4",
                  })
                }
              >
                <SelectTrigger
                  className={
                    hasFieldError(groupErrors, "level") ? "border-red-500" : ""
                  }
                >
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1</SelectItem>
                  <SelectItem value="2">Level 2</SelectItem>
                  <SelectItem value="3">Level 3</SelectItem>
                  <SelectItem value="4">Level 4</SelectItem>
                </SelectContent>
              </Select>
              {getFieldError(groupErrors, "level") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(groupErrors, "level")}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="group-gender">Gender</Label>
              <Select
                value={groupForm.gender}
                onValueChange={(value) =>
                  setGroupForm({
                    ...groupForm,
                    gender: value as "male" | "female" | "mixed",
                  })
                }
              >
                <SelectTrigger
                  className={
                    hasFieldError(groupErrors, "gender") ? "border-red-500" : ""
                  }
                >
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
              {getFieldError(groupErrors, "gender") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(groupErrors, "gender")}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateGroup(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup}>Create Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
