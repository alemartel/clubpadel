import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Plus,
  ArrowLeft,
  Users,
  Loader2,
  Trash2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

const VALID_TEAM_COUNTS = [6, 8, 10, 12, 14];

interface EventListItem {
  id: string;
  name: string;
  tipo_evento: string;
  start_date: string;
  description?: string | null;
  created_at: string;
  team_count: number;
  match_count: number;
}

interface EventTeam {
  id: string;
  event_id: string;
  name: string;
  members: { user_id: string; first_name?: string; last_name?: string; email?: string }[];
}

interface EventMatch {
  id: string;
  event_id: string;
  round_number: number;
  home_team_id: string;
  away_team_id: string;
  resultado_local: number | null;
  resultado_visitante: number | null;
}

interface ClassificationRow {
  team_id: string;
  team_name: string;
  PJ: number;
  PG: number;
  PP: number;
  PF: number;
  PC: number;
  DIF: number;
  PTS: number;
}

interface Player {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export function AdminEvents() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const { t } = useTranslation("events");
  const { t: tNav } = useTranslation("navigation");
  const { t: tCommon } = useTranslation("common");

  const [events, setEvents] = useState<EventListItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventDetail, setEventDetail] = useState<{
    event: { id: string; name: string };
    participants: { user_id: string; first_name?: string; last_name?: string; email?: string }[];
    participantsWithoutTeam: { user_id: string; first_name?: string; last_name?: string; email?: string }[];
    teams: EventTeam[];
    matches: EventMatch[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [classifications, setClassifications] = useState<ClassificationRow[]>([]);
  const [classificationsLoading, setClassificationsLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createStartDate, setCreateStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [createDescription, setCreateDescription] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [addParticipantSearch, setAddParticipantSearch] = useState("");
  const [allPlayersForParticipant, setAllPlayersForParticipant] = useState<Player[]>([]);
  const [allPlayersLoading, setAllPlayersLoading] = useState(false);
  const [addingParticipantId, setAddingParticipantId] = useState<string | null>(null);
  const fetchedForParticipantOpenRef = useRef(false);

  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [addTeamName, setAddTeamName] = useState("");
  const [addTeamPlayer1, setAddTeamPlayer1] = useState<string | null>(null);
  const [addTeamPlayer2, setAddTeamPlayer2] = useState<string | null>(null);
  const [addTeamSubmitting, setAddTeamSubmitting] = useState(false);

  const [generateMatchesSubmitting, setGenerateMatchesSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [matchResultSaving, setMatchResultSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/inplay", { state: { error: tNav("adminAccessRequired") } });
    }
  }, [authLoading, isAdmin, navigate, tNav]);

  useEffect(() => {
    if (isAdmin && !eventId) {
      loadEvents();
    }
  }, [isAdmin, eventId]);

  useEffect(() => {
    if (isAdmin && eventId) {
      loadEventDetail();
    }
  }, [isAdmin, eventId]);

  useEffect(() => {
    if (eventId && eventDetail?.matches?.length) {
      loadClassifications();
    } else {
      setClassifications([]);
    }
  }, [eventId, eventDetail?.matches?.length]);

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const res = await api.getEvents();
      setEvents(res.events || []);
    } catch (e) {
      toast.error("Failed to load events");
    } finally {
      setEventsLoading(false);
    }
  };

  const loadEventDetail = async () => {
    if (!eventId) return;
    setDetailLoading(true);
    try {
      const res = await api.getEvent(eventId);
      setEventDetail({
        event: res.event,
        participants: res.participants || [],
        participantsWithoutTeam: res.participantsWithoutTeam || [],
        teams: res.teams || [],
        matches: res.matches || [],
      });
    } catch (e) {
      toast.error("Failed to load event");
      setEventDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const loadClassifications = async () => {
    if (!eventId) return;
    setClassificationsLoading(true);
    try {
      const res = await api.getEventClassifications(eventId);
      setClassifications(res.classifications || []);
    } catch (e) {
      setClassifications([]);
    } finally {
      setClassificationsLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    const name = createName.trim();
    if (!name) return;
    if (!createStartDate) {
      toast.error(t("startDateRequired") || "Start date is required");
      return;
    }
    setCreateSubmitting(true);
    try {
      const res = await api.createEvent(
        name,
        createStartDate,
        createDescription.trim() || undefined
      );
      if (res.event?.id) {
        toast.success(t("eventCreated"));
        setCreateOpen(false);
        setCreateName("");
        setCreateStartDate(new Date().toISOString().slice(0, 10));
        setCreateDescription("");
        navigate(`/admin/events/${res.event.id}`);
      } else {
        toast.error(res.error || "Failed to create event");
      }
    } catch (e) {
      toast.error("Failed to create event");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleAddParticipantOpen = () => {
    setAddParticipantSearch("");
    setAllPlayersForParticipant([]);
    fetchedForParticipantOpenRef.current = false;
    setAddParticipantOpen(true);
  };

  // Load players when user has typed at least 3 characters (once per modal open)
  useEffect(() => {
    if (!addParticipantOpen || !eventId) return;
    const q = addParticipantSearch.trim();
    if (q.length < 3) return;
    if (fetchedForParticipantOpenRef.current) return;
    fetchedForParticipantOpenRef.current = true;
    setAllPlayersLoading(true);
    api
      .getAllPlayers()
      .then((res) => setAllPlayersForParticipant(res.players || []))
      .finally(() => setAllPlayersLoading(false));
  }, [addParticipantOpen, eventId, addParticipantSearch]);

  const handleAddParticipantForPlayer = async (playerId: string) => {
    if (!eventId) return;
    setAddingParticipantId(playerId);
    try {
      const res = await api.addEventParticipant(eventId, playerId);
      if (!res.error) {
        toast.success(t("playerAddedToEvent"));
        loadEventDetail();
        setAddParticipantSearch("");
        setAllPlayersForParticipant([]);
        fetchedForParticipantOpenRef.current = false;
      } else {
        toast.error(res.error);
      }
    } catch (e) {
      toast.error("Failed to add player");
    } finally {
      setAddingParticipantId(null);
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!eventId) return;
    try {
      const res = await api.removeEventParticipant(eventId, userId);
      if (!res.error) loadEventDetail();
      else toast.error(res.error);
    } catch (e) {
      toast.error("Failed to remove player");
    }
  };

  const handleAddTeamOpen = () => {
    setAddTeamName("");
    setAddTeamPlayer1(null);
    setAddTeamPlayer2(null);
    setAddTeamOpen(true);
  };

  const handleAddTeam = async () => {
    const name = addTeamName.trim();
    if (!name || !addTeamPlayer1 || !addTeamPlayer2 || addTeamPlayer1 === addTeamPlayer2) {
      toast.error(t("teamMustHaveTwoPlayers"));
      return;
    }
    if (!eventId) return;
    setAddTeamSubmitting(true);
    try {
      const res = await api.addEventTeam(eventId, {
        name,
        user_ids: [addTeamPlayer1, addTeamPlayer2],
      });
      if (res.team) {
        toast.success("Team added");
        setAddTeamOpen(false);
        loadEventDetail();
      } else {
        toast.error(res.error || "Failed to add team");
      }
    } catch (e) {
      toast.error("Failed to add team");
    } finally {
      setAddTeamSubmitting(false);
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!eventId) return;
    try {
      const res = await api.removeEventTeam(eventId, teamId);
      if (!res.error) {
        loadEventDetail();
      } else {
        toast.error(res.error);
      }
    } catch (e) {
      toast.error("Failed to remove team");
    }
  };

  const handleGenerateMatches = async () => {
    if (!eventId) return;
    setGenerateMatchesSubmitting(true);
    try {
      const res = await api.generateEventMatches(eventId);
      if (res.matches) {
        toast.success(t("matchesGenerated"));
        loadEventDetail();
      } else {
        toast.error(res.error || t("teamCountMustBe"));
      }
    } catch (e) {
      toast.error("Failed to generate matches");
    } finally {
      setGenerateMatchesSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventId) return;
    try {
      await api.deleteEvent(eventId);
      toast.success(t("eventDeleted"));
      setDeleteConfirmOpen(false);
      navigate("/admin/events");
      loadEvents();
    } catch (e) {
      toast.error("Failed to delete event");
    }
  };

  const handleMatchResultChange = async (
    matchId: string,
    resultado_local: number | null,
    resultado_visitante: number | null
  ) => {
    if (!eventId) return;
    setMatchResultSaving(matchId);
    try {
      await api.updateEventMatchResult(eventId, matchId, {
        resultado_local: resultado_local === null ? null : resultado_local,
        resultado_visitante: resultado_visitante === null ? null : resultado_visitante,
      });
      loadEventDetail();
      loadClassifications();
    } catch (e) {
      toast.error("Failed to update result");
    } finally {
      setMatchResultSaving(null);
    }
  };

  const teamCount = eventDetail?.teams?.length ?? 0;
  const canGenerateMatches = VALID_TEAM_COUNTS.includes(teamCount) && (eventDetail?.matches?.length ?? 0) === 0;

  const getTeamName = (teamId: string) =>
    eventDetail?.teams?.find((t) => t.id === teamId)?.name ?? teamId;

  if (!isAdmin) return null;

  if (!eventId) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("eventManagement")}</h1>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("createEvent")}
          </Button>
        </div>

        {eventsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t("noEventsFound")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => (
              <Card
                key={ev.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/admin/events/${ev.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{ev.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {ev.start_date && (
                    <div className="text-sm text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {ev.start_date}
                    </div>
                  )}
                  {ev.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {ev.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{ev.team_count} {t("teams")}</span>
                    <span>{ev.match_count} {t("matches")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("createEvent")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t("eventName")}</label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder={t("eventNamePlaceholder")}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("startDate")}</label>
                <Input
                  type="date"
                  value={createStartDate}
                  onChange={(e) => setCreateStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("description")}</label>
                <Input
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleCreateEvent} disabled={createSubmitting || !createName.trim() || !createStartDate}>
                {createSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {tCommon("create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/events")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {detailLoading ? t("loadingEvents") : eventDetail?.event?.name ?? eventId}
          </h1>
          {eventDetail?.event && (
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {"start_date" in eventDetail.event && eventDetail.event.start_date != null && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {(eventDetail.event as { start_date: string }).start_date}
                </span>
              )}
              {"description" in eventDetail.event && eventDetail.event.description != null && eventDetail.event.description !== "" && (
                <span className="line-clamp-1">
                  {(eventDetail.event as { description: string }).description}
                </span>
              )}
            </div>
          )}
        </div>
        <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
          <Trash2 className="w-4 h-4 mr-2" />
          {tCommon("delete")}
        </Button>
      </div>

      {detailLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("eventPlayers")} ({eventDetail?.participants?.length ?? 0})</CardTitle>
              <Button onClick={handleAddParticipantOpen} disabled={(eventDetail?.matches?.length ?? 0) > 0}>
                <Plus className="w-4 h-4 mr-2" />
                {t("addPlayer")}
              </Button>
            </CardHeader>
            <CardContent>
              {!eventDetail?.participants?.length ? (
                <p className="text-sm text-muted-foreground">{t("addPlayersFirst")}</p>
              ) : (
                <ul className="space-y-2">
                  {eventDetail.participants.map((p) => (
                    <li
                      key={p.user_id}
                      className="flex items-center justify-between border rounded-md px-3 py-2"
                    >
                      <span>
                        {[p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || p.user_id}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveParticipant(p.user_id)}
                        disabled={(eventDetail?.matches?.length ?? 0) > 0}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("teams")} ({teamCount})</CardTitle>
              <Button onClick={handleAddTeamOpen} disabled={(eventDetail?.matches?.length ?? 0) > 0}>
                <Plus className="w-4 h-4 mr-2" />
                {t("addTeam")}
              </Button>
            </CardHeader>
            <CardContent>
              {eventDetail?.teams?.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("addTeamsFromPlayers")}</p>
              ) : (
                <ul className="space-y-2">
                  {eventDetail?.teams?.map((team) => (
                    <li
                      key={team.id}
                      className="flex items-center justify-between border rounded-md px-3 py-2"
                    >
                      <div>
                        <span className="font-medium">{team.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {team.members
                            ?.map((m) => [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email)
                            .join(" / ")}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTeam(team.id)}
                        disabled={(eventDetail?.matches?.length ?? 0) > 0}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {canGenerateMatches && (
                <div className="mt-4">
                  <Button
                    onClick={handleGenerateMatches}
                    disabled={generateMatchesSubmitting}
                  >
                    {generateMatchesSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {t("generateMatches")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {(eventDetail?.matches?.length ?? 0) > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t("matches")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.from(
                    new Set(eventDetail?.matches?.map((m) => m.round_number) ?? [])
                  )
                    .sort((a, b) => a - b)
                    .map((roundNum) => (
                      <div key={roundNum} className="mb-6">
                        <h3 className="font-medium mb-2">
                          {t("round")} {roundNum}
                        </h3>
                        <div className="space-y-2">
                          {eventDetail?.matches
                            ?.filter((m) => m.round_number === roundNum)
                            .map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center gap-4 flex-wrap border rounded-md p-3"
                              >
                                <span className="min-w-[120px]">{getTeamName(m.home_team_id)}</span>
                                <Input
                                  type="number"
                                  min={0}
                                  className="w-16 text-center"
                                  defaultValue={m.resultado_local ?? ""}
                                  key={`${m.id}-local-${m.resultado_local ?? ""}`}
                                  onBlur={(e) => {
                                    const v = e.target.value;
                                    const num = v === "" ? null : parseInt(v, 10);
                                    if (v === "" || num == null) {
                                      handleMatchResultChange(m.id, null, m.resultado_visitante);
                                    } else if (!Number.isNaN(num) && num >= 0) {
                                      handleMatchResultChange(m.id, num, m.resultado_visitante);
                                    }
                                  }}
                                  disabled={matchResultSaving === m.id}
                                />
                                <span className="text-muted-foreground">-</span>
                                <Input
                                  type="number"
                                  min={0}
                                  className="w-16 text-center"
                                  defaultValue={m.resultado_visitante ?? ""}
                                  key={`${m.id}-away-${m.resultado_visitante ?? ""}`}
                                  onBlur={(e) => {
                                    const v = e.target.value;
                                    const num = v === "" ? null : parseInt(v, 10);
                                    if (v === "" || num == null) {
                                      handleMatchResultChange(m.id, m.resultado_local, null);
                                    } else if (!Number.isNaN(num) && num >= 0) {
                                      handleMatchResultChange(m.id, m.resultado_local, num);
                                    }
                                  }}
                                  disabled={matchResultSaving === m.id}
                                />
                                <span className="min-w-[120px]">{getTeamName(m.away_team_id)}</span>
                                {matchResultSaving === m.id && (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("classification")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {classificationsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("position")}</TableHead>
                          <TableHead>{t("team")}</TableHead>
                          <TableHead>{t("PJ")}</TableHead>
                          <TableHead>{t("PG")}</TableHead>
                          <TableHead>{t("PP")}</TableHead>
                          <TableHead>{t("PF")}</TableHead>
                          <TableHead>{t("PC")}</TableHead>
                          <TableHead>{t("DIF")}</TableHead>
                          <TableHead>{t("PTS")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classifications.map((row, idx) => (
                          <TableRow key={row.team_id}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell className="font-medium">{row.team_name}</TableCell>
                            <TableCell>{row.PJ}</TableCell>
                            <TableCell>{row.PG}</TableCell>
                            <TableCell>{row.PP}</TableCell>
                            <TableCell>{row.PF}</TableCell>
                            <TableCell>{row.PC}</TableCell>
                            <TableCell>{row.DIF}</TableCell>
                            <TableCell>{row.PTS}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      <Dialog open={addParticipantOpen} onOpenChange={setAddParticipantOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addPlayer")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("searchPlayer")}</label>
              <Input
                value={addParticipantSearch}
                onChange={(e) => setAddParticipantSearch(e.target.value)}
                placeholder={t("searchPlayerPlaceholder")}
                className="mt-1"
              />
            </div>
            {addParticipantSearch.trim().length < 3 ? (
              <p className="text-sm text-muted-foreground py-4">{t("searchPlayerMinChars")}</p>
            ) : allPlayersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border rounded-md">
                {allPlayersForParticipant
                  .filter((p) => {
                    const name = [p.first_name, p.last_name].filter(Boolean).join(" ").toLowerCase();
                    const email = (p.email ?? "").toLowerCase();
                    const search = addParticipantSearch.trim().toLowerCase();
                    return name.includes(search) || email.includes(search);
                  })
                  .filter((p) => !eventDetail?.participants?.some((ep) => ep.user_id === p.id))
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-muted"
                    >
                      <span className="min-w-0 truncate">
                        {[p.first_name, p.last_name].filter(Boolean).join(" ") || p.email}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleAddParticipantForPlayer(p.id)}
                        disabled={addingParticipantId !== null}
                      >
                        {addingParticipantId === p.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          tCommon("add")
                        )}
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddParticipantOpen(false)}>
              {tCommon("cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addTeamOpen} onOpenChange={setAddTeamOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addTeam")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("teamName")}</label>
              <Input
                value={addTeamName}
                onChange={(e) => setAddTeamName(e.target.value)}
                placeholder={t("teamNamePlaceholder")}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("selectTwoPlayers")}</label>
              {(eventDetail?.participantsWithoutTeam?.length ?? 0) < 2 ? (
                <p className="text-sm text-muted-foreground mt-2">{t("needMorePlayersWithoutTeam")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <select
                    className="border rounded-md px-3 py-2 text-sm"
                    value={addTeamPlayer1 ?? ""}
                    onChange={(e) => setAddTeamPlayer1(e.target.value || null)}
                  >
                    <option value="">—</option>
                    {(eventDetail?.participantsWithoutTeam ?? [])
                      .filter((p) => p.user_id !== addTeamPlayer2)
                      .map((p) => (
                        <option key={p.user_id} value={p.user_id}>
                          {[p.first_name, p.last_name].filter(Boolean).join(" ") || p.email}
                        </option>
                      ))}
                  </select>
                  <select
                    className="border rounded-md px-3 py-2 text-sm"
                    value={addTeamPlayer2 ?? ""}
                    onChange={(e) => setAddTeamPlayer2(e.target.value || null)}
                  >
                    <option value="">—</option>
                    {(eventDetail?.participantsWithoutTeam ?? [])
                      .filter((p) => p.user_id !== addTeamPlayer1)
                      .map((p) => (
                        <option key={p.user_id} value={p.user_id}>
                          {[p.first_name, p.last_name].filter(Boolean).join(" ") || p.email}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTeamOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleAddTeam}
              disabled={
                addTeamSubmitting ||
                !addTeamName.trim() ||
                !addTeamPlayer1 ||
                !addTeamPlayer2 ||
                addTeamPlayer1 === addTeamPlayer2
              }
            >
              {addTeamSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {tCommon("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteEvent")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground">
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
