# Spec 0019: About webOS

Status: built (2026-11-15)
Related: [Spec 0001: webOS v1](0001-webos-v1.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, everything I keep in webOS lives only in this browser's storage. I can export a backup in Settings, but nothing tells me when I last did, so I forget for months. I also can't see which build I am running, which data format it keeps, or how much storage my data takes.

## Solution

Clicking the webOS mark in the Menu Bar opens **About webOS**, an App in the Window, like "About This Mac". It shows the mark, the version, and:

- **Your data**: how many Notes, Todos, Clips and Countdowns webOS keeps
- **Storage used**, e.g. "48 KB"
- **Data format**: the state document's schema version
- **Last backup**: "Never", "Today", "Yesterday" or "12 days ago"

When there has been no backup, or the last is 30 days old or more, the last backup shows in red, with a nudge and an **Export a backup** button that downloads one as Settings › Backup does.

## User Stories

1. As a developer, I want to open About webOS from the webOS mark, so that I can find it where an operating system has it.
2. As a developer, I want to see the version and the data format, so that I know what I am running when something goes wrong.
3. As a developer, I want to see how much storage my data takes, and what it holds, so that I know what a backup would carry.
4. As a developer, I want to see when I last exported a backup, so that I don't lose months of Notes to a broken browser profile.
5. As a developer, I want to be nudged to export when it has been a month or more, and to export right there, so that backing up takes one click.

## Implementation Decisions

- **Schema 26** adds `lastBackupAt`, epoch milliseconds or null; the migration sets null. `backup.export()` sets it to now. The file is made first, so it holds the previous value; the change shows at once, and a failed save is only logged. Importing a backup keeps this machine's `lastBackupAt`, as it keeps Apple Calendar: it says when this machine last made one.
- `about.view()` in the core: the schema version, the storage used (the stored document's JSON in UTF-8 bytes, as "512 bytes", "48 KB" or "2.1 MB"), the last backup in whole calendar days, and whether a backup is due: never, or 30 days or more.
- About webOS is an App, `about`, not in the Dock. The webOS mark becomes a quiet button that opens and closes it, and the Window springs out of the mark.
- The version comes from the extension's manifest (`src/edges/extension-info.ts`); outside the extension it reads "Development build". The counts come from signals the views already have.
- The download moves to `save-backup.ts`, shared by Settings › Backup and About webOS.

## Testing Decisions

- Core tests through the public API: the schema version and "Never" at first; an export counting as the last backup, then the days since, with a backup due at 30 days; the last backup in a new tab; an import keeping this machine's; the storage used growing with the data and shown in MB; and a version 25 document migrated with no backup.

## Out of Scope

- Backing up automatically, or on a schedule.
- Stamping the build with its commit or date. The manifest's version isn't raised for each Release yet, so it says little on its own.
- Clearing data or freeing storage from About webOS.
