import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/serverComm";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar, Users, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

type EventStatus = null | "participant_without_team" | "participant_in_team";

interface ProtectedEvent {
  id: string;
  name: string;
  tipo_evento: string;
  start_date: string;
  description?: string | null;
  created_at: string;
  signup_open?: boolean;
  current_user_status: EventStatus;
  team_name?: string;
}

interface PlayerOption {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

export function Events() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation("events");
  const { t: tCommon } = useTranslation("common");

  const [events, setEvents] = useState<ProtectedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinIndividualEventId, setJoinIndividualEventId] = useState<string | null>(null);
  const [confirmJoinIndividualEventId, setConfirmJoinIndividualEventId] = useState<string | null>(null);
  const [teamModalEventId, setTeamModalEventId] = useState<string | null>(null);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerResults, setPartnerResults] = useState<PlayerOption[]>([]);
  const [partnerSearchLoading, setPartnerSearchLoading] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [joinTeamSubmitting, setJoinTeamSubmitting] = useState(false);
  const [confirmLeaveEventId, setConfirmLeaveEventId] = useState<string | null>(null);
  const [leaveEventId, setLeaveEventId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  useEffect(() => {
    if (!teamModalEventId || partnerSearch.trim().length < 3) {
      setPartnerResults([]);
      return;
    }
    setPartnerSearchLoading(true);
    api
      .searchPlayersByName(partnerSearch.trim())
      .then((res: { players?: PlayerOption[] }) => {
        setPartnerResults(res.players || []);
      })
      .catch(() => {
        setPartnerResults([]);
      })
      .finally(() => {
        setPartnerSearchLoading(false);
      });
  }, [teamModalEventId, partnerSearch]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await api.getProtectedEvents();
      setEvents(res.events || []);
    } catch (e) {
      toast.error(tCommon("error") || "Error");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinIndividual = async (eventId: string) => {
    setJoinIndividualEventId(eventId);
    try {
      const res = await api.joinEvent(eventId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(t("joinedEvent"));
        setConfirmJoinIndividualEventId(null);
        loadEvents();
      }
    } catch (e) {
      toast.error(tCommon("error") || "Error");
    } finally {
      setJoinIndividualEventId(null);
      setConfirmJoinIndividualEventId(null);
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    setConfirmLeaveEventId(null);
    setLeaveEventId(eventId);
    try {
      const res = await api.leaveEvent(eventId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(t("registrationCancelled"));
        loadEvents();
      }
    } catch (e) {
      toast.error(tCommon("error") || "Error");
    } finally {
      setLeaveEventId(null);
    }
  };

  const handleOpenTeamModal = (eventId: string) => {
    setTeamModalEventId(eventId);
    setPartnerSearch("");
    setPartnerResults([]);
    setSelectedPartnerId(null);
    setTeamName("");
  };

  const handleJoinAsTeam = async () => {
    const eventId = teamModalEventId;
    if (!eventId || !selectedPartnerId || !teamName.trim()) {
      if (!teamName.trim()) toast.error(t("teamNameRequired"));
      return;
    }
    setJoinTeamSubmitting(true);
    try {
      const res = await api.joinEventAsTeam(eventId, {
        partner_user_id: selectedPartnerId,
        team_name: teamName.trim(),
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(t("joinedEventAsTeam"));
        setTeamModalEventId(null);
        loadEvents();
      }
    } catch (e) {
      toast.error(tCommon("error") || "Error");
    } finally {
      setJoinTeamSubmitting(false);
    }
  };

  const getPartnerDisplayName = (p: PlayerOption) => {
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
    return name || p.email || p.id;
  };

  if (authLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">{t("availableEvents")}</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("noEventsFound")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <Card key={ev.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{ev.name}</CardTitle>
                {ev.start_date && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {ev.start_date}
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                {ev.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{ev.description}</p>
                )}
                {ev.current_user_status === null && (
                  <div className="flex flex-wrap gap-2 mt-auto pt-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmJoinIndividualEventId(ev.id)}
                        disabled={joinIndividualEventId !== null}
                      >
                      {joinIndividualEventId === ev.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        t("joinIndividual")
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenTeamModal(ev.id)}
                    >
                      {t("joinAsTeam")}
                    </Button>
                  </div>
                )}
                {(ev.current_user_status === "participant_without_team" || ev.current_user_status === "participant_in_team") && (
                  <div className="mt-auto pt-2 flex flex-col gap-2">
                    {ev.current_user_status === "participant_without_team" && (
                      <p className="text-sm text-muted-foreground">{t("waitingForTeam")}</p>
                    )}
                    {ev.current_user_status === "participant_in_team" && ev.team_name && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {t("enrolledInTeam")} {ev.team_name}
                      </p>
                    )}
                    {ev.signup_open && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmLeaveEventId(ev.id)}
                        disabled={leaveEventId !== null}
                      >
                        {leaveEventId === ev.id ? <Loader2 className="w-4 h-4 animate-spin" /> : t("cancelRegistration")}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!confirmJoinIndividualEventId}
        onOpenChange={(open) => !open && setConfirmJoinIndividualEventId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("confirmJoinWithoutTeam")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("confirmJoinWithoutTeamMessage")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmJoinIndividualEventId(null)}>
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={() => confirmJoinIndividualEventId && handleJoinIndividual(confirmJoinIndividualEventId)}
              disabled={joinIndividualEventId !== null}
            >
              {joinIndividualEventId === confirmJoinIndividualEventId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("joinIndividual")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmLeaveEventId}
        onOpenChange={(open) => !open && setConfirmLeaveEventId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("cancelRegistration")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("confirmCancelRegistration")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLeaveEventId(null)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmLeaveEventId && handleLeaveEvent(confirmLeaveEventId)}
              disabled={leaveEventId !== null}
            >
              {leaveEventId === confirmLeaveEventId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("cancelRegistration")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!teamModalEventId} onOpenChange={(open) => !open && setTeamModalEventId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("joinAsTeam")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("searchPartner")}</label>
              <Input
                value={partnerSearch}
                onChange={(e) => {
                  setPartnerSearch(e.target.value);
                  setSelectedPartnerId(null);
                }}
                placeholder={t("searchPartnerPlaceholder")}
                className="mt-1"
              />
            </div>
            {partnerSearch.trim().length >= 3 && (
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {partnerSearchLoading ? (
                  <div className="p-4 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : partnerResults.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    {t("noMatchingPlayers") || "No matching players"}
                  </p>
                ) : (
                  partnerResults.map((p) => {
                    const isSelected = selectedPartnerId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? "bg-primary/10 border-l-4 border-l-primary"
                            : "hover:bg-muted border-l-4 border-l-transparent"
                        }`}
                        onClick={() => setSelectedPartnerId(isSelected ? null : p.id)}
                      >
                        <span className="min-w-0 truncate">{getPartnerDisplayName(p)}</span>
                        {isSelected && (
                          <span className="flex items-center gap-1 shrink-0 text-primary text-sm font-medium">
                            <Check className="w-4 h-4" />
                            {t("selected")}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
            <div>
              <label className="text-sm font-medium">{t("teamName")}</label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder={t("teamNamePlaceholder")}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamModalEventId(null)}>
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleJoinAsTeam}
              disabled={joinTeamSubmitting || !selectedPartnerId || !teamName.trim()}
            >
              {joinTeamSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {tCommon("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
