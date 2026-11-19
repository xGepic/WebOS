# Spec 0027: The GitHub Widget, Smaller

Status: built (2026-11-19)
Related: [Spec 0002: More Widgets](0002-more-widgets.md), [Spec 0003: A Leaner Desktop](0003-leaner-desktop.md), [Spec 0014: The New Tabs Widget](0014-new-tabs.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, I want to know how much I am actually shipping. The old GitHub Widget showed a year of contributions as a heatmap, nine columns wide; it took a lot of the Desktop for a picture I rarely read, so [Spec 0003](0003-leaner-desktop.md) removed it. What I miss is just the number: how many commits this month, and whether that is more or less than last month.

## Solution

The **GitHub Widget** comes back, the size of the Countdown, with two numbers side by side: commits this month and commits last month, over all my repositories, large and thin like the New Tabs count. It reads them with a personal access token set in Settings › GitHub, as the old one did.

## User Stories

1. As a developer, I want to see my commits this month, so that I know how much I have shipped.
2. As a developer, I want last month's commits beside them, so that I can tell a slow month from a busy one.
3. As a developer, I want commits from all my repositories counted, private ones too when my token can read them, so that the number is the whole picture.
4. As a developer, I want the Widget small, so that it doesn't take the room the heatmap did.
5. As a developer, I want the numbers on screen at once in a new tab, so that the Widget doesn't flicker while it loads.
6. As a developer, I want my token kept out of backups, so that no secret sits in a file.
7. As a developer, I want to be told when GitHub refuses the token, so that I know to replace it.

## Implementation Decisions

- The core asks GitHub's GraphQL API (`https://api.github.com/graphql`) for the viewer's `login` and two `contributionsCollection`s: this month from its first local midnight to now, and last month from its first local midnight to the last millisecond before this month. Each gives `totalCommitContributions`: GitHub's own count of the user's commits, as on their profile, over every repository it counts them in.
- The token is sent as `Authorization: bearer …` and nowhere else. The extension holds `https://api.github.com/*` as a host permission again.
- The answer is stored as `github.commits: { fetchedAt, login, month, thisMonth, lastMonth }`, with `month` the local month it was fetched in (`2026-11`). A new tab shows it at once and fetches again once it is an hour old, through the same refresher as the weather. Counts from another month aren't shown: once the month turns, "this month" means another one, so the Widget says it is counting until the new month's counts are in.
- `github.view()` is `no-token`, `loading`, `failed` (`token` when GitHub answers 401 or 403, otherwise `unavailable`), or `ready` with the login and the two counts. When a fetch fails with counts stored, they stay, with the problem; counts over two hours old say when they are from.
- **Schema 29** adds `github: { token: '', commits: null }`. It also drops any layout entry left from the old GitHub Widget (versions 10 to 14), so the Widget starts hidden everywhere. Backups leave out the token and the counts; importing one keeps this machine's token and fetches the counts afresh.
- The Widget `github` is S 3 × 2, M 3 × 3 and L 6 × 3, like the Countdown and New Tabs. It isn't in the Stage layout: it needs a token first, so a fresh Desktop has it hidden too, for Edit Mode to show.
- The Widget shows the two numbers side by side, each above its label ("commits this month", "commits last month"), last month's a little quieter. Its Title Bar names the login. Without a token, or with one GitHub refused, it says so with a button that opens Settings. It opens no App.
- Settings › GitHub comes back: it says whether a token is set, takes a new one in a password field, and removes it. Its hint says how to make a token, and that counting private repositories needs one that can read them.

## Testing Decisions

- Core tests through the public API: no token and no fetch without one; the request with its token and its variables, this month and last month, also across the turn of the year; keeping the counts for an hour, then fetching again; not showing last month's counts as this month's after the month turns; saying when the counts are from; a refused token; an answer with errors or an unexpected shape; removing the token; the token and counts left out of backups and this machine's token kept on import; the migration from schema 28, dropping an old layout entry.
- The layout tests have GitHub hidden on a fresh Desktop and on existing ones.
- The Widget at every size, and a real token against GitHub, are checked by hand.

## Out of Scope

- The contribution heatmap, streaks, and contributions other than commits (pull requests, issues, reviews).
- Commits GitHub doesn't count as contributions: those on branches other than the default branch, in forks, or with an email not linked to the account.
- Picking repositories, organisations or another user.
- More months, a chart, or a week-on-week comparison.
