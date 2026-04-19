function normalizeCourseName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function looksLikeRoomToken(token: string) {
  return /^[a-z]{1,4}\d{2,4}[a-z]?$/i.test(token) || /^\d{2,4}[a-z]?$/i.test(token);
}

function getBaseTokens(value: string) {
  const normalized = normalizeCourseName(value);
  if (!normalized) {
    return [];
  }

  const tokens = normalized.split(" ").filter(Boolean);
  let endIndex = tokens.length;

  while (endIndex > 1) {
    const lastToken = tokens[endIndex - 1] ?? "";
    const previousToken = tokens[endIndex - 2] ?? "";

    if (looksLikeRoomToken(lastToken)) {
      endIndex -= 1;
      continue;
    }

    if (endIndex > 2 && /^[a-z]{1,4}$/i.test(previousToken) && /^\d{2,4}[a-z]?$/i.test(lastToken)) {
      endIndex -= 2;
      continue;
    }

    break;
  }

  return tokens.slice(0, endIndex);
}

function areTokensCompatible(left: string, right: string) {
  if (left === right) {
    return true;
  }

  const shorter = left.length <= right.length ? left : right;
  const longer = shorter === left ? right : left;

  if (shorter.length <= 2) {
    return false;
  }

  return longer.startsWith(shorter);
}

function allTokensMatch(sourceTokens: string[], targetTokens: string[]) {
  return sourceTokens.every((sourceToken) =>
    targetTokens.some((targetToken) => areTokensCompatible(sourceToken, targetToken))
  );
}

export function isLikelySameCourse(left: string, right: string) {
  const leftTokens = getBaseTokens(left);
  const rightTokens = getBaseTokens(right);

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return false;
  }

  const leftNormalized = leftTokens.join(" ");
  const rightNormalized = rightTokens.join(" ");

  if (leftNormalized === rightNormalized) {
    return true;
  }

  const shorter = leftNormalized.length <= rightNormalized.length ? leftNormalized : rightNormalized;
  const longer = shorter === leftNormalized ? rightNormalized : leftNormalized;

  if (shorter.length >= 4 && longer.includes(shorter)) {
    return true;
  }

  const smallerTokens = leftTokens.length <= rightTokens.length ? leftTokens : rightTokens;
  const largerTokens = smallerTokens === leftTokens ? rightTokens : leftTokens;

  return allTokensMatch(smallerTokens, largerTokens);
}
