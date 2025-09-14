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
  profile_picture_url?: string;
}

// Import types from server schema (these should match the server types)
export type LevelValidationStatus = "none" | "pending" | "approved" | "rejected";

export interface LevelValidationRequest {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  claimed_level?: string;
  level_validation_status: LevelValidationStatus;
  level_validated_at?: string;
  level_validation_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LevelStatus {
  claimed_level?: string;
  level_validation_status: LevelValidationStatus;
  level_validated_at?: string;
  level_validation_notes?: string;
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

// Level validation API functions
export async function updatePlayerLevel(level: string) {
  const response = await fetchWithAuth("/api/v1/protected/profile/level", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ level }),
  });
  return response.json();
}

export async function getPlayerLevelStatus(): Promise<LevelStatus> {
  const response = await fetchWithAuth("/api/v1/protected/profile/level-status");
  const data = await response.json();
  return data.levelStatus;
}

// Admin level validation functions
export async function getLevelValidationRequests(): Promise<{ requests: LevelValidationRequest[] }> {
  const response = await fetchWithAuth("/api/v1/admin/level-validations");
  return response.json();
}

export async function approveLevelValidation(userId: string, notes?: string) {
  const response = await fetchWithAuth(`/api/v1/admin/level-validations/${userId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notes }),
  });
  return response.json();
}

export async function rejectLevelValidation(userId: string, notes: string) {
  const response = await fetchWithAuth(`/api/v1/admin/level-validations/${userId}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notes }),
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
  league_id: string;
  group_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface NewTeam {
  name: string;
  league_id: string;
  group_id: string;
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

export async function getFreePlayers(level: string, leagueId: string, gender?: string) {
  const params = new URLSearchParams({ level, league_id: leagueId });
  if (gender) params.append("gender", gender);
  
  const response = await fetchWithAuth(`/api/v1/protected/players/free-market?${params}`);
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
  getFreePlayers,
  getAdminTeamsByGroup,
  getAllPlayers,
  getTeamAvailability,
  updateTeamAvailability,
  generateGroupCalendar,
  getGroupCalendar,
  clearGroupCalendar,
  updateLeagueDates,
};
