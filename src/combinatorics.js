export function combinationCount(n, k) {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0) {
    throw new RangeError("n and k must be non-negative integers");
  }
  if (k > n) return 0;
  const r = Math.min(k, n - k);
  let result = 1;
  for (let index = 1; index <= r; index += 1) {
    result = (result * (n - r + index)) / index;
  }
  return result;
}

export function countSubsetsContainingRequiredCards(
  deckSize,
  requiredPhysicalCardCount,
  handSize
) {
  if (!Number.isInteger(requiredPhysicalCardCount) || requiredPhysicalCardCount < 0) {
    throw new RangeError("requiredPhysicalCardCount must be a non-negative integer");
  }
  if (!Number.isInteger(handSize) || handSize < 0) {
    throw new RangeError("handSize must be a non-negative integer");
  }
  if (requiredPhysicalCardCount > handSize || requiredPhysicalCardCount > deckSize) {
    return 0;
  }
  return combinationCount(
    deckSize - requiredPhysicalCardCount,
    handSize - requiredPhysicalCardCount
  );
}

export function product(values) {
  let result = 1;
  for (const value of values) result *= value;
  return result;
}
