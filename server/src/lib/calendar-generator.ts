import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { teams, team_availability } from "../schema/teams";
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
  match_date: Date;
  match_time: string;
  week_number: number;
  home_team_name: string;
  away_team_name: string;
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

      // 6. Calculate end date (1 week after last match)
      console.log("Step 6: Calculating end date");
      const lastMatchDate = new Date(Math.max(...generatedMatches.map(m => m.match_date.getTime())));
      const endDate = new Date(lastMatchDate);
      endDate.setDate(endDate.getDate() + 7);

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

    // Create a proper round-robin schedule
    const schedule = this.createRoundRobinSchedule(teamAvailability.map(t => t.team_id), totalWeeks);

    // Schedule matches week by week
    for (let week = 1; week <= totalWeeks; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
      
      const weekMatches = schedule[week - 1] || [];
      const scheduledTimes = new Set<string>(); // Track scheduled times to prevent conflicts

      for (const [homeTeamId, awayTeamId] of weekMatches) {
        const homeTeam = teamMap.get(homeTeamId)!;
        const awayTeam = teamMap.get(awayTeamId)!;
        
        // Find best available day and time for this match, avoiding conflicts
        const { matchDate, matchTime } = this.findBestMatchTimeWithConflictAvoidance(
          homeTeam,
          awayTeam,
          weekStart,
          scheduledTimes
        );

        // Add this time slot to avoid conflicts
        const timeKey = `${matchDate.toISOString().split('T')[0]}_${matchTime}`;
        scheduledTimes.add(timeKey);

        const match: GeneratedMatch = {
          id: randomUUID(),
          league_id: "", // Will be set by saveMatches method
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          match_date: matchDate,
          match_time: matchTime,
          week_number: week,
          home_team_name: homeTeam.team_name,
          away_team_name: awayTeam.team_name,
        };

        matches.push(match);
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

  private findBestMatchTimeWithConflictAvoidance(
    homeTeam: TeamAvailability,
    awayTeam: TeamAvailability,
    weekStart: Date,
    scheduledTimes: Set<string>
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

    // Try to find a time slot that doesn't conflict
    for (const day of commonDays) {
      const dayIndex = daysOfWeek.indexOf(day);
      const matchDate = new Date(weekStart);
      matchDate.setDate(matchDate.getDate() + dayIndex);
      
      // Try different times to avoid conflicts
      const possibleTimes = ["10:00:00", "11:00:00", "12:00:00", "13:00:00", "14:00:00", "15:00:00", "16:00:00", "17:00:00"];
      
      for (const time of possibleTimes) {
        const timeKey = `${matchDate.toISOString().split('T')[0]}_${time}`;
        if (!scheduledTimes.has(timeKey)) {
          return {
            matchDate,
            matchTime: time
          };
        }
      }
    }

    // Fallback to Saturday if no common days or all times are taken
    console.warn(`No available time slot found for ${homeTeam.team_name} vs ${awayTeam.team_name}, defaulting to Saturday`);
    const saturday = new Date(weekStart);
    saturday.setDate(saturday.getDate() + (SATURDAY_DAY_INDEX - weekStart.getDay()));
    return {
      matchDate: saturday,
      matchTime: DEFAULT_MATCH_TIME
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
    const matchRecords: NewMatch[] = matches.map(match => ({
      id: match.id,
      league_id: leagueId,
      home_team_id: match.home_team_id,
      away_team_id: match.away_team_id,
      match_date: match.match_date,
      match_time: match.match_time,
      week_number: match.week_number,
    }));

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
