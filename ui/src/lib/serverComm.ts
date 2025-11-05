import { getAuth } from "firebase/auth";
import { app } from "./firebase";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "APIError";
  }
}

async function getAuthToken(): Promise<string | null> {
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  return user.getIdToken();
}

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    console.warn("No auth token available for request to:", endpoint);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `API request failed: ${response.status} ${response.statusText}`,
      {
        endpoint,
        status: response.status,
        error: errorText,
        hasToken: !!token,
      }
    );

    throw new APIError(
      response.status,
      `API request failed: ${response.statusText} - ${errorText}`
    );
  }

  return response;
}

// API endpoints
export async function getCurrentUser() {
  const response = await fetchWithAuth("/api/v1/protected/me");
  return response.json();
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  dni?: string;
  tshirt_size?: string;
  gender?: string;
  profile_picture_url?: string;
}

export interface TeamChangeNotification {
  id: string;
  player_name: string;
  action: "joined" | "removed";
  team_name: string;
  date: string;
  read: boolean;
  read_at: string | null;
}

export async function updateUserProfile(data: ProfileUpdateData) {
  const response = await fetchWithAuth("/api/v1/protected/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

// Profile picture API functions
export async function updateProfilePicture(imageUrl: string) {
  const response = await fetchWithAuth("/api/v1/protected/profile/picture", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageUrl }),
  });
  return response.json();
}

export async function removeProfilePicture() {
  const response = await fetchWithAuth("/api/v1/protected/profile/picture", {
    method: "DELETE",
  });
  return response.json();
}


// League Management API
export interface League {
  id: string;
  name: string;
  level: "2" | "3" | "4";
  gender: "male" | "female" | "mixed";
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface NewLeague {
  name: string;
  level: "2" | "3" | "4";
  gender: "male" | "female" | "mixed";
  start_date: string;
  end_date: string;
}

export interface UpdateLeague {
  name?: string;
  level?: "2" | "3" | "4";
  gender?: "male" | "female" | "mixed";
  start_date?: string;
  end_date?: string;
}

export async function getLeagues() {
  const response = await fetchWithAuth("/api/v1/leagues");
  return response.json();
}

export async function getLeague(id: string) {
  const response = await fetchWithAuth(`/api/v1/admin/leagues/${id}`);
  return response.json();
}

export async function createLeague(data: NewLeague) {
  const response = await fetchWithAuth("/api/v1/admin/leagues", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateLeague(id: string, data: UpdateLeague) {
  const response = await fetchWithAuth(`/api/v1/admin/leagues/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteLeague(id: string) {
  const response = await fetchWithAuth(`/api/v1/admin/leagues/${id}`, {
    method: "DELETE",
  });
  return response.json();
}

// Team interfaces
export interface Team {
  id: string;
  name: string;
  level: string;
  gender: string;
  league_id?: string | null;
  created_by: string;
  passcode?: string;
  created_at: string;
  updated_at: string;
}

export interface NewTeam {
  name: string;
  level: string;
  gender: string;
}

export interface UpdateTeam {
  name?: string;
  level?: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  joined_at: string;
  paid?: boolean;
  paid_at?: string | null;
  paid_amount?: number | null;
}

export interface NewTeamMember {
  user_id: string;
}

export interface TeamWithDetails {
  team: Team;
  league: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  } | null;
  member_count: number;
  user_payment_status?: {
    paid: boolean;
    paid_at: string | null;
    paid_amount: number | null;
  } | null;
}

// Match interfaces
export interface Match {
  id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string | null; // null indicates match needs manual assignment
  match_time: string;
  week_number: number;
  created_at: string;
  updated_at: string;
}

export interface MatchWithTeams {
  match: Match;
  home_team: {
    id: string;
    name: string;
  };
  away_team: {
    id: string;
    name: string;
  };
}

// Team management functions
export async function createTeam(data: NewTeam) {
  const response = await fetchWithAuth("/api/v1/protected/teams", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function getMyTeams() {
  const response = await fetchWithAuth("/api/v1/protected/teams");
  return response.json();
}

export async function getTeam(id: string) {
  const response = await fetchWithAuth(`/api/v1/protected/teams/${id}`);
  return response.json();
}

export async function updateTeam(id: string, data: UpdateTeam) {
  const response = await fetchWithAuth(`/api/v1/protected/teams/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteTeam(id: string) {
  const response = await fetchWithAuth(`/api/v1/protected/teams/${id}`, {
    method: "DELETE",
  });
  return response.json();
}

export async function addTeamMember(teamId: string, data: NewTeamMember) {
  const response = await fetchWithAuth(`/api/v1/protected/teams/${teamId}/members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function removeTeamMember(teamId: string, userId: string) {
  const response = await fetchWithAuth(`/api/v1/protected/teams/${teamId}/members/${userId}`, {
    method: "DELETE",
  });
  return response.json();
}

export async function searchPlayers(level: string | undefined, leagueId: string | null | undefined, gender?: string) {
  const params = new URLSearchParams();
  if (leagueId) params.append("league_id", leagueId);
  if (level) params.append("level", level);
  if (gender) params.append("gender", gender);

  const response = await fetchWithAuth(`/api/v1/protected/players/search?${params}`);
  return response.json();
}

// Calendar API functions
export async function generateLeagueCalendar(leagueId: string, startDate: string) {
  const response = await fetchWithAuth(`/api/v1/admin/leagues/${leagueId}/generate-calendar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ start_date: startDate }),
  });
  return response.json();
}

export async function getLeagueCalendar(leagueId: string) {
  const response = await fetchWithAuth(`/api/v1/admin/leagues/${leagueId}/calendar`);
  return response.json();
}

export async function getLeagueClassifications(leagueId: string) {
  const response = await fetchWithAuth(`/api/v1/admin/leagues/${leagueId}/classifications`);
  return response.json();
}

export async function updateMatchDate(leagueId: string, matchId: string, date: string, time: string) {
  const response = await fetchWithAuth(`/api/v1/admin/leagues/${leagueId}/matches/${matchId}/date`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ match_date: date, match_time: time }),
  });
  return response.json();
}

