/**
 * Entrywise Commission Calculation Utility
 * 
 * Calculates commission and net profit/loss for entrywise commission type users.
 * 
 * Logic:
 * 1. Calculate Win Side Total (Green Fav × Rate + Red Non-Fav Amount)
 * 2. Calculate Lost Side Total (Green Fav Amount + Red Non-Fav × Rate)
 * 3. Gross Difference = Larger Total - Smaller Total
 * 4. Commission = Lost Side Total × Commission%
 * 5. Net After Commission = Gross Difference - Commission
 * 6. Apply Partnership on Net After Commission
 */

export interface EntrywiseInput {
  winningTeamTotal: number;    // Win side total (what we pay out)
  losingTeamTotal: number;     // Lost side total (what we receive)
  commissionPercent: number;  // User commission percentage (e.g., 3)
  partnershipPercent: number;  // Partnership percentage (e.g., 20)
}

export interface EntrywiseResult {
  grossDifference: number;           // Larger Total - Smaller Total
  commission: number;                 // Lost Side Total × Commission%
  netAfterCommission: number;        // Gross Difference - Commission
  commissionAfterPartnership: number;  // Commission after partnership (for display)
  custNetWithComm: number;           // Partner share (Net After Commission × Partnership%)
  netProfitLoss: number;              // System share (Net After Commission × (1 - Partnership%))
}

/**
 * Calculate entrywise commission and net profit/loss
 * 
 * @param input - Entrywise calculation input parameters
 * @returns Entrywise calculation result
 */
export function calculateEntrywise({
  winningTeamTotal,
  losingTeamTotal,
  commissionPercent,
  partnershipPercent,
}: EntrywiseInput): EntrywiseResult {
  // Validate and clamp percentages
  const c = Math.max(0, Math.min(commissionPercent, 100)) / 100;
  const s = Math.max(0, Math.min(partnershipPercent, 100)) / 100;

  // Round helper function
  const round = (n: number) => Math.round(n * 100) / 100;

  // Step 1: Calculate Gross Difference (Larger - Smaller, always positive)
  const grossDifference = Math.abs(winningTeamTotal - losingTeamTotal);
  const isLosingTeamLarger = losingTeamTotal > winningTeamTotal;

  // Step 2: Calculate Commission on Lost Side Total
  const commission = losingTeamTotal * c;

  // Step 3: Calculate Net After Commission
  const netAfterCommission = grossDifference - commission;

  // Step 4: Apply Partnership on Net After Commission
  // Partner share (Cust Net With Comm)
  const custNetWithComm = netAfterCommission * s;

  // System share (Net Profit/Loss)
  const netProfitLoss = netAfterCommission * (1 - s);

  // Commission after partnership (for display consistency)
  const commissionAfterPartnership = commission * (1 - s);

  return {
    grossDifference: round(grossDifference),
    commission: round(commission),
    netAfterCommission: round(netAfterCommission),
    commissionAfterPartnership: round(commissionAfterPartnership),
    custNetWithComm: round(custNetWithComm),
    netProfitLoss: round(netProfitLoss),
  };
}

