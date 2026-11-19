import { formatWhen } from '../format';
import { isRecord } from '../guards';

/**
 * The GitHub Widget's commit counts: the commits of the token's owner this
 * month and last month, over all their repositories, from GitHub's GraphQL API.
 * Like the weather, the last answer is stored so a new tab shows it at once,
 * and fetched again once it is an hour old, or from another month.
 */

export const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

/** The commits of the token's owner in two spans of time: this month so far, and last month. */
export const COMMITS_QUERY = `query ($thisMonth: DateTime!, $now: DateTime!, $lastMonth: DateTime!, $lastMonthEnd: DateTime!) {
  viewer {
    login
    thisMonth: contributionsCollection(from: $thisMonth, to: $now) { totalCommitContributions }
    lastMonth: contributionsCollection(from: $lastMonth, to: $lastMonthEnd) { totalCommitContributions }
  }
}`;

/** The last commit counts fetched, as stored. A cache: backups leave it out. */
export interface GitHubCommits {
  /** When they were fetched (epoch milliseconds). */
  fetchedAt: number;
  login: string;
  /** The local month they were fetched in, as `2026-11`: "this month" is that one. */
  month: string;
  thisMonth: number;
  lastMonth: number;
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
      /** Commits this month so far. */
      thisMonth: number;
      lastMonth: number;
      /** When the shown counts were fetched, e.g. "Yesterday", if that was over two hours ago. */
      updatedAt?: string;
      /** Why the counts couldn't be fetched again, if they couldn't. */
      problem?: GitHubProblem;
    };

const MINUTE = 60_000;
/** A new tab fetches the counts again once they are this old. */
export const REFRESH_AFTER_MS = 60 * MINUTE;
/** Older than this, the Widget says when the counts it shows are from. */
const SAY_WHEN_AFTER_MS = 120 * MINUTE;

/** The local month of `date`, as `2026-11`. */
export const monthOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/** The query's variables at `now`: this month from its first local midnight to now, and all of last month. */
export function commitsVariables(now: Date): Record<string, string> {
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    thisMonth: thisMonth.toISOString(),
    now: now.toISOString(),
    lastMonth: lastMonth.toISOString(),
    lastMonthEnd: new Date(thisMonth.getTime() - 1).toISOString(),
  };
}

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** The commits in one of the query's contribution collections, or undefined if it isn't there. */
const commitsIn = (collection: unknown) =>
  isRecord(collection) && isCount(collection['totalCommitContributions']) ? collection['totalCommitContributions'] : undefined;

/** The commit counts in a GraphQL response at `now`. Throws if the response holds errors or isn't what webOS asked for. */
export function parseCommits(response: unknown, now: Date): GitHubCommits {
  if (isRecord(response) && Array.isArray(response['errors']) && response['errors'].length) {
    throw new Error('GitHub answered with errors.');
  }
  const viewer = isRecord(response) && isRecord(response['data']) ? response['data']['viewer'] : undefined;
  const thisMonth = isRecord(viewer) ? commitsIn(viewer['thisMonth']) : undefined;
  const lastMonth = isRecord(viewer) ? commitsIn(viewer['lastMonth']) : undefined;
  if (!isRecord(viewer) || typeof viewer['login'] !== 'string' || thisMonth === undefined || lastMonth === undefined) {
    throw new Error('The GitHub response has an unexpected shape.');
  }
  return { fetchedAt: now.getTime(), login: viewer['login'], month: monthOf(now), thisMonth, lastMonth };
}

/** Whether stored counts are for the month of `now`: from another month, "this month" means another one. */
const isCurrent = (commits: GitHubCommits | null, now: Date): commits is GitHubCommits =>
  isRecord(commits) && commits.month === monthOf(now);

/** Whether a new tab should fetch the counts again: there are none, they are an hour old, or from another month. */
export const isDue = (commits: GitHubCommits | null, now: Date) =>
  !isCurrent(commits, now) || now.getTime() - commits.fetchedAt >= REFRESH_AFTER_MS;

/** What the Widget shows for the token, the stored counts, and how this tab's last fetch went. */
export function gitHubView(
  hasToken: boolean,
  commits: GitHubCommits | null,
  { problem, now }: { problem: GitHubProblem | undefined; now: Date },
): GitHubView {
  if (!hasToken) return { status: 'no-token' };
  if (!isCurrent(commits, now)) return problem ? { status: 'failed', problem } : { status: 'loading' };
  return {
    status: 'ready',
    login: commits.login,
    thisMonth: commits.thisMonth,
    lastMonth: commits.lastMonth,
    ...(now.getTime() - commits.fetchedAt > SAY_WHEN_AFTER_MS ? { updatedAt: formatWhen(new Date(commits.fetchedAt), now) } : {}),
    ...(problem ? { problem } : {}),
  };
}
