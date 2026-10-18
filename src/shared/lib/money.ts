const MINOR_UNIT_FACTOR = 100;

export type SplitMode = "equal" | "exact" | "shares";

export interface SplitParticipantShare {
  name: string;
  amountMinor: number;
  amount: number;
}

export interface ComputeSplitSharesInput {
  totalAmount: number;
  participants: readonly string[];
  payerName?: string;
  splitMode?: SplitMode;
  customAmounts?: Record<string, number>;
}

export interface SettlementState {
  totalMinor: number;
  settledMinor: number;
  remainingMinor: number;
  remainingAmount: number;
  status: "open" | "partial" | "settled";
  isSettled: boolean;
}

export interface AppliedSettlement extends SettlementState {
  appliedMinor: number;
  appliedAmount: number;
}

/**
 * Converts a major-unit monetary value (e.g. 10.25) to integer minor units (1025).
 */
export function toMinorUnits(amount: number): number {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) {
    throw new Error("Invalid monetary amount.");
  }
  return Math.round(numericAmount * MINOR_UNIT_FACTOR);
}

/**
 * Converts integer minor units (e.g. 1025) back to major units (10.25).
 */
export function fromMinorUnits(amountMinor: number): number {
  if (!Number.isFinite(amountMinor)) {
    throw new Error("Invalid minor unit amount.");
  }
  return Math.round(amountMinor) / MINOR_UNIT_FACTOR;
}

/**
 * Adds two monetary values using integer minor units.
 */
export function addMoney(firstAmount: number, secondAmount: number): number {
  return fromMinorUnits(toMinorUnits(firstAmount) + toMinorUnits(secondAmount));
}

/**
 * Subtracts secondAmount from firstAmount using integer minor units.
 */
export function subtractMoney(firstAmount: number, secondAmount: number): number {
  return fromMinorUnits(toMinorUnits(firstAmount) - toMinorUnits(secondAmount));
}

/**
 * Sums a list of monetary values using integer minor units.
 */
export function sumMoney(amounts: readonly number[]): number {
  const totalMinor = amounts.reduce((sumMinor, value) => sumMinor + toMinorUnits(value), 0);
  return fromMinorUnits(totalMinor);
}

/**
 * Computes per-participant split shares in integer minor units.
 * Guarantees that all shares sum to totalAmount and assigns any rounding remainder to the payer.
 */
export function computeSplitShares(input: ComputeSplitSharesInput): SplitParticipantShare[] {
  const totalMinor = toMinorUnits(input.totalAmount);
  if (totalMinor <= 0) {
    throw new Error("Split total amount must be greater than zero.");
  }

  const participants = input.participants.map((name) => name.trim()).filter(Boolean);
  if (participants.length === 0) {
    throw new Error("At least one participant is required.");
  }

  const payerName = (input.payerName ?? "You").trim();
  const payerIndex = participants.findIndex(
    (name) => name.toLowerCase() === payerName.toLowerCase(),
  );
  const remainderTargetIndex = payerIndex >= 0 ? payerIndex : 0;
  const splitMode: SplitMode = input.splitMode ?? "equal";
  const customAmounts = input.customAmounts ?? {};

  if (splitMode === "exact") {
    const rawSharesMinor = participants.map((name) => {
      const explicitValue = customAmounts[name];
      return explicitValue !== undefined ? Math.max(0, toMinorUnits(explicitValue)) : null;
    });

    const allocatedMinor = rawSharesMinor.reduce<number>(
      (sumMinor, shareMinor) => sumMinor + (shareMinor ?? 0),
      0,
    );
    const unspecifiedIndices = rawSharesMinor
      .map((shareMinor, index) => (shareMinor === null ? index : -1))
      .filter((index) => index >= 0);

    const resolvedMinor = rawSharesMinor.map((shareMinor, index) => {
      if (shareMinor !== null) return shareMinor;
      if (unspecifiedIndices.length === 1 && unspecifiedIndices[0] === index) {
        return Math.max(0, totalMinor - allocatedMinor);
      }
      return 0;
    });

    const sumMinor = resolvedMinor.reduce((acc, value) => acc + value, 0);
    const diffMinor = totalMinor - sumMinor;
    if (diffMinor !== 0) {
      resolvedMinor[remainderTargetIndex] = Math.max(
        0,
        resolvedMinor[remainderTargetIndex] + diffMinor,
      );
    }

    return participants.map((name, index) => ({
      name,
      amountMinor: resolvedMinor[index],
      amount: fromMinorUnits(resolvedMinor[index]),
    }));
  }

  if (splitMode === "shares") {
    const weights = participants.map((name) => {
      const rawWeight = Number(customAmounts[name] ?? 1);
      return Number.isFinite(rawWeight) && rawWeight > 0 ? rawWeight : 0;
    });
    const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);

    if (totalWeight > 0) {
      const flooredSharesMinor = weights.map((weight) =>
        Math.floor((totalMinor * weight) / totalWeight),
      );
      const allocatedMinor = flooredSharesMinor.reduce((acc, share) => acc + share, 0);
      const remainderMinor = totalMinor - allocatedMinor;
      flooredSharesMinor[remainderTargetIndex] += remainderMinor;

      return participants.map((name, index) => ({
        name,
        amountMinor: flooredSharesMinor[index],
        amount: fromMinorUnits(flooredSharesMinor[index]),
      }));
    }
  }

  const participantCount = participants.length;
  const baseShareMinor = Math.floor(totalMinor / participantCount);
  const remainderMinor = totalMinor - baseShareMinor * participantCount;

  return participants.map((name, index) => {
    const shareMinor =
      baseShareMinor + (index === remainderTargetIndex ? remainderMinor : 0);
    return {
      name,
      amountMinor: shareMinor,
      amount: fromMinorUnits(shareMinor),
    };
  });
}