export async function clearLeagueCalendar(leagueId: string) {
  const response = await fetchWithAuth(`/api/v1/admin/leagues/${leagueId}/calendar`, {
    method: "DELETE",
  });
  return response.json();
}

// Admin Teams (All) API
export async function getAdminTeams(filters?: { gender?: string; level?: string }) {
  const params = new URLSearchParams();
  if (filters?.gender) params.append("gender", filters.gender);
  if (filters?.level) params.append("level", filters.level);
  const qs = params.toString();
  const response = await fetchWithAuth(`/api/v1/admin/teams${qs ? `?${qs}` : ""}`);
  return response.json();
}

export async function updateMemberPaid(teamId: string, userId: string, payload: { paid: boolean; paid_at?: string; paid_amount?: number }) {
  const response = await fetchWithAuth(`/api/v1/admin/teams/${teamId}/members/${userId}/paid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function updateLeagueDates(leagueId: string, startDate: string, endDate: string) {
  const response = await fetchWithAuth(`/api/v1/admin/leagues/${leagueId}/dates`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ start_date: startDate, end_date: endDate }),
  });
  return response.json();
}

export async function getAdminTeamsByLeague(leagueId: string) {
  const response = await fetchWithAuth(`/api/v1/admin/leagues/${leagueId}/teams`);
  return response.json();
}

export async function addTeamToLeague(leagueId: string, teamId: string) {
  const response = await fetchWithAuth(`/api/v1/admin/leagues/${leagueId}/teams`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ team_id: teamId }),
  });
  return response.json();
}

export async function removeTeamFromLeague(leagueId: string, teamId: string) {
  const response = await fetchWithAuth(`/api/v1/admin/leagues/${leagueId}/teams/${teamId}`, {
    method: "DELETE",
  });
  return response.json();
}

export async function getAllPlayers() {
  const response = await fetchWithAuth(`/api/v1/admin/players`);
  return response.json();
}

export interface PlayerTeamInfo {
  team: Team;
  league: {
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    level: string;
    gender: string;
  } | null;
  payment_status: {
    paid: boolean;
    paid_at: string | null;
    paid_amount: number | null;
  };
  team_member_id: string;
}

export async function getPlayerTeams(playerId: string) {
  const response = await fetchWithAuth(`/api/v1/admin/players/${playerId}/teams`);
  return response.json();
}

// Team Availability API functions
export async function getTeamAvailability(teamId: string) {
  const response = await fetchWithAuth(`/api/v1/protected/teams/${teamId}/availability`);
  return response.json();
}

export async function updateTeamAvailability(teamId: string, availability: any[]) {
  const response = await fetchWithAuth(`/api/v1/protected/teams/${teamId}/availability`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ availability }),
  });
  return response.json();
}

export async function lookupTeamByPasscode(passcode: string) {
  const token = await getAuthToken();
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/protected/teams/lookup?passcode=${encodeURIComponent(passcode)}`, {
      method: 'GET',
      headers,
    });

    // Read response as text first
    const text = await response.text();
    
    // Try to parse as JSON
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      // If not valid JSON, return the text as error
      console.error('Failed to parse JSON response:', text);
      return { error: text || `API request failed: ${response.statusText}` };
    }

    // If the response is not ok, check if we got an error message in the JSON
    if (!response.ok) {
      console.log(`[lookupTeamByPasscode] Error response: status=${response.status}, text="${text}", data=`, data);
      // The backend returns { error: "..." } format
      if (data && data.error) {
        console.log(`[lookupTeamByPasscode] Error from backend: "${data.error}"`);
        return { error: data.error };
      }
      // If no error in JSON, return a generic error
      console.log(`[lookupTeamByPasscode] No error in JSON, returning text or statusText`);
      return { error: text || `API request failed: ${response.statusText}` };
    }

    // Success response
    return data;
  } catch (err: any) {
    // Network errors or other unexpected errors
    console.error('lookupTeamByPasscode exception:', err);
    return { error: err.message || 'Failed to lookup team' };
  }
}

