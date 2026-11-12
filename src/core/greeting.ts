/** Morning 05:00–11:59, afternoon 12:00–16:59, evening 17:00–21:59, night otherwise. */
export function greetingFor(time: Date): string {
  const hour = time.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Good night';
}
