const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseLocalDate(dateString: string): Date {
  const match = DATE_ONLY_REGEX.exec(dateString.trim());
  if (match) {
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(year, monthIndex, day, 0, 0, 0, 0);
  }
  return new Date(dateString);
}

export function startOfLocalDay(referenceDate = new Date()): Date {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0,
  );
}

export function endOfLocalDay(referenceDate = new Date()): Date {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    23,
    59,
    59,
    999,
  );
}

export function startOfLocalMonth(referenceDate = new Date()): Date {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );
}

export function endOfLocalMonth(referenceDate = new Date()): Date {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}

export function startOfNextLocalMonth(referenceDate = new Date()): Date {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    1,
    0,
    0,
    0,
    0,
  );
}

export function formatLocalDateKey(referenceDate = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

