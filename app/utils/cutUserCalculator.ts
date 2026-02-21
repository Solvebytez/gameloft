/**
 * Cut User Calculation Utility
 * 
 * For cut type users, the win/loss calculation is reversed:
 * - Winning entries are treated as losing entries
 * - Losing entries are treated as winning entries
 * - Favorite entries are treated as non-favorite entries
 * - Non-favorite entries are treated as favorite entries
 * 
 * This utility reverses the team totals before applying commission calculations.
 */

export interface CutUserCalculationInput {
  winningTeamFav: number;      // Original winning team + Favorite entries
  winningTeamNonFav: number;   // Original winning team + Non-Favorite entries
  losingTeamFav: number;       // Original losing team + Favorite entries
  losingTeamNonFav: number;    // Original losing team + Non-Favorite entries
}

export interface CutUserCalculationResult {
  winningTeamFav: number;      // Reversed: losing team + non-favorite entries
  winningTeamNonFav: number;   // Reversed: losing team + favorite entries
  losingTeamFav: number;       // Reversed: winning team + non-favorite entries
  losingTeamNonFav: number;    // Reversed: winning team + favorite entries
  winningTeamTotal: number;    // Reversed winning team total
  losingTeamTotal: number;     // Reversed losing team total
}

/**
 * Reverse the win/loss calculation for cut type users
 * 
 * @param input - Original team totals from entry calculation
 * @returns Reversed team totals for cut type user calculation
 */
export function reverseCutUserCalculation({
  winningTeamFav,
  winningTeamNonFav,
  losingTeamFav,
  losingTeamNonFav,
}: CutUserCalculationInput): CutUserCalculationResult {
  // For cut users, reverse the logic:
  // - Winning team + Favorite entries becomes Losing team + Non-Favorite entries
  // - Winning team + Non-Favorite entries becomes Losing team + Favorite entries
  // - Losing team + Favorite entries becomes Winning team + Non-Favorite entries
  // - Losing team + Non-Favorite entries becomes Winning team + Favorite entries
  
  // Swap winning and losing, and swap fav and non-fav
  const reversedWinningTeamFav = losingTeamNonFav;      // Original losing non-fav → new winning fav
  const reversedWinningTeamNonFav = losingTeamFav;     // Original losing fav → new winning non-fav
  const reversedLosingTeamFav = winningTeamNonFav;     // Original winning non-fav → new losing fav
  const reversedLosingTeamNonFav = winningTeamFav;     // Original winning fav → new losing non-fav

  const reversedWinningTeamTotal = reversedWinningTeamFav + reversedWinningTeamNonFav;
  const reversedLosingTeamTotal = reversedLosingTeamFav + reversedLosingTeamNonFav;

  return {
    winningTeamFav: reversedWinningTeamFav,
    winningTeamNonFav: reversedWinningTeamNonFav,
    losingTeamFav: reversedLosingTeamFav,
    losingTeamNonFav: reversedLosingTeamNonFav,
    winningTeamTotal: reversedWinningTeamTotal,
    losingTeamTotal: reversedLosingTeamTotal,
  };
}

