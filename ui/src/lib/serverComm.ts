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
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface NewLeague {
  name: string;
  start_date: string;
  end_date: string;
}

export interface UpdateLeague {
  name?: string;
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

// Group Management API
export interface Group {
  id: string;
  league_id: string;
  name: string;
  level: "1" | "2" | "3" | "4";
  gender: "male" | "female" | "mixed";
  created_at: string;
  updated_at: string;
}

export interface NewGroup {
  name: string;
  level: "1" | "2" | "3" | "4";
  gender: "male" | "female" | "mixed";
}

export interface UpdateGroup {
  name?: string;
  level?: "1" | "2" | "3" | "4";
  gender?: "male" | "female" | "mixed";
}

// Team interfaces
export interface Team {
  id: string;
  name: string;
  level: string;
  gender: string;
  league_id?: string | null;
  group_id?: string | null;
  created_by: string;
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
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  paid?: boolean;
  paid_at?: string | null;
  paid_amount?: number | null;
}

export interface NewTeamMember {
  user_id: string;
}

// Match interfaces
export interface Match {
  id: string;
  league_id: string;
  group_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
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

export async function getGroups(leagueId: string) {
  const response = await fetchWithAuth(
    `/api/v1/leagues/${leagueId}/groups`
  );
  return response.json();
}

export async function createGroup(leagueId: string, data: NewGroup) {
  const response = await fetchWithAuth(
    `/api/v1/admin/leagues/${leagueId}/groups`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );
  return response.json();
}

export async function updateGroup(id: string, data: UpdateGroup) {
  const response = await fetchWithAuth(`/api/v1/admin/groups/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteGroup(id: string) {
  const response = await fetchWithAuth(`/api/v1/admin/groups/${id}`, {
    method: "DELETE",
  });
  return response.json();
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
export async function generateGroupCalendar(groupId: string, startDate: string) {
  const response = await fetchWithAuth(`/api/v1/admin/groups/${groupId}/generate-calendar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ start_date: startDate }),
  });
  return response.json();
}

export async function getGroupCalendar(groupId: string) {
  const response = await fetchWithAuth(`/api/v1/admin/groups/${groupId}/calendar`);
  return response.json();
}

export async function clearGroupCalendar(groupId: string) {
  const response = await fetchWithAuth(`/api/v1/admin/groups/${groupId}/calendar`, {
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

export async function getAdminTeamsByGroup(groupId: string) {
  const response = await fetchWithAuth(`/api/v1/admin/groups/${groupId}/teams`);
  return response.json();
}

export async function getAllPlayers() {
  const response = await fetchWithAuth(`/api/v1/admin/players`);
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

export const api = {
  getCurrentUser,
  updateUserProfile,
  // League management
  getLeagues,
  getLeague,
  createLeague,
  updateLeague,
  deleteLeague,
  // Group management
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  // Team management
  createTeam,
  getMyTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  searchPlayers,
  getAdminTeamsByGroup,
  getAllPlayers,
  getTeamAvailability,
  updateTeamAvailability,
  generateGroupCalendar,
  getGroupCalendar,
  clearGroupCalendar,
  updateLeagueDates,
  getAdminTeams,
  updateMemberPaid,
};
