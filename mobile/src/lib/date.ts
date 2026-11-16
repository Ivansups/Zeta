function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Returns consecutive ISO dates starting at `start`, inclusive. */
export function buildDateOptions(start: string, count: number): string[] {
  const startDate = parseIsoDate(start);
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + offset);
    return toIsoDate(date);
  });
}

/** Formats an ISO date as `дд.мм` for compact display. */
export function formatDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${day}.${month}`;
}
