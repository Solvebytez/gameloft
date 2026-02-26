/**
 * Entrywise Commission Calculation Utility
 * 
 * Calculates commission and net profit/loss for entrywise commission type users.
 * 
 * Logic:
 * 1. Calculate Win Side Total (Green Fav × Rate + Red Non-Fav Amount)
 * 2. Calculate Lost Side Total (Green Fav Amount + Red Non-Fav × Rate)
 * 3. Gross Difference = Larger Total - Smaller Total (for reference)
 * 4. Commission = Lost Side Total × Commission%
 * 5. Profit/Loss = Losing Team Total - Winning Team Total (can be negative)
 * 6. Net After Commission = Profit/Loss - Commission
 * 7. Apply Partnership on Net After Commission
 */

export interface EntrywiseInput {
  winningTeamTotal: number;    // Win side total (what we pay out)
  losingTeamTotal: number;     // Lost side total (what we receive)
  commissionPercent: number;  // User commission percentage (e.g., 3)
  partnershipPercent: number;  // Partnership percentage (e.g., 20)
}

export interface EntrywiseResult {
  grossDifference: number;           // Larger Total - Smaller Total (for reference)
  commission: number;                 // Lost Side Total × Commission%
  netAfterCommission: number;        // Profit/Loss - Commission
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

  // Step 1: Calculate Gross Difference (Larger - Smaller, always positive) - for reference
  const grossDifference = Math.abs(winningTeamTotal - losingTeamTotal);
  
  // Step 2: Calculate Commission on Lost Side Total
  const commission = losingTeamTotal * c;

  // Step 3: Calculate Profit/Loss (can be negative)
  // Profit/Loss = What we RECEIVE - What we PAY OUT = Losing Team Total - Winning Team Total
  const profitLoss = losingTeamTotal - winningTeamTotal;

  // Step 4: Calculate Net After Commission using actual profitLoss (not grossDifference)
  const netAfterCommission = profitLoss - commission;

  // Step 5: Apply Partnership on Net After Commission (no sign multiplication needed)
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

