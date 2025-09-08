import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  League,
  Group,
  NewLeague,
  NewGroup,
  UpdateLeague,
  UpdateGroup,
} from "@/lib/serverComm";
import {
  validateLeague,
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
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Edit, Trash2, Calendar, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AdminLeagues() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  // State for leagues
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [leaguesError, setLeaguesError] = useState("");

  // State for groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState("");

  // Form states
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deleteConfirmLeague, setDeleteConfirmLeague] = useState<League | null>(
    null
  );
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<Group | null>(
    null
  );

  // Form data
  const [leagueForm, setLeagueForm] = useState<NewLeague>({
    name: "",
    start_date: "",
    end_date: "",
  });
  const [groupForm, setGroupForm] = useState<NewGroup>({
    name: "",
    level: "1",
    gender: "mixed",
  });

  // Validation errors
  const [leagueErrors, setLeagueErrors] = useState<any[]>([]);
  const [groupErrors, setGroupErrors] = useState<any[]>([]);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/", { state: { error: "Admin access required" } });
    }
  }, [isAdmin, loading, navigate]);

  // Load leagues on mount
  useEffect(() => {
    if (isAdmin) {
      loadLeagues();
    }
  }, [isAdmin]);

  // Load groups when league is selected
  useEffect(() => {
    if (selectedLeague) {
      loadGroups(selectedLeague.id);
    }
  }, [selectedLeague]);

  const loadLeagues = async () => {
    setLeaguesLoading(true);
    setLeaguesError("");
    try {
      const response = await api.getLeagues();
      setLeagues(response.leagues);
      if (response.leagues.length > 0 && !selectedLeague) {
        setSelectedLeague(response.leagues[0]);
      }
    } catch (error) {
      console.error("Failed to load leagues:", error);
      setLeaguesError("Failed to load leagues");
    } finally {
      setLeaguesLoading(false);
    }
  };

  const loadGroups = async (leagueId: string) => {
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

  const handleCreateLeague = async () => {
    const validation = validateLeague(leagueForm);
    if (!validation.isValid) {
      setLeagueErrors(validation.errors);
      return;
    }

    try {
      await api.createLeague(leagueForm);
      setShowCreateLeague(false);
      setLeagueForm({ name: "", start_date: "", end_date: "" });
      setLeagueErrors([]);
      loadLeagues();
    } catch (error) {
      console.error("Failed to create league:", error);
      setLeagueErrors([
        { field: "general", message: "Failed to create league" },
      ]);
    }
  };

  const handleUpdateLeague = async () => {
    if (!editingLeague) return;

    const updateData: UpdateLeague = {};
    if (leagueForm.name !== editingLeague.name)
      updateData.name = leagueForm.name;
    if (leagueForm.start_date !== editingLeague.start_date)
      updateData.start_date = leagueForm.start_date;
    if (leagueForm.end_date !== editingLeague.end_date)
      updateData.end_date = leagueForm.end_date;

    const validation = validateLeague(leagueForm);
    if (!validation.isValid) {
      setLeagueErrors(validation.errors);
      return;
    }

    try {
      await api.updateLeague(editingLeague.id, updateData);
      setEditingLeague(null);
      setLeagueForm({ name: "", start_date: "", end_date: "" });
      setLeagueErrors([]);
      loadLeagues();
    } catch (error) {
      console.error("Failed to update league:", error);
      setLeagueErrors([
        { field: "general", message: "Failed to update league" },
      ]);
    }
  };

  const handleDeleteLeague = async () => {
    if (!deleteConfirmLeague) return;

    try {
      await api.deleteLeague(deleteConfirmLeague.id);
      setDeleteConfirmLeague(null);
      if (selectedLeague?.id === deleteConfirmLeague.id) {
        setSelectedLeague(null);
        setGroups([]);
      }
      loadLeagues();
    } catch (error) {
      console.error("Failed to delete league:", error);
    }
  };

  const handleCreateGroup = async () => {
    if (!selectedLeague) return;

    const validation = validateGroup(groupForm);
    if (!validation.isValid) {
      setGroupErrors(validation.errors);
      return;
    }

    try {
      await api.createGroup(selectedLeague.id, groupForm);
      setShowCreateGroup(false);
      setGroupForm({ name: "", level: "1", gender: "mixed" });
      setGroupErrors([]);
      loadGroups(selectedLeague.id);
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
      if (selectedLeague) {
        loadGroups(selectedLeague.id);
      }
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
      if (selectedLeague) {
        loadGroups(selectedLeague.id);
      }
    } catch (error) {
      console.error("Failed to delete group:", error);
    }
  };

  const startEditLeague = (league: League) => {
    setEditingLeague(league);
    setLeagueForm({
      name: league.name,
      start_date: league.start_date,
      end_date: league.end_date,
    });
    setLeagueErrors([]);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">League Management</h1>
          <p className="text-muted-foreground">Manage leagues and groups</p>
        </div>
        <Button onClick={() => setShowCreateLeague(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create League
        </Button>
      </div>

      {/* Leagues Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Leagues
          </CardTitle>
          <CardDescription>Manage all leagues</CardDescription>
        </CardHeader>
        <CardContent>
          {leaguesLoading ? (
            <div className="text-center py-4">Loading leagues...</div>
          ) : leaguesError ? (
            <div className="text-center text-red-500 py-4">{leaguesError}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leagues.map((league) => (
                  <TableRow
                    key={league.id}
                    className={
                      selectedLeague?.id === league.id ? "bg-muted" : ""
                    }
                    onClick={() => setSelectedLeague(league)}
                  >
                    <TableCell className="font-medium">{league.name}</TableCell>
                    <TableCell>
                      {new Date(league.start_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(league.end_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditLeague(league);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmLeague(league);
                          }}
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

      {/* Groups Section */}
      {selectedLeague && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Groups - {selectedLeague.name}
              </div>
              <Button onClick={() => setShowCreateGroup(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </CardTitle>
            <CardDescription>
              Manage groups for the selected league
            </CardDescription>
          </CardHeader>
          <CardContent>
            {groupsLoading ? (
              <div className="text-center py-4">Loading groups...</div>
            ) : groupsError ? (
              <div className="text-center text-red-500 py-4">{groupsError}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Gender</TableHead>
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
      )}

      {/* Create League Dialog */}
      <Dialog open={showCreateLeague} onOpenChange={setShowCreateLeague}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New League</DialogTitle>
            <DialogDescription>
              Enter the details for the new league.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="league-name">League Name</Label>
              <Input
                id="league-name"
                value={leagueForm.name}
                onChange={(e) =>
                  setLeagueForm({ ...leagueForm, name: e.target.value })
                }
                className={
                  hasFieldError(leagueErrors, "name") ? "border-red-500" : ""
                }
              />
              {getFieldError(leagueErrors, "name") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(leagueErrors, "name")}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="league-start-date">Start Date</Label>
              <DatePicker
                value={
                  leagueForm.start_date
                    ? new Date(leagueForm.start_date)
                    : undefined
                }
                onChange={(date) =>
                  setLeagueForm((prev) => ({
                    ...prev,
                    start_date: date?.toISOString() || "",
                  }))
                }
                placeholder="Select start date"
                className={
                  hasFieldError(leagueErrors, "start_date")
                    ? "border-red-500"
                    : ""
                }
              />
              {getFieldError(leagueErrors, "start_date") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(leagueErrors, "start_date")}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="league-end-date">End Date</Label>
              <DatePicker
                value={
                  leagueForm.end_date
                    ? new Date(leagueForm.end_date)
                    : undefined
                }
                onChange={(date) =>
                  setLeagueForm((prev) => ({
                    ...prev,
                    end_date: date?.toISOString() || "",
                  }))
                }
                placeholder="Select end date"
                className={
                  hasFieldError(leagueErrors, "end_date")
                    ? "border-red-500"
                    : ""
                }
              />
              {getFieldError(leagueErrors, "end_date") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(leagueErrors, "end_date")}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateLeague(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateLeague}>Create League</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit League Dialog */}
      <Dialog
        open={!!editingLeague}
        onOpenChange={() => setEditingLeague(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit League</DialogTitle>
            <DialogDescription>Update the league details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-league-name">League Name</Label>
              <Input
                id="edit-league-name"
                value={leagueForm.name}
                onChange={(e) =>
                  setLeagueForm({ ...leagueForm, name: e.target.value })
                }
                className={
                  hasFieldError(leagueErrors, "name") ? "border-red-500" : ""
                }
              />
              {getFieldError(leagueErrors, "name") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(leagueErrors, "name")}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-league-start-date">Start Date</Label>
              <DatePicker
                value={
                  leagueForm.start_date
                    ? new Date(leagueForm.start_date)
                    : undefined
                }
                onChange={(date) =>
                  setLeagueForm({
                    ...leagueForm,
                    start_date: date?.toISOString() || "",
                  })
                }
                placeholder="Select start date"
                className={
                  hasFieldError(leagueErrors, "start_date")
                    ? "border-red-500"
                    : ""
                }
              />
              {getFieldError(leagueErrors, "start_date") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(leagueErrors, "start_date")}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-league-end-date">End Date</Label>
              <DatePicker
                value={
                  leagueForm.end_date
                    ? new Date(leagueForm.end_date)
                    : undefined
                }
                onChange={(date) =>
                  setLeagueForm({
                    ...leagueForm,
                    end_date: date?.toISOString() || "",
                  })
                }
                placeholder="Select end date"
                className={
                  hasFieldError(leagueErrors, "end_date")
                    ? "border-red-500"
                    : ""
                }
              />
              {getFieldError(leagueErrors, "end_date") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(leagueErrors, "end_date")}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLeague(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateLeague}>Update League</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Enter the details for the new group in {selectedLeague?.name}.
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

      {/* Delete League Confirmation */}
      <Dialog
        open={!!deleteConfirmLeague}
        onOpenChange={() => setDeleteConfirmLeague(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete League</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmLeague?.name}"?
              This will also delete all groups in this league. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmLeague(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLeague}>
              Delete League
            </Button>
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
