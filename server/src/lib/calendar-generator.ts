import { randomUUID } from "crypto";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import { teams, team_availability, team_members } from "../schema/teams";
import { leagues, matches as matchesTable, type NewMatch } from "../schema/leagues";
import type { DatabaseConnection } from "./db";

// Constants for calendar generation
const DEFAULT_MATCH_TIME = "10:00:00";
const SATURDAY_DAY_INDEX = 6;
const MIN_TEAMS_REQUIRED = 2;

export interface TeamAvailability {
  team_id: string;
  team_name: string;
  availability: {
    day_of_week: string;
    is_available: boolean;
    start_time: string;
    end_time: string;
  }[];
}

export interface GeneratedMatch {
  id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: Date | null;
  match_time: string;
  week_number: number;
  home_team_name: string;
  away_team_name: string;
  needsManualAssignment: boolean;
}

export interface CalendarGenerationResult {
  matches: GeneratedMatch[];
  total_weeks: number;
  start_date: Date;
  end_date: Date;
}

export class CalendarGenerator {
  private db: DatabaseConnection;

  constructor(database: DatabaseConnection) {
    this.db = database;
  }

  async generateCalendar(
    leagueId: string,
    startDate: Date
  ): Promise<CalendarGenerationResult> {
    console.log(`Starting calendar generation for league: ${leagueId}, startDate: ${startDate}`);
    
    try {
      // 1. Input Validation
      console.log("Step 1: Validating inputs");
      await this.validateInputs(leagueId, startDate);

      // 2. Get teams and their availability
      console.log("Step 2: Getting team availability");
      const teamAvailability = await this.getTeamAvailability(leagueId);
      
      // 3. Generate team pairs (round-robin)
      console.log("Step 3: Generating team pairs");
      const teamPairs = this.generateTeamPairs(teamAvailability);
    
      // 4. Calculate weekly distribution for round-robin tournament
      console.log("Step 4: Calculating weekly distribution");
      const totalMatches = teamPairs.length;
      const numberOfTeams = teamAvailability.length;
      
      // In round-robin, each team plays once per week
      // For even number of teams: matches per week = teams / 2
      // For odd number of teams: matches per week = (teams - 1) / 2 (one team gets a bye)
      const matchesPerWeek = Math.floor(numberOfTeams / 2);
      const totalWeeks = Math.ceil(totalMatches / matchesPerWeek);
      
      console.log(`Total matches: ${totalMatches}, Teams: ${numberOfTeams}, Matches per week: ${matchesPerWeek}, Total weeks: ${totalWeeks}`);
      
      // 5. Generate matches with availability matching
      console.log("Step 5: Scheduling matches");
      const generatedMatches = await this.scheduleMatches(
        teamPairs,
        teamAvailability,
        startDate,
        totalWeeks,
        matchesPerWeek
      );

      // 6. Calculate end date (1 week after last match with assigned date)
      console.log("Step 6: Calculating end date");
      const matchesWithDates = generatedMatches.filter(m => m.match_date !== null) as GeneratedMatch[];
      let endDate = new Date(startDate);
      if (matchesWithDates.length > 0) {
        const lastMatchDate = new Date(Math.max(...matchesWithDates.map(m => (m.match_date as Date).getTime())));
        endDate = new Date(lastMatchDate);
        endDate.setDate(endDate.getDate() + 7);
      } else {
        // If no matches have dates, set end date to start date + total weeks
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (totalWeeks * 7));
      }

      console.log(`Calendar generation completed. Generated ${generatedMatches.length} matches.`);
      return {
        matches: generatedMatches,
        total_weeks: totalWeeks,
        start_date: startDate,
        end_date: endDate,
      };
    } catch (error) {
      console.error("Error in generateCalendar:", error);
      throw error;
    }
  }

  private async validateInputs(leagueId: string, startDate: Date): Promise<void> {
    // Check if league exists
    const [league] = await this.db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId));

    if (!league) {
      throw new Error("League not found");
    }

    // Check if start date is in the future
    if (startDate <= new Date()) {
      throw new Error("Start date must be in the future");
    }

    // Get teams in the league
    const leagueTeams = await this.db
      .select()
      .from(teams)
      .where(eq(teams.league_id, leagueId));

    if (leagueTeams.length < MIN_TEAMS_REQUIRED) {
      throw new Error(`League must have at least ${MIN_TEAMS_REQUIRED} teams to generate calendar`);
    }

    // Check if teams have availability data
    const teamAvailability = await this.getTeamAvailability(leagueId);
    const teamsWithoutAvailability = teamAvailability.filter(team => 
      !team.availability || team.availability.length === 0
    );

    if (teamsWithoutAvailability.length > 0) {
      const teamNames = teamsWithoutAvailability.map(team => team.team_name).join(", ");
      throw new Error(`Teams without availability data: ${teamNames}. Please ensure all teams have availability information before generating calendar.`);
    }
  }

  private async getTeamAvailability(leagueId: string): Promise<TeamAvailability[]> {
    console.log(`Getting team availability for league: ${leagueId}`);
    
    // Get teams with their availability
    const teamsWithAvailability = await this.db
      .select({
        team_id: teams.id,
        team_name: teams.name,
        day_of_week: team_availability.day_of_week,
        is_available: team_availability.is_available,
        start_time: team_availability.start_time,
        end_time: team_availability.end_time,
      })
      .from(teams)
      .leftJoin(team_availability, eq(teams.id, team_availability.team_id))
      .where(eq(teams.league_id, leagueId));

    console.log(`Found ${teamsWithAvailability.length} team availability records`);

    // Group by team
    const teamMap = new Map<string, TeamAvailability>();
    
    for (const row of teamsWithAvailability) {
      // Skip rows with missing team data
      if (!row.team_id || !row.team_name) {
        console.warn(`Skipping row with missing team data:`, row);
        continue;
      }

      if (!teamMap.has(row.team_id)) {
        teamMap.set(row.team_id, {
          team_id: row.team_id,
          team_name: row.team_name,
          availability: [],
        });
      }

      if (row.day_of_week) {
        teamMap.get(row.team_id)!.availability.push({
          day_of_week: row.day_of_week,
          is_available: row.is_available,
          start_time: row.start_time || "09:00:00",
          end_time: row.end_time || "18:00:00",
        });
      }
    }

    const result = Array.from(teamMap.values());
    console.log(`Processed ${result.length} teams with availability data`);
    return result;
  }

  private generateTeamPairs(teamAvailability: TeamAvailability[]): Array<[string, string]> {
    console.log(`Generating team pairs for ${teamAvailability.length} teams`);
    const pairs: Array<[string, string]> = [];
    const teamIds = teamAvailability.map(t => {
      if (!t.team_id) {
        console.error("Found team with undefined team_id:", t);
        throw new Error("Team with undefined team_id found");
      }
      return t.team_id;
    });

    // Generate all possible pairs (n choose 2)
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        pairs.push([teamIds[i], teamIds[j]]);
      }
    }

    console.log(`Generated ${pairs.length} team pairs`);
    return pairs;
  }

  private async scheduleMatches(
    teamPairs: Array<[string, string]>,
    teamAvailability: TeamAvailability[],
    startDate: Date,
    totalWeeks: number,
    matchesPerWeek: number
  ): Promise<GeneratedMatch[]> {
    const matches: GeneratedMatch[] = [];
    const teamMap = new Map(teamAvailability.map(t => [t.team_id, t]));

    // Track home/away alternation per team across weeks
    const teamHomeAwayStatus = new Map<string, 'home' | 'away' | null>();
    teamAvailability.forEach(t => teamHomeAwayStatus.set(t.team_id, null));

    // Create a proper round-robin schedule
    const schedule = this.createRoundRobinSchedule(teamAvailability.map(t => t.team_id), totalWeeks);

    // Schedule matches week by week
    for (let week = 1; week <= totalWeeks; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
      
      const weekMatches = schedule[week - 1] || [];
      const scheduledTimes = new Set<string>(); // Track scheduled times to prevent conflicts

      for (const [team1Id, team2Id] of weekMatches) {
        const team1 = teamMap.get(team1Id)!;
        const team2 = teamMap.get(team2Id)!;
        
        // Determine home/away based on alternation
        const team1LastStatus = teamHomeAwayStatus.get(team1Id);
        const team2LastStatus = teamHomeAwayStatus.get(team2Id);
        
        let homeTeamId: string;
        let awayTeamId: string;
        let homeTeam: TeamAvailability;
        let awayTeam: TeamAvailability;

        // Apply home/away alternation: if team was home last week, make them away this week
        if (team1LastStatus === 'home' || team2LastStatus === 'away') {
          // Team1 was home or team2 was away, so make team1 away and team2 home
          homeTeamId = team2Id;
          awayTeamId = team1Id;
          homeTeam = team2;
          awayTeam = team1;
        } else if (team2LastStatus === 'home' || team1LastStatus === 'away') {
          // Team2 was home or team1 was away, so make team2 away and team1 home
          homeTeamId = team1Id;
          awayTeamId = team2Id;
          homeTeam = team1;
          awayTeam = team2;
        } else {
          // First match for both teams or both null - assign randomly (use team creation order via ID)
          if (team1Id < team2Id) {
            homeTeamId = team1Id;
            awayTeamId = team2Id;
            homeTeam = team1;
            awayTeam = team2;
          } else {
            homeTeamId = team2Id;
            awayTeamId = team1Id;
            homeTeam = team2;
            awayTeam = team1;
          }
        }

        // Update home/away status for tracking
        teamHomeAwayStatus.set(homeTeamId, 'home');
        teamHomeAwayStatus.set(awayTeamId, 'away');
        
        // Find best available day and time for this match, avoiding conflicts
        const result = await this.findBestMatchTimeWithConflictAvoidance(
          homeTeam,
          awayTeam,
          homeTeamId,
          awayTeamId,
          weekStart,
          scheduledTimes
        );

        if (result.needsManualAssignment) {
          // No valid date found - mark for manual assignment
          const match: GeneratedMatch = {
            id: randomUUID(),
            league_id: "", // Will be set by saveMatches method
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            match_date: null,
            match_time: DEFAULT_MATCH_TIME,
            week_number: week,
            home_team_name: homeTeam.team_name,
            away_team_name: awayTeam.team_name,
            needsManualAssignment: true,
          };
          matches.push(match);
        } else {
          // Add this time slot to avoid conflicts
          const timeKey = `${result.matchDate.toISOString().split('T')[0]}_${result.matchTime}`;
          scheduledTimes.add(timeKey);

          const match: GeneratedMatch = {
            id: randomUUID(),
            league_id: "", // Will be set by saveMatches method
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            match_date: result.matchDate,
            match_time: result.matchTime,
            week_number: week,
            home_team_name: homeTeam.team_name,
            away_team_name: awayTeam.team_name,
            needsManualAssignment: false,
          };

          matches.push(match);
        }
      }
    }

    return matches;
  }

  private createRoundRobinSchedule(teamIds: string[], totalWeeks: number): Array<Array<[string, string]>> {
    const schedule: Array<Array<[string, string]>> = [];
    const n = teamIds.length;
    
    console.log(`Creating round-robin schedule for ${n} teams:`, teamIds);
    
    // Use the standard round-robin algorithm
    // For odd number of teams, we'll handle it by giving one team a bye each week
    const isOdd = n % 2 === 1;
    const numRounds = isOdd ? n : n - 1;
    
    // Create a copy of team IDs for rotation
    let teams = [...teamIds];
    
    for (let round = 0; round < Math.min(totalWeeks, numRounds); round++) {
      const weekMatches: Array<[string, string]> = [];
      
      // Create matches for this round
      for (let i = 0; i < Math.floor(teams.length / 2); i++) {
        const homeTeam = teams[i];
        const awayTeam = teams[teams.length - 1 - i];
        weekMatches.push([homeTeam, awayTeam]);
      }
      
      console.log(`Round ${round + 1} matches:`, weekMatches);
      schedule.push(weekMatches);
      
      // Rotate teams: keep first team fixed, rotate the rest clockwise
      if (teams.length > 2) {
        const fixedTeam = teams[0];
        const rotatingTeams = teams.slice(1);
        
        // Rotate clockwise: last team moves to second position
        const rotatedTeams = [rotatingTeams[rotatingTeams.length - 1], ...rotatingTeams.slice(0, -1)];
        teams = [fixedTeam, ...rotatedTeams];
      }
    }
    
    console.log(`Created round-robin schedule with ${schedule.length} rounds`);
    
    // Validate that no team appears twice in the same week
    for (let week = 0; week < schedule.length; week++) {
      const weekMatches = schedule[week];
      const teamsInWeek = new Set<string>();
      
      for (const [home, away] of weekMatches) {
        if (teamsInWeek.has(home)) {
          console.error(`ERROR: Team ${home} appears twice in week ${week + 1}`);
        }
        if (teamsInWeek.has(away)) {
          console.error(`ERROR: Team ${away} appears twice in week ${week + 1}`);
        }
        teamsInWeek.add(home);
        teamsInWeek.add(away);
      }
      
      console.log(`Week ${week + 1} validation: ${teamsInWeek.size} unique teams`);
    }
    
    return schedule;
  }

  /**
   * Check if any player from either team has a match conflict on the proposed date
   */
  private async checkPlayerMatchConflicts(
    team1Id: string,
    team2Id: string,
    proposedDate: Date
  ): Promise<boolean> {
    try {
      // Get all players from both teams
      const team1Members = await this.db
        .select({ user_id: team_members.user_id })
        .from(team_members)
        .where(eq(team_members.team_id, team1Id));

      const team2Members = await this.db
        .select({ user_id: team_members.user_id })
        .from(team_members)
        .where(eq(team_members.team_id, team2Id));

      const allPlayerIds = new Set([
        ...team1Members.map(m => m.user_id),
        ...team2Members.map(m => m.user_id)
      ]);

      if (allPlayerIds.size === 0) {
        return false; // No players, no conflict
      }

      // Check for existing matches on the same date involving any of these players
      const dateStr = proposedDate.toISOString().split('T')[0];
      const dateStart = new Date(dateStr);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(dateStr);
      dateEnd.setHours(23, 59, 59, 999);

      // Get all matches on this date
      const existingMatches = await this.db
        .select()
        .from(matchesTable)
        .where(
          and(
            sql`DATE(${matchesTable.match_date}) = DATE(${sql.raw(`'${dateStr}'`)})`,
            sql`${matchesTable.match_date} IS NOT NULL`,
            sql`${matchesTable.match_date} < ${sql.raw(`'2100-01-01'::timestamp`)}` // Exclude placeholder dates
          )
        );

      if (existingMatches.length === 0) {
        return false; // No existing matches, no conflict
      }

      // Batch fetch all team members for all existing matches in one query
      const existingMatchTeamIds = new Set<string>();
      existingMatches.forEach(match => {
        existingMatchTeamIds.add(match.home_team_id);
        existingMatchTeamIds.add(match.away_team_id);
      });

      // Get all team members for all existing match teams in one query
      const allExistingTeamMembers = existingMatchTeamIds.size > 0 ? await this.db
        .select({
          team_id: team_members.team_id,
          user_id: team_members.user_id
        })
        .from(team_members)
        .where(inArray(team_members.team_id, Array.from(existingMatchTeamIds))) : [];

      // Build a map of team_id -> Set of player IDs
      const teamPlayersMap = new Map<string, Set<string>>();
      for (const member of allExistingTeamMembers) {
        if (!teamPlayersMap.has(member.team_id)) {
          teamPlayersMap.set(member.team_id, new Set());
        }
        teamPlayersMap.get(member.team_id)!.add(member.user_id);
      }

      // Check if any existing match involves players from our teams
      for (const match of existingMatches) {
        const homeTeamPlayers = teamPlayersMap.get(match.home_team_id) || new Set();
        const awayTeamPlayers = teamPlayersMap.get(match.away_team_id) || new Set();
        const existingMatchPlayers = new Set([...homeTeamPlayers, ...awayTeamPlayers]);

        // Check for intersection
        for (const playerId of allPlayerIds) {
          if (existingMatchPlayers.has(playerId)) {
            return true; // Conflict found
          }
        }
      }

      return false; // No conflicts
    } catch (error) {
      console.error('Error checking player match conflicts:', error);
      // On error, log and throw to prevent silent failures
      // This is safer than returning false and potentially creating conflicts
      throw new Error(`Failed to check player match conflicts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async findBestMatchTimeWithConflictAvoidance(
    homeTeam: TeamAvailability,
    awayTeam: TeamAvailability,
    homeTeamId: string,
    awayTeamId: string,
    weekStart: Date,
    scheduledTimes: Set<string>
  ): Promise<{ matchDate: Date; matchTime: string; needsManualAssignment: boolean }> {
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    // Validate inputs
    if (!homeTeam || !awayTeam || !homeTeam.availability || !awayTeam.availability) {
      throw new Error("Invalid team data provided for match scheduling");
    }

    if (!weekStart || isNaN(weekStart.getTime())) {
      throw new Error("Invalid week start date provided");
    }
    
    // Find common available days
    const homeAvailableDays = homeTeam.availability
      .filter(a => a.is_available && a.day_of_week)
      .map(a => {
        const day = a.day_of_week.toLowerCase();
        if (!daysOfWeek.includes(day)) {
          console.warn(`Invalid day of week: ${a.day_of_week} for team ${homeTeam.team_name}`);
          return null;
        }
        return day;
      })
      .filter(day => day !== null) as string[];
    
    const awayAvailableDays = awayTeam.availability
      .filter(a => a.is_available && a.day_of_week)
      .map(a => {
        const day = a.day_of_week.toLowerCase();
        if (!daysOfWeek.includes(day)) {
          console.warn(`Invalid day of week: ${a.day_of_week} for team ${awayTeam.team_name}`);
          return null;
        }
        return day;
      })
      .filter(day => day !== null) as string[];

    const commonDays = homeAvailableDays.filter(day => 
      awayAvailableDays.includes(day)
    );

    // Calculate availability counts for priority logic
    const homeAvailableCount = homeAvailableDays.length;
    const awayAvailableCount = awayAvailableDays.length;
    const MIN_AVAILABILITY_REQUIREMENT = 2; // Minimum days required

    // Try to find a time slot that doesn't conflict with player matches
    for (const day of commonDays) {
      const dayIndex = daysOfWeek.indexOf(day);
      const matchDate = new Date(weekStart);
      // Calculate days until the target day of week
      let daysUntilDay = (dayIndex - weekStart.getDay() + 7) % 7;
      if (daysUntilDay === 0) {
        daysUntilDay = 7; // If same day, schedule for next week
      }
      matchDate.setDate(weekStart.getDate() + daysUntilDay);
      
      // Check for player match conflicts before scheduling
      const hasConflict = await this.checkPlayerMatchConflicts(homeTeamId, awayTeamId, matchDate);
      if (hasConflict) {
        continue; // Skip this date, try next
      }
      
      // Try different times to avoid time slot conflicts
      const possibleTimes = ["10:00:00", "11:00:00", "12:00:00", "13:00:00", "14:00:00", "15:00:00", "16:00:00", "17:00:00"];
      
      for (const time of possibleTimes) {
        const timeKey = `${matchDate.toISOString().split('T')[0]}_${time}`;
        if (!scheduledTimes.has(timeKey)) {
          return {
            matchDate,
            matchTime: time,
            needsManualAssignment: false
          };
        }
      }
    }

    // No conflict-free date found - apply priority logic
    // Priority 1: Team that meets minimum availability requirement
    const homeMeetsMinimum = homeAvailableCount >= MIN_AVAILABILITY_REQUIREMENT;
    const awayMeetsMinimum = awayAvailableCount >= MIN_AVAILABILITY_REQUIREMENT;

    if (homeMeetsMinimum && !awayMeetsMinimum) {
      // Home team meets minimum, try to schedule on their available days
      for (const day of homeAvailableDays) {
        const dayIndex = daysOfWeek.indexOf(day);
        const matchDate = new Date(weekStart);
        let daysUntilDay = (dayIndex - weekStart.getDay() + 7) % 7;
        if (daysUntilDay === 0) daysUntilDay = 7;
        matchDate.setDate(weekStart.getDate() + daysUntilDay);
        
        const hasConflict = await this.checkPlayerMatchConflicts(homeTeamId, awayTeamId, matchDate);
        if (!hasConflict) {
          return {
            matchDate,
            matchTime: DEFAULT_MATCH_TIME,
            needsManualAssignment: false
          };
        }
      }
    } else if (awayMeetsMinimum && !homeMeetsMinimum) {
      // Away team meets minimum, try to schedule on their available days
      for (const day of awayAvailableDays) {
        const dayIndex = daysOfWeek.indexOf(day);
        const matchDate = new Date(weekStart);
        let daysUntilDay = (dayIndex - weekStart.getDay() + 7) % 7;
        if (daysUntilDay === 0) daysUntilDay = 7;
        matchDate.setDate(weekStart.getDate() + daysUntilDay);
        
        const hasConflict = await this.checkPlayerMatchConflicts(homeTeamId, awayTeamId, matchDate);
        if (!hasConflict) {
          return {
            matchDate,
            matchTime: DEFAULT_MATCH_TIME,
            needsManualAssignment: false
          };
        }
      }
    }

    // Priority 2: Team with most availability
    if (homeAvailableCount > awayAvailableCount) {
      for (const day of homeAvailableDays) {
        const dayIndex = daysOfWeek.indexOf(day);
        const matchDate = new Date(weekStart);
        let daysUntilDay = (dayIndex - weekStart.getDay() + 7) % 7;
        if (daysUntilDay === 0) daysUntilDay = 7;
        matchDate.setDate(weekStart.getDate() + daysUntilDay);
        
        const hasConflict = await this.checkPlayerMatchConflicts(homeTeamId, awayTeamId, matchDate);
        if (!hasConflict) {
          return {
            matchDate,
            matchTime: DEFAULT_MATCH_TIME,
            needsManualAssignment: false
          };
        }
      }
    } else if (awayAvailableCount > 0) {
      for (const day of awayAvailableDays) {
        const dayIndex = daysOfWeek.indexOf(day);
        const matchDate = new Date(weekStart);
        let daysUntilDay = (dayIndex - weekStart.getDay() + 7) % 7;
        if (daysUntilDay === 0) daysUntilDay = 7;
        matchDate.setDate(weekStart.getDate() + daysUntilDay);
        
        const hasConflict = await this.checkPlayerMatchConflicts(homeTeamId, awayTeamId, matchDate);
        if (!hasConflict) {
          return {
            matchDate,
            matchTime: DEFAULT_MATCH_TIME,
            needsManualAssignment: false
          };
        }
      }
    }

    // No valid date found - mark for manual assignment
    console.warn(`No available time slot found for ${homeTeam.team_name} vs ${awayTeam.team_name}, marking for manual assignment`);
    return {
      matchDate: new Date(weekStart), // Placeholder date
      matchTime: DEFAULT_MATCH_TIME,
      needsManualAssignment: true
    };
  }

  private findBestMatchTime(
    homeTeam: TeamAvailability,
    awayTeam: TeamAvailability,
    weekStart: Date
  ): { matchDate: Date; matchTime: string } {
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    // Validate inputs
    if (!homeTeam || !awayTeam || !homeTeam.availability || !awayTeam.availability) {
      throw new Error("Invalid team data provided for match scheduling");
    }

    if (!weekStart || isNaN(weekStart.getTime())) {
      throw new Error("Invalid week start date provided");
    }
    
    // Find common available days
    const homeAvailableDays = homeTeam.availability
      .filter(a => a.is_available && a.day_of_week)
      .map(a => {
        const day = a.day_of_week.toLowerCase();
        if (!daysOfWeek.includes(day)) {
          console.warn(`Invalid day of week: ${a.day_of_week} for team ${homeTeam.team_name}`);
          return null;
        }
        return day;
      })
      .filter(day => day !== null) as string[];
    
    const awayAvailableDays = awayTeam.availability
      .filter(a => a.is_available && a.day_of_week)
      .map(a => {
        const day = a.day_of_week.toLowerCase();
        if (!daysOfWeek.includes(day)) {
          console.warn(`Invalid day of week: ${a.day_of_week} for team ${awayTeam.team_name}`);
          return null;
        }
        return day;
      })
      .filter(day => day !== null) as string[];

    const commonDays = homeAvailableDays.filter(day => 
      awayAvailableDays.includes(day)
    );

    if (commonDays.length === 0) {
      // Fallback to Saturday if no common days
      console.warn(`No common availability found between ${homeTeam.team_name} and ${awayTeam.team_name}, defaulting to Saturday`);
      const saturday = new Date(weekStart);
      saturday.setDate(saturday.getDate() + (SATURDAY_DAY_INDEX - weekStart.getDay()));
      return {
        matchDate: saturday,
        matchTime: DEFAULT_MATCH_TIME
      };
    }

    // Use the first common day
    const selectedDay = commonDays[0];
    const dayIndex = daysOfWeek.indexOf(selectedDay);
    const matchDate = new Date(weekStart);
    matchDate.setDate(matchDate.getDate() + (dayIndex - weekStart.getDay()));

    // Find common time slot
    const homeTimeSlots = homeTeam.availability
      .filter(a => a.day_of_week.toLowerCase() === selectedDay && a.is_available);
    
    const awayTimeSlots = awayTeam.availability
      .filter(a => a.day_of_week.toLowerCase() === selectedDay && a.is_available);

    if (homeTimeSlots.length > 0 && awayTimeSlots.length > 0) {
      // Use the earlier start time
      const homeStart = homeTimeSlots[0].start_time;
      const awayStart = awayTimeSlots[0].start_time;
      const matchTime = homeStart < awayStart ? homeStart : awayStart;
      
      return { matchDate, matchTime };
    }

    // Default time
    return {
      matchDate,
      matchTime: DEFAULT_MATCH_TIME
    };
  }

  async saveMatches(
    matches: GeneratedMatch[],
    leagueId: string
  ): Promise<void> {
    const matchRecords: NewMatch[] = matches.map(match => {
      // For matches needing manual assignment, use placeholder date (2099-12-31)
      // The schema requires match_date to be not null, so we use a far future date
      // The API endpoint filters by this date and the manual assignment endpoint will update it
      const placeholderDate = new Date('2099-12-31');
      const matchDate = match.needsManualAssignment 
        ? placeholderDate 
        : (match.match_date || placeholderDate);
      
      return {
        id: match.id,
        league_id: leagueId,
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        match_date: matchDate,
        match_time: match.match_time,
        week_number: match.week_number,
      };
    });

    await this.db.insert(matchesTable).values(matchRecords);
  }

  async updateLeagueDates(
    leagueId: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    await this.db
      .update(leagues)
      .set({
        start_date: startDate,
        end_date: endDate,
        updated_at: new Date(),
      })
      .where(eq(leagues.id, leagueId));
  }
}