/**
 * Computes current settlement progress for a split in integer minor units.
 */
export function calculateSettlementState(
  totalAmount: number,
  existingSettlementAmounts: readonly number[],
): SettlementState {
  const totalMinor = toMinorUnits(totalAmount);
  const settledMinor = existingSettlementAmounts.reduce(
    (sumMinor, amount) => sumMinor + toMinorUnits(amount),
    0,
  );
  const remainingMinor = Math.max(0, totalMinor - settledMinor);
  const isSettled = remainingMinor === 0;
  const status: "open" | "partial" | "settled" = isSettled
    ? "settled"
    : settledMinor > 0
      ? "partial"
      : "open";

  return {
    totalMinor,
    settledMinor,
    remainingMinor,
    remainingAmount: fromMinorUnits(remainingMinor),
    status,
    isSettled,
  };
}

/**
 * Validates and applies a new settlement payment against a split's remaining balance in minor units.
 */
export function applySettlement(
  totalAmount: number,
  existingSettlementAmounts: readonly number[],
  settleAmount?: number,
): AppliedSettlement {
  const currentState = calculateSettlementState(totalAmount, existingSettlementAmounts);
  if (currentState.remainingMinor <= 0) {
    throw new Error("Split is already fully settled.");
  }

  if (settleAmount !== undefined) {
    if (!Number.isFinite(settleAmount)) {
      throw new Error("Settlement amount must be a positive number.");
    }
    const requestedMinor = toMinorUnits(settleAmount);
    if (requestedMinor <= 0) {
      throw new Error("Settlement amount must be a positive number.");
    }
  }

  const requestedMinor =
    settleAmount !== undefined ? toMinorUnits(settleAmount) : currentState.remainingMinor;
  const appliedMinor = Math.min(requestedMinor, currentState.remainingMinor);
  const nextSettledMinor = currentState.settledMinor + appliedMinor;
  const nextRemainingMinor = Math.max(0, currentState.totalMinor - nextSettledMinor);
  const isSettled = nextRemainingMinor === 0;
  const status: "open" | "partial" | "settled" = isSettled
    ? "settled"
    : nextSettledMinor > 0
      ? "partial"
      : "open";

  return {
    totalMinor: currentState.totalMinor,
    settledMinor: nextSettledMinor,
    remainingMinor: nextRemainingMinor,
    remainingAmount: fromMinorUnits(nextRemainingMinor),
    appliedMinor,
    appliedAmount: fromMinorUnits(appliedMinor),
    status,
    isSettled,
  };
}

