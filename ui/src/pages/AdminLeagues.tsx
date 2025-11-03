import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  League,
  NewLeague,
  UpdateLeague,
} from "@/lib/serverComm";
import {
  validateLeague,
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
  CardFooter,
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
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Edit, Trash2, Calendar, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

export function AdminLeagues() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('leagues');
  const { t: tCommon } = useTranslation('common');

  // State for leagues
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [leaguesError, setLeaguesError] = useState("");

  // Form states
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [deleteConfirmLeague, setDeleteConfirmLeague] = useState<League | null>(
    null
  );

  // Form data
  const [leagueForm, setLeagueForm] = useState<NewLeague>({
    name: "",
    start_date: "",
    end_date: "",
  });

  // Validation errors
  const [leagueErrors, setLeagueErrors] = useState<any[]>([]);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/", { state: { error: t('adminAccessRequired') } });
    }
  }, [isAdmin, loading, navigate]);

  // Load leagues on mount
  useEffect(() => {
    if (isAdmin) {
      loadLeagues();
    }
  }, [isAdmin]);

  const loadLeagues = async () => {
    setLeaguesLoading(true);
    setLeaguesError("");
    try {
      const response = await api.getLeagues();
      setLeagues(response.leagues);
    } catch (error) {
      console.error("Failed to load leagues:", error);
      setLeaguesError(t('failedToLoadLeagues'));
    } finally {
      setLeaguesLoading(false);
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
        { field: "general", message: t('failedToCreateLeague') },
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
        { field: "general", message: t('failedToUpdateLeague') },
      ]);
    }
  };

  const handleDeleteLeague = async () => {
    if (!deleteConfirmLeague) return;

    try {
      await api.deleteLeague(deleteConfirmLeague.id);
      setDeleteConfirmLeague(null);
      loadLeagues();
    } catch (error) {
      console.error("Failed to delete league:", error);
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
          <h1 className="text-2xl sm:text-3xl font-bold">{t('leagueManagement')}</h1>
          <p className="text-muted-foreground">{t('manageLeaguesAndGroups')}</p>
        </div>
        <Button onClick={() => setShowCreateLeague(true)}>
          <Plus className="w-4 h-4 mr-2" />
{t('createLeague')}
        </Button>
      </div>

      {/* Leagues Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg sm:text-xl">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
{t('leagues')}
          </CardTitle>
          <CardDescription>{t('manageAllLeagues')}</CardDescription>
        </CardHeader>
        <CardContent>
          {leaguesLoading ? (
            <div className="text-center py-4">{t('loadingLeagues')}</div>
          ) : leaguesError ? (
            <div className="text-center text-red-500 py-4">{leaguesError}</div>
          ) : leagues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('noLeaguesFound')}</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {leagues.map((league) => (
                <Card key={league.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">{league.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(league.start_date).toLocaleDateString()} - {new Date(league.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/teams`)}
                      className="flex-1 min-h-[44px]"
                    >
                      <Users className="w-4 h-4 mr-1 hidden sm:block" />
                      <span className="sm:hidden">{t('groups')}</span>
                      <span className="hidden sm:inline">{t('groups')}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditLeague(league)}
                      className="min-h-[44px] min-w-[44px]"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmLeague(league)}
                      className="min-h-[44px] min-w-[44px]"
                      disabled
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Create League Dialog */}
      <Dialog open={showCreateLeague} onOpenChange={setShowCreateLeague}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createNewLeague')}</DialogTitle>
            <DialogDescription>
              {t('enterLeagueDetails')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="league-name">{t('leagueName')}</Label>
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
              <Label htmlFor="league-start-date">{t('startDate')}</Label>
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
                placeholder={t('selectStartDate')}
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
              <Label htmlFor="league-end-date">{t('endDate')}</Label>
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
                placeholder={t('selectEndDate')}
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
{tCommon('cancel')}
            </Button>
            <Button onClick={handleCreateLeague}>{t('createLeague')}</Button>
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
            <DialogTitle>{t('editLeague')}</DialogTitle>
            <DialogDescription>{t('updateLeagueDetails')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-league-name">{t('leagueName')}</Label>
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
              <Label htmlFor="edit-league-start-date">{t('startDate')}</Label>
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
                placeholder={t('selectStartDate')}
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
              <Label htmlFor="edit-league-end-date">{t('endDate')}</Label>
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
                placeholder={t('selectEndDate')}
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
{tCommon('cancel')}
            </Button>
            <Button onClick={handleUpdateLeague}>{t('updateLeague')}</Button>
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
            <DialogTitle>{t('deleteLeague')}</DialogTitle>
            <DialogDescription>
              {t('deleteLeagueConfirm', { name: deleteConfirmLeague?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmLeague(null)}
            >
{tCommon('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteLeague}>
              {t('deleteLeague')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
