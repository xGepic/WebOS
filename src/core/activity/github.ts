import { isoDate } from '../time/calendar';
import { formatWhen } from '../format';
import { isRecord } from '../guards';

/**
 * The GitHub Widget's contribution graph, from GitHub's GraphQL API with the
 * user's personal access token. Like the weather, the last answer is stored
 * so a new tab shows it at once, and fetched again once it is an hour old.
 */

export const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

/** The last year of contributions of the token's owner, as GitHub's profile page shows them. */
export const CONTRIBUTIONS_QUERY = `query {
  viewer {
    login
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;

/** How busy a day was, as GitHub shades it: 0 for none, 1–4 for its quartiles. */
export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export interface ContributionDay {
  /** e.g. `2026-11-12` */
  date: string;
  count: number;
  level: ContributionLevel;
}

/** The last contribution graph fetched, as stored. A cache: backups leave it out. */
export interface GitHubContributions {
  /** When it was fetched (epoch milliseconds). */
  fetchedAt: number;
  login: string;
  total: number;
  /** Every day of the last year, oldest first. */
  days: ContributionDay[];
}

/** Why the last fetch failed: GitHub refused the token, or couldn't be reached. */
export type GitHubProblem = 'token' | 'unavailable';

/** What the GitHub Widget shows. */
export type GitHubView =
  | { status: 'no-token' | 'loading' }
  | { status: 'failed'; problem: GitHubProblem }
  | {
      status: 'ready';
      login: string;
      /** e.g. "1,284" */
      total: string;
      /** Weeks from Sunday to Saturday, oldest first; days outside the year are null. */
      weeks: (ContributionDay | null)[][];
      /** The month each week starts, e.g. "Nov", aligned with `weeks`; null where no label goes. */
      months: (string | null)[];
      /** Contributions so far today. */
      today: number;
      /** A short line on today and the streak, e.g. "12 days in a row. Keep it going." */
      message: string;
      /** Days in a row with a contribution, up to today; today counts once it has one. */
      currentStreak: number;
      longestStreak: number;
      /** When the shown graph was fetched, e.g. "Yesterday", if that was over two hours ago. */
      updatedAt?: string;
      /** Why the graph couldn't be fetched again, if it couldn't. */
      problem?: GitHubProblem;
    };

const MINUTE = 60_000;
/** A new tab fetches the graph again once it is this old. */
export const REFRESH_AFTER_MS = 60 * MINUTE;
/** Older than this, the Widget says when the graph it shows is from. */
const SAY_WHEN_AFTER_MS = 120 * MINUTE;

const LEVELS: Record<string, ContributionLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** The contribution graph in a GraphQL response. Throws if the response holds errors or isn't what webOS asked for. */
export function parseContributions(response: unknown, fetchedAt: number): GitHubContributions {
  if (isRecord(response) && Array.isArray(response['errors']) && response['errors'].length) {
    throw new Error('GitHub answered with errors.');
  }
  const viewer = isRecord(response) && isRecord(response['data']) ? response['data']['viewer'] : undefined;
  const collection = isRecord(viewer) ? viewer['contributionsCollection'] : undefined;
  const calendar = isRecord(collection) ? collection['contributionCalendar'] : undefined;
  if (!isRecord(viewer) || typeof viewer['login'] !== 'string' || !isRecord(calendar) || !Array.isArray(calendar['weeks'])) {
    throw new Error('The GitHub response has an unexpected shape.');
  }
  const days = calendar['weeks'].flatMap((week) =>
    (isRecord(week) && Array.isArray(week['contributionDays']) ? week['contributionDays'] : []).flatMap((day) =>
      isRecord(day) && typeof day['date'] === 'string' && isCount(day['contributionCount'])
        ? [{ date: day['date'], count: day['contributionCount'], level: LEVELS[String(day['contributionLevel'])] ?? 0 }]
        : [],
    ),
  );
  const total = isCount(calendar['totalContributions'])
    ? calendar['totalContributions']
    : days.reduce((sum, day) => sum + day.count, 0);
  return { fetchedAt, login: viewer['login'], total, days: days.sort((a, b) => a.date.localeCompare(b.date)) };
}

/** Whether a new tab should fetch the graph again. */
export const isDue = (contributions: GitHubContributions | null, now: number) =>
  !contributions || now - contributions.fetchedAt >= REFRESH_AFTER_MS;

/** The day of the week of `2026-11-12`, Sunday 0. */
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

/** The days in weeks from Sunday to Saturday, as GitHub draws them; the first and last weeks may be partial. */
function inWeeks(days: readonly ContributionDay[]): (ContributionDay | null)[][] {
  const weeks: (ContributionDay | null)[][] = [];
  for (const day of days) {
    const index = weekday(day.date);
    if (!weeks.length || index === 0) weeks.push(Array<ContributionDay | null>(7).fill(null));
    weeks[weeks.length - 1][index] = day;
  }
  return weeks;
}

/** "Nov" for `2026-11-01`. */
const monthName = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });

/** A month label is this many weeks wide: a label closer than this to the next one is left out. */
const LABEL_WEEKS = 3;

/** A label over each week that holds the 1st of a month, and over the first week, unless the next label would crowd it. */
function monthLabels(weeks: readonly (ContributionDay | null)[][]): (string | null)[] {
  const labels = weeks.map((week, index) => {
    const first = week.find((day) => day?.date.endsWith('-01')) ?? (index === 0 ? week.find((day) => day) : undefined);
    return first ? monthName(first.date) : null;
  });
  return labels.map((label, index) =>
    label && labels.slice(index + 1, index + LABEL_WEEKS).some((next) => next) ? null : label,
  );
}

/** A line on today and the streak, in words. */
function todayMessage(today: number, current: number, thisWeek: number): string {
  if (today > 0) return current > 1 ? `${current} days in a row. Keep it going.` : 'A new streak starts today.';
  if (current > 0) return `Nothing yet today. One contribution keeps your ${current}-day streak.`;
  if (thisWeek > 0) return `Nothing yet today, ${thisWeek} so far this week.`;
  return 'A quiet week so far. Today is a good day to start.';
}

/** The current and longest runs of days with a contribution, up to `today`. */
function streaks(days: readonly ContributionDay[], today: string) {
  const past = days.filter((day) => day.date <= today);
  let longest = 0;
  let run = 0;
  for (const day of past) {
    run = day.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // A day without a contribution yet doesn't break the streak until it is over.
  const counted = past.at(-1)?.date === today && past.at(-1)!.count === 0 ? past.slice(0, -1) : past;
  let current = 0;
  for (let i = counted.length - 1; i >= 0 && counted[i].count > 0; i--) current++;
  return { current, longest };
}

/** What the Widget shows for the token, the stored graph, and how this tab's last fetch went. */
export function gitHubView(
  hasToken: boolean,
  contributions: GitHubContributions | null,
  { problem, now }: { problem: GitHubProblem | undefined; now: Date },
): GitHubView {
  if (!hasToken) return { status: 'no-token' };
  if (!contributions) return problem ? { status: 'failed', problem } : { status: 'loading' };
  const todayDate = isoDate(now);
  const { current, longest } = streaks(contributions.days, todayDate);
  const weeks = inWeeks(contributions.days);
  const today = contributions.days.find((day) => day.date === todayDate)?.count ?? 0;
  const sunday = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()));
  const thisWeek = contributions.days.reduce(
    (sum, day) => sum + (day.date >= sunday && day.date <= todayDate ? day.count : 0),
    0,
  );
  return {
    status: 'ready',
    login: contributions.login,
    total: contributions.total.toLocaleString('en-US'),
    weeks,
    months: monthLabels(weeks),
    today,
    message: todayMessage(today, current, thisWeek),
    currentStreak: current,
    longestStreak: longest,
    updatedAt:
      now.getTime() - contributions.fetchedAt > SAY_WHEN_AFTER_MS ? formatWhen(new Date(contributions.fetchedAt), now) : undefined,
    problem,
  };
}
