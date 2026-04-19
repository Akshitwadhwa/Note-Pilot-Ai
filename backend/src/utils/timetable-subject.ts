const IGNORED_TIMETABLE_LABELS = new Set(["lunch", "break", "recess"]);

function normalizeSpacing(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isCompactVenueToken(token: string) {
  return /^[a-z]{1,4}\d{2,4}[a-z]?$/i.test(token) || /^\d{2,4}[a-z]?$/i.test(token);
}

function isSplitVenuePrefix(token: string) {
  return /^[a-z]{1,4}$/i.test(token);
}

function isSplitVenueNumber(token: string) {
  return /^\d{2,4}[a-z]?$/i.test(token);
}

export function sanitizeTimetableSubjectName(value: string) {
  const normalized = normalizeSpacing(value);
  if (!normalized) {
    return "";
  }

  const tokens = normalized.split(" ").filter(Boolean);
  let endIndex = tokens.length;

  while (endIndex > 1) {
    const lastToken = tokens[endIndex - 1] ?? "";
    const previousToken = tokens[endIndex - 2] ?? "";

    if (isCompactVenueToken(lastToken)) {
      endIndex -= 1;
      continue;
    }

    if (endIndex > 2 && isSplitVenuePrefix(previousToken) && isSplitVenueNumber(lastToken)) {
      endIndex -= 2;
      continue;
    }

    break;
  }

  const sanitized = normalizeSpacing(tokens.slice(0, endIndex).join(" "));
  return IGNORED_TIMETABLE_LABELS.has(sanitized.toLowerCase()) ? "" : sanitized.slice(0, 120);
}

export function isIgnoredTimetableSubject(value: string) {
  return sanitizeTimetableSubjectName(value).length === 0;
}
