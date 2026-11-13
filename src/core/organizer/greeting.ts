/**
 * Morning 05:00–11:59, afternoon 12:00–16:59, evening 17:00–21:59, night otherwise.
 * Includes the user's name when one is set.
 */
export function greetingFor(time: Date, name: string): string {
  const greeting = timeOfDayGreeting(time.getHours());
  const trimmed = name.trim();
  return trimmed ? `${greeting}, ${trimmed}` : greeting;
}

function timeOfDayGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Good night';
}
