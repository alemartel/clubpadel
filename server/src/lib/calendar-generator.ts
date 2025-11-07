import { randomUUID } from "crypto";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import { teams, team_availability, team_members } from "../schema/teams";
import { leagues, matches as matchesTable, bye_weeks, type NewMatch, type NewByeWeek } from "../schema/leagues";
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

export interface ByeWeek {
  team_id: string;
  team_name: string;
  week_number: number;
}

export interface CalendarGenerationResult {
  matches: GeneratedMatch[];
  byes: ByeWeek[];
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
      const { matches: generatedMatches, byes: generatedByes } = await this.scheduleMatches(
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

      console.log(`Calendar generation completed. Generated ${generatedMatches.length} matches and ${generatedByes.length} bye weeks.`);
      return {
        matches: generatedMatches,
        byes: generatedByes,
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
          is_available: row.is_available ?? false,
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
  ): Promise<{ matches: GeneratedMatch[]; byes: ByeWeek[] }> {
    const matches: GeneratedMatch[] = [];
    const teamMap = new Map(teamAvailability.map(t => [t.team_id, t]));

    // Track home/away alternation per team across weeks
    const teamHomeAwayStatus = new Map<string, 'home' | 'away' | null>();
    teamAvailability.forEach(t => teamHomeAwayStatus.set(t.team_id, null));

    // Create a proper round-robin schedule
    const { schedule, byes: scheduleByes } = this.createRoundRobinSchedule(teamAvailability.map(t => t.team_id), totalWeeks);

    // Convert schedule byes to ByeWeek format
    const byes: ByeWeek[] = scheduleByes.map(bye => {
      const team = teamMap.get(bye.teamId);
      return {
        team_id: bye.teamId,
        team_name: team?.team_name || "Unknown Team",
        week_number: bye.week,
      };
    });

    // Schedule matches week by week
    for (let week = 1; week <= totalWeeks; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
      
      const weekMatches = schedule[week - 1] || [];

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
        
        // Find best available day and time for this match
        const result = await this.findBestMatchTimeWithConflictAvoidance(
          homeTeam,
          awayTeam,
          homeTeamId,
          awayTeamId,
          weekStart
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

    return { matches, byes };
  }

  private createRoundRobinSchedule(teamIds: string[], totalWeeks: number): { schedule: Array<Array<[string, string]>>; byes: Array<{ week: number; teamId: string }> } {
    const schedule: Array<Array<[string, string]>> = [];
    const byes: Array<{ week: number; teamId: string }> = [];
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
      
      // If odd number of teams, the last team in the rotation gets the bye
      // This ensures the bye rotates as teams rotate
      let byeTeamId: string | null = null;
      if (isOdd) {
        // The last team in the array gets the bye
        byeTeamId = teams[teams.length - 1];
        byes.push({ week: round + 1, teamId: byeTeamId });
      }
      
      // Create matches for this round (excluding the team with the bye if odd)
      const teamsForMatches = isOdd ? teams.slice(0, -1) : teams;
      for (let i = 0; i < Math.floor(teamsForMatches.length / 2); i++) {
        const homeTeam = teamsForMatches[i];
        const awayTeam = teamsForMatches[teamsForMatches.length - 1 - i];
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
    
    console.log(`Created round-robin schedule with ${schedule.length} rounds, ${byes.length} bye weeks`);
    
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
    
    return { schedule, byes };
  }

  /**
   * Check if a team meets the minimum availability requirements:
   * 1. Minimum 3 weekdays available
   * 2. At least 1 weekday at 21:00 or 1 weekend day from 9:00 to 12:00
   */
  private meetsMinimumAvailabilityRequirements(team: TeamAvailability): boolean {
    if (!team.availability || team.availability.length === 0) {
      return false;
    }

    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekends = ['saturday', 'sunday'];
    
    // Count available weekdays
    const availableWeekdays = team.availability.filter(day => 
      weekdays.includes(day.day_of_week.toLowerCase()) && day.is_available
    );
    
    // Check if we have minimum 3 weekdays
    const hasMinimumWeekdays = availableWeekdays.length >= 3;
    
    // Check if any weekday plays until 9:00 PM or later (21:00)
    const hasLateWeekday = availableWeekdays.some(day => {
      if (!day.end_time) return false;
      const endTimeStr = String(day.end_time);
      const [hours] = endTimeStr.split(':').map(Number);
      return hours >= 21; // 9:00 PM = 21:00
    });
    
    // Check if any weekend day is available from 9:00 AM to 12:00 PM
    const availableWeekends = team.availability.filter(day => 
      weekends.includes(day.day_of_week.toLowerCase()) && day.is_available
    );
    
    const hasValidWeekend = availableWeekends.some(day => {
      if (!day.start_time || !day.end_time) return false;
      const startTimeStr = String(day.start_time);
      const endTimeStr = String(day.end_time);
      const [startHours] = startTimeStr.split(':').map(Number);
      const [endHours] = endTimeStr.split(':').map(Number);
      // Weekend day from 9:00 AM (9) to at least 12:00 PM (12)
      return startHours <= 9 && endHours >= 12;
    });
    
    // Requirements: 3+ weekdays AND (late weekday OR valid weekend)
    return hasMinimumWeekdays && (hasLateWeekday || hasValidWeekend);
  }

  private async findBestMatchTimeWithConflictAvoidance(
    homeTeam: TeamAvailability,
    awayTeam: TeamAvailability,
    homeTeamId: string,
    awayTeamId: string,
    weekStart: Date
  ): Promise<{ matchDate: Date; matchTime: string; needsManualAssignment: boolean }> {
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    // Validate inputs
    if (!homeTeam || !awayTeam || !homeTeam.availability || !awayTeam.availability) {
      throw new Error("Invalid team data provided for match scheduling");
    }

    if (!weekStart || isNaN(weekStart.getTime())) {
      throw new Error("Invalid week start date provided");
    }
    
    // Check if both teams meet minimum availability requirements
    const homeMeetsRequirements = this.meetsMinimumAvailabilityRequirements(homeTeam);
    const awayMeetsRequirements = this.meetsMinimumAvailabilityRequirements(awayTeam);
    
    // Find common available days with overlapping time ranges
    // A day is "compatible" if both teams are available on that day AND their time ranges overlap
    const findCompatibleDays = () => {
      const compatible: Array<{ day: string; homeSlot: { start_time: string; end_time: string }; awaySlot: { start_time: string; end_time: string } }> = [];
      
      for (const homeSlot of homeTeam.availability) {
        if (!homeSlot.is_available || !homeSlot.day_of_week) continue;
        
        const homeDay = homeSlot.day_of_week.toLowerCase();
        if (!daysOfWeek.includes(homeDay)) {
          console.warn(`Invalid day of week: ${homeSlot.day_of_week} for team ${homeTeam.team_name}`);
          continue;
        }
        
        const homeStart = homeSlot.start_time || "09:00:00";
        const homeEnd = homeSlot.end_time || "18:00:00";
        const [homeStartHours, homeStartMinutes] = String(homeStart).split(':').map(Number);
        const [homeEndHours, homeEndMinutes] = String(homeEnd).split(':').map(Number);
        const homeStartMinutesTotal = homeStartHours * 60 + (homeStartMinutes || 0);
        const homeEndMinutesTotal = homeEndHours * 60 + (homeEndMinutes || 0);
        
        for (const awaySlot of awayTeam.availability) {
          if (!awaySlot.is_available || !awaySlot.day_of_week) continue;
          
          const awayDay = awaySlot.day_of_week.toLowerCase();
          if (awayDay !== homeDay) continue; // Must be same day
          
          if (!daysOfWeek.includes(awayDay)) {
            console.warn(`Invalid day of week: ${awaySlot.day_of_week} for team ${awayTeam.team_name}`);
            continue;
          }
          
          const awayStart = awaySlot.start_time || "09:00:00";
          const awayEnd = awaySlot.end_time || "18:00:00";
          const [awayStartHours, awayStartMinutes] = String(awayStart).split(':').map(Number);
          const [awayEndHours, awayEndMinutes] = String(awayEnd).split(':').map(Number);
          const awayStartMinutesTotal = awayStartHours * 60 + (awayStartMinutes || 0);
          const awayEndMinutesTotal = awayEndHours * 60 + (awayEndMinutes || 0);
          
          // Check if time ranges overlap
          // Overlap exists if: homeStart < awayEnd AND awayStart < homeEnd
          if (homeStartMinutesTotal < awayEndMinutesTotal && awayStartMinutesTotal < homeEndMinutesTotal) {
            compatible.push({
              day: homeDay,
              homeSlot: { start_time: homeStart, end_time: homeEnd },
              awaySlot: { start_time: awayStart, end_time: awayEnd }
            });
            break; // Found a compatible slot for this day, no need to check more away slots
          }
        }
      }
      
      return compatible;
    };
    
    const compatibleDaysWithTimes = findCompatibleDays();
    const commonDays = compatibleDaysWithTimes.map(c => c.day);
    
    // Also get available days for each team (for fallback logic)
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

    // If both teams don't meet minimum availability requirements AND have no common days, mark for manual assignment
    if (!homeMeetsRequirements && !awayMeetsRequirements && commonDays.length === 0) {
      console.warn(`Both teams (${homeTeam.team_name} and ${awayTeam.team_name}) don't meet minimum availability requirements and have no common days, marking for manual assignment`);
      return {
        matchDate: new Date(weekStart), // Placeholder date
        matchTime: DEFAULT_MATCH_TIME,
        needsManualAssignment: true
      };
    }

    // Calculate availability counts for priority logic
    const homeAvailableCount = homeAvailableDays.length;
    const awayAvailableCount = awayAvailableDays.length;
    const MIN_AVAILABILITY_REQUIREMENT = 2; // Minimum days required (for fallback logic)

    // Check if both teams meet minimum requirement (for fallback logic)
    const homeMeetsMinimum = homeAvailableCount >= MIN_AVAILABILITY_REQUIREMENT;
    const awayMeetsMinimum = awayAvailableCount >= MIN_AVAILABILITY_REQUIREMENT;

    // If both teams don't meet minimum requirement AND have no common days, mark for manual assignment
    if (!homeMeetsMinimum && !awayMeetsMinimum && commonDays.length === 0) {
      console.warn(`Both teams (${homeTeam.team_name} and ${awayTeam.team_name}) don't meet minimum availability requirement and have no common days, marking for manual assignment`);
      return {
        matchDate: new Date(weekStart), // Placeholder date
        matchTime: DEFAULT_MATCH_TIME,
        needsManualAssignment: true
      };
    }

    // Try to find a time slot that doesn't conflict with player matches
    // Use compatible days with time overlap information
    for (const compatible of compatibleDaysWithTimes) {
      const day = compatible.day;
      const dayIndex = daysOfWeek.indexOf(day);
      const matchDate = new Date(weekStart);
      // Calculate days until the target day of week
      let daysUntilDay = (dayIndex - weekStart.getDay() + 7) % 7;
      if (daysUntilDay === 0) {
        daysUntilDay = 7; // If same day, schedule for next week
      }
      matchDate.setDate(weekStart.getDate() + daysUntilDay);
      
      // Calculate overlapping time window
      const [homeStartHours, homeStartMinutes] = String(compatible.homeSlot.start_time).split(':').map(Number);
      const [homeEndHours, homeEndMinutes] = String(compatible.homeSlot.end_time).split(':').map(Number);
      const [awayStartHours, awayStartMinutes] = String(compatible.awaySlot.start_time).split(':').map(Number);
      const [awayEndHours, awayEndMinutes] = String(compatible.awaySlot.end_time).split(':').map(Number);
      
      const homeStartMinutesTotal = homeStartHours * 60 + (homeStartMinutes || 0);
      const homeEndMinutesTotal = homeEndHours * 60 + (homeEndMinutes || 0);
      const awayStartMinutesTotal = awayStartHours * 60 + (awayStartMinutes || 0);
      const awayEndMinutesTotal = awayEndHours * 60 + (awayEndMinutes || 0);
      
      // Find the overlap window
      const overlapStart = Math.max(homeStartMinutesTotal, awayStartMinutesTotal);
      const overlapEnd = Math.min(homeEndMinutesTotal, awayEndMinutesTotal);
      
      // Generate possible times within the overlap window (every hour)
      const possibleTimes: string[] = [];
      for (let minutes = overlapStart; minutes <= overlapEnd - 60; minutes += 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        possibleTimes.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`);
      }
      
      // If no hourly slots fit, try the start of the overlap window
      if (possibleTimes.length === 0 && overlapEnd > overlapStart) {
        const hours = Math.floor(overlapStart / 60);
        const mins = overlapStart % 60;
        possibleTimes.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`);
      }
      
      // Use the first available time within the overlap window
      if (possibleTimes.length > 0) {
        return {
          matchDate,
          matchTime: possibleTimes[0],
          needsManualAssignment: false
        };
      }
    }

    // No compatible days found - apply priority logic
    // Priority 1: Team that meets minimum availability requirement

    if (homeMeetsMinimum && !awayMeetsMinimum) {
      // Home team meets minimum, try to schedule on their available days
      for (const day of homeAvailableDays) {
        const dayIndex = daysOfWeek.indexOf(day);
        const matchDate = new Date(weekStart);
        let daysUntilDay = (dayIndex - weekStart.getDay() + 7) % 7;
        if (daysUntilDay === 0) daysUntilDay = 7;
        matchDate.setDate(weekStart.getDate() + daysUntilDay);
        
        return {
          matchDate,
          matchTime: DEFAULT_MATCH_TIME,
          needsManualAssignment: false
        };
      }
    } else if (awayMeetsMinimum && !homeMeetsMinimum) {
      // Away team meets minimum, try to schedule on their available days
      for (const day of awayAvailableDays) {
        const dayIndex = daysOfWeek.indexOf(day);
        const matchDate = new Date(weekStart);
        let daysUntilDay = (dayIndex - weekStart.getDay() + 7) % 7;
        if (daysUntilDay === 0) daysUntilDay = 7;
        matchDate.setDate(weekStart.getDate() + daysUntilDay);
        
        return {
          matchDate,
          matchTime: DEFAULT_MATCH_TIME,
          needsManualAssignment: false
        };
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
        
        return {
          matchDate,
          matchTime: DEFAULT_MATCH_TIME,
          needsManualAssignment: false
        };
      }
    } else if (awayAvailableCount > 0) {
      for (const day of awayAvailableDays) {
        const dayIndex = daysOfWeek.indexOf(day);
        const matchDate = new Date(weekStart);
        let daysUntilDay = (dayIndex - weekStart.getDay() + 7) % 7;
        if (daysUntilDay === 0) daysUntilDay = 7;
        matchDate.setDate(weekStart.getDate() + daysUntilDay);
        
        return {
          matchDate,
          matchTime: DEFAULT_MATCH_TIME,
          needsManualAssignment: false
        };
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

  async saveByeWeeks(
    byes: ByeWeek[],
    leagueId: string
  ): Promise<void> {
    if (byes.length === 0) return;
    
    const byeRecords: NewByeWeek[] = byes.map(bye => ({
      id: randomUUID(),
      league_id: leagueId,
      team_id: bye.team_id,
      week_number: bye.week_number,
    }));

    await this.db.insert(bye_weeks).values(byeRecords);
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
