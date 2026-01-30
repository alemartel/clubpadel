/**
 * Round-robin pairings for even N (e.g. 6, 8, 10, 12, 14 teams).
 * Produces N-1 rounds with N/2 matches per round; each pair plays exactly once.
 */
export function createRoundRobinPairings(teamIds: string[]): {
  round_number: number;
  home_team_id: string;
  away_team_id: string;
}[] {
  const n = teamIds.length;
  if (n % 2 !== 0) {
    throw new Error("Round robin requires an even number of teams");
  }
  const numRounds = n - 1;
  const matchesPerRound = n / 2;

  let teams = [...teamIds];
  const result: { round_number: number; home_team_id: string; away_team_id: string }[] = [];

  for (let round = 0; round < numRounds; round++) {
    for (let i = 0; i < matchesPerRound; i++) {
      const homeTeam = teams[i];
      const awayTeam = teams[teams.length - 1 - i];
      result.push({
        round_number: round + 1,
        home_team_id: homeTeam,
        away_team_id: awayTeam,
      });
    }
    // Rotate: keep first fixed, rotate rest clockwise
    if (teams.length > 2) {
      const fixedTeam = teams[0];
      const rotatingTeams = teams.slice(1);
      const rotatedTeams = [
        rotatingTeams[rotatingTeams.length - 1],
        ...rotatingTeams.slice(0, -1),
      ];
      teams = [fixedTeam, ...rotatedTeams];
    }
  }

  return result;
}