export async function joinTeam(passcode: string) {
  const token = await getAuthToken();
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/protected/teams/join`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ passcode }),
    });

    // Read response as text first
    const text = await response.text();
    
    // Try to parse as JSON
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      // If not valid JSON, return the text as error
      console.error('Failed to parse JSON response:', text);
      return { error: text || `API request failed: ${response.statusText}` };
    }

    // If the response is not ok, check if we got an error message in the JSON
    if (!response.ok) {
      // The backend returns { error: "..." } format
      if (data && data.error) {
        return { error: data.error };
      }
      // If no error in JSON, return a generic error
      return { error: text || `API request failed: ${response.statusText}` };
    }

    // Success response
    return data;
  } catch (err: any) {
    // Network errors or other unexpected errors
    console.error('joinTeam exception:', err);
    return { error: err.message || 'Failed to join team' };
  }
}

export async function getTeamChangeNotifications(filter?: "read" | "unread" | "all") {
  const filterParam = filter || "unread";
  const response = await fetchWithAuth(`/api/v1/admin/team-change-notifications?filter=${filterParam}`);
  const data = await response.json();
  return data;
}

export async function markNotificationAsRead(notificationId: string) {
  const response = await fetchWithAuth(`/api/v1/admin/team-change-notifications/${notificationId}/read`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.json();
}

export const api = {
  getCurrentUser,
  updateUserProfile,
  // League management
  getLeagues,
  getLeague,
  createLeague,
  updateLeague,
  deleteLeague,
  // Team management
  createTeam,
  getMyTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  searchPlayers,
  getAdminTeamsByLeague,
  addTeamToLeague,
  removeTeamFromLeague,
  getAllPlayers,
  getPlayerTeams,
  getTeamAvailability,
  updateTeamAvailability,
  generateLeagueCalendar,
  getLeagueCalendar,
  getLeagueClassifications,
  updateMatchDate,
  clearLeagueCalendar,
  updateLeagueDates,
  getAdminTeams,
  updateMemberPaid,
  lookupTeamByPasscode,
  joinTeam,
  getTeamChangeNotifications,
  markNotificationAsRead,
};
