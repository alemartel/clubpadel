import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  Group,
  NewGroup,
  UpdateGroup,
} from "@/lib/serverComm";
import {
  validateGroup,
  getFieldError,
  hasFieldError,
} from "@/lib/validation";
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
import { ArrowLeft, Plus, Edit, Trash2, Users, Trophy } from "lucide-react";

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
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<Group | null>(null);

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

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;

    const updateData: UpdateGroup = {};
    if (groupForm.name !== editingGroup.name) updateData.name = groupForm.name;
    if (groupForm.level !== editingGroup.level)
      updateData.level = groupForm.level;
    if (groupForm.gender !== editingGroup.gender)
      updateData.gender = groupForm.gender;

    const validation = validateGroup(groupForm);
    if (!validation.isValid) {
      setGroupErrors(validation.errors);
      return;
    }

    try {
      await api.updateGroup(editingGroup.id, updateData);
      setEditingGroup(null);
      setGroupForm({ name: "", level: "1", gender: "mixed" });
      setGroupErrors([]);
      loadGroups();
    } catch (error) {
      console.error("Failed to update group:", error);
      setGroupErrors([{ field: "general", message: "Failed to update group" }]);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteConfirmGroup) return;

    try {
      await api.deleteGroup(deleteConfirmGroup.id);
      setDeleteConfirmGroup(null);
      loadGroups();
    } catch (error) {
      console.error("Failed to delete group:", error);
    }
  };

  const startEditGroup = (group: Group) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      level: group.level,
      gender: group.gender,
    });
    setGroupErrors([]);
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/leagues")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leagues
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Groups - {leagueName}</h1>
          <p className="text-muted-foreground">Manage groups for this league</p>
        </div>
        <Button onClick={() => setShowCreateGroup(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Groups Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Groups
          </CardTitle>
          <CardDescription>Manage all groups in this league</CardDescription>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Teams</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">
                      {group.name}
                    </TableCell>
                    <TableCell>Level {group.level}</TableCell>
                    <TableCell className="capitalize">
                      {group.gender}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/leagues/${leagueId}/groups/${group.id}/teams`)}
                      >
                        <Trophy className="w-4 h-4 mr-1" />
                        Teams
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditGroup(group)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmGroup(group)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Update the group details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-group-name">Group Name</Label>
              <Input
                id="edit-group-name"
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
              <Label htmlFor="edit-group-level">Level</Label>
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
              <Label htmlFor="edit-group-gender">Gender</Label>
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
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGroup}>Update Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <Dialog
        open={!!deleteConfirmGroup}
        onOpenChange={() => setDeleteConfirmGroup(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmGroup?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmGroup(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup}>
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
