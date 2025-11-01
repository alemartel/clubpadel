import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Filter,
} from "lucide-react";
import { api, TeamChangeNotification } from "@/lib/serverComm";
import { useTranslation } from "@/hooks/useTranslation";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function ControlPanel() {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<TeamChangeNotification[]>([]);
  const [filter, setFilter] = useState<"read" | "unread" | "all">("unread");
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getTeamChangeNotifications(filter);
      if (response.error) {
        setError(response.error);
        setNotifications([]);
      } else {
        setNotifications(response.notifications || []);
      }
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      setError(err.message || "Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const handleMarkAsRead = async (notificationId: string) => {
    setMarkingAsRead(notificationId);
    try {
      const response = await api.markNotificationAsRead(notificationId);
      if (response.error) {
        setError(response.error);
      } else {
        // Optimistically update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        // If we're on "unread" filter, remove the notification
        if (filter === "unread") {
          setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        }
      }
    } catch (err: any) {
      console.error("Failed to mark notification as read:", err);
      setError(err.message || "Failed to mark notification as read");
    } finally {
      setMarkingAsRead(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPp");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t("controlPanel")}</h1>
        </div>
      </div>

      {/* Filter Section */}
      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5" />
        <Select
          value={filter}
          onValueChange={(value: "read" | "unread" | "all") => setFilter(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unread">{t("filterUnread")}</SelectItem>
            <SelectItem value="read">{t("filterRead")}</SelectItem>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Notifications Table */}
      <Card>
        <CardHeader>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t("noNotifications")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("player")}</TableHead>
                    <TableHead>{t("action")}</TableHead>
                    <TableHead>{t("team")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="font-medium">
                        {notification.player_name}
                      </TableCell>
                      <TableCell>
                        {notification.action === "joined" ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {t("joined")}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            {t("removed")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{notification.team_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(notification.date)}
                      </TableCell>
                      <TableCell className="text-right">
                        {!notification.read && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markingAsRead === notification.id}
                          >
                            {markingAsRead === notification.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              t("markAsRead")
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

