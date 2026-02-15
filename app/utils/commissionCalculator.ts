/**
 * Commission Calculation Utility
 * 
 * Calculates final net profit/loss based on:
 * - Compared amount (profit/loss)
 * - User commission percentage
 * - Partnership percentage
 * - Commission type
 */

export type CommissionType = 'no_commission' | 'profit_loss' | 'entrywise';

export interface CommissionInput {
  profitLoss: number;        // Compared amount (e.g., 936600)
  commissionPercent: number; // User commission (e.g., 3)
  partnershipPercent: number; // Partnership (e.g., 20)
  commissionType: CommissionType;
}

export interface CommissionResult {
  comparedAmount: number;
  userCommission: number;
  partnershipOnCommission: number;
  totalCommissionAfterPartnership: number;
  partnershipAmount: number;
  netProfitLoss: number;
}

/**
 * Calculate final net profit/loss with commission and partnership
 * 
 * Formula:
 * - Commission only applies when profitLoss > 0
 * - Partnership applies to both commission and main amount
 * - Net = P × (1 - R) × (1 - C) when profit > 0
 * - Net = P × (1 - R) when profit <= 0
 */
export function calculateFinalNetProfit({
  profitLoss,
  commissionPercent,
  partnershipPercent,
  commissionType,
}: CommissionInput): CommissionResult {
  const comparedAmount = profitLoss;
  const partnershipRate = partnershipPercent / 100;
  const commissionRate = commissionPercent / 100;

  let userCommission = 0;
  let partnershipOnCommission = 0;
  let totalCommissionAfterPartnership = 0;
  let partnershipAmount = 0;
  let netProfitLoss = 0;

  if (comparedAmount < 0) {
    // LOSS SCENARIO: No commission, only partnership split
    // Partnership percentage represents USER's share
    // Admin gets (100 - partnership)%
    const absLoss = Math.abs(comparedAmount);
    
    // No commission on loss
    userCommission = 0;
    partnershipOnCommission = 0;
    totalCommissionAfterPartnership = 0;
    
    // User's share (Cust Net with Comm) = loss × partnership%
    partnershipAmount = -absLoss * partnershipRate;
    
    // Admin's share (Net Profit/Loss) = loss × (1 - partnership%)
    netProfitLoss = -absLoss * (1 - partnershipRate);
  } else if (commissionType === 'profit_loss' && comparedAmount > 0) {
    // PROFIT SCENARIO: Apply commission and partnership
    // Partnership deduction on main amount
    partnershipAmount = comparedAmount * (1 - partnershipRate);
    
    // User commission on profit amount
    userCommission = comparedAmount * commissionRate;

    // Partnership share from commission
    partnershipOnCommission = userCommission * partnershipRate;

    // Total commission after partnership deduction
    totalCommissionAfterPartnership = userCommission - partnershipOnCommission;

    // Final net profit/loss
    netProfitLoss = partnershipAmount - totalCommissionAfterPartnership;
  } else if (commissionType === 'no_commission') {
    // No commission, only partnership
    partnershipAmount = comparedAmount * (1 - partnershipRate);
    netProfitLoss = partnershipAmount;
  } else {
    // Entrywise case - no commission on main amount (handled separately)
    partnershipAmount = comparedAmount * (1 - partnershipRate);
    netProfitLoss = partnershipAmount;
  }

  return {
    comparedAmount,
    userCommission,
    partnershipOnCommission,
    totalCommissionAfterPartnership,
    netProfitLoss,
    partnershipAmount,
  };
}

/**
 * Calculate entrywise commission (commission only on loss amount)
 */
export function calculateEntrywiseCommission({
  totalProfit,
  totalLoss,
  commissionPercent,
  partnershipPercent,
}: {
  totalProfit: number;
  totalLoss: number;
  commissionPercent: number;
  partnershipPercent: number;
}): CommissionResult {
  const entrywiseNetProfitLoss = totalProfit + totalLoss;
  const partnershipRate = partnershipPercent / 100;
  const commissionRate = commissionPercent / 100;

  // Commission only on loss amount
  const lossCommission = Math.abs(totalLoss) * commissionRate;

  // Partnership deduction on commission
  const partnershipOnCommission = lossCommission * partnershipRate;
  const totalCommissionAfterPartnership = lossCommission - partnershipOnCommission;

  // Partnership deduction on net profit/loss
  const partnershipAmount = entrywiseNetProfitLoss * (1 - partnershipRate);

  // Final net profit/loss
  const netProfitLoss = partnershipAmount - totalCommissionAfterPartnership;

  return {
    comparedAmount: entrywiseNetProfitLoss,
    userCommission: lossCommission,
    partnershipOnCommission,
    totalCommissionAfterPartnership,
    partnershipAmount,
    netProfitLoss,
  };
}

