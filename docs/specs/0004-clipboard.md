# Spec 0004: Clipboard

Status: built (2026-11-13)
Related: [Spec 0001: webOS v1](0001-webos-v1.md), [Spec 0003: A Leaner Desktop](0003-leaner-desktop.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, I copy the same things over and over: a curl command, a test user's ID, a JSON payload I am debugging, a timestamp from a log. The system clipboard holds one of them at a time, so whatever I copied an hour ago is gone the moment I copy something else, and I go looking for it again in a terminal, a chat or a log. When what I copied is JSON, a timestamp or Base64, I paste it into Dev Utilities as the next step anyway.

## Solution

A **Clipboard App** in the Dock keeps the texts I choose to save as **Clips**:

- With the App open, **⌘/Ctrl+V** saves what is on the clipboard as a new Clip. Nothing is captured in the background: webOS stores only what I paste into it.
- A click on a Clip copies it back to the clipboard.
- The newest 50 Clips are kept. **Pinned** Clips are kept until I delete them, and they are listed first.
- A Clip that is JSON, a Unix timestamp or Base64 has a button that opens it in the matching **Dev Utilities** tab, already filled in.

The Dock now has three icons: Clipboard, Dev Utilities and Settings.

## User Stories

### Saving

1. As a developer, I want ⌘/Ctrl+V in the open Clipboard App to save the clipboard's text as a Clip, so that saving takes one keystroke.
2. As a developer, I want webOS never to read my clipboard by itself, so that passwords and tokens I copy elsewhere never end up in its storage.
3. As a developer, I want pasting text that is already a Clip to move that Clip to the top rather than add a copy, so that the list has no duplicates.
4. As a developer, I want pasting an image, a file or only whitespace to save nothing and say why, so that I know the paste wasn't lost silently.
5. As a developer, I want an empty Clipboard App to tell me to press ⌘V (Ctrl+V off a Mac), so that I know how to start.

### Using

6. As a developer, I want a click on a Clip, or Enter on it, to copy it to the clipboard and confirm with a toast, so that I can paste it anywhere straight away.
7. As a developer, I want each Clip to show its first lines in a monospace font with how long ago it was saved, so that I can recognise it without opening it.
8. As a developer, I want to expand a long Clip to read all of it, so that I can check it before I copy it.
9. As a developer, I want to pin a Clip, so that a snippet I reuse is never dropped and always sits at the top.
10. As a developer, I want to delete a Clip, and to clear every unpinned Clip at once, so that I can tidy the list.

### Dev Utilities

11. As a developer, I want a Clip that is JSON, a Unix timestamp or Base64 to offer "Open in JSON", "Open in Timestamp" or "Open in Base64", so that the conversion I want is one click away.
12. As a developer, I want that button to open Dev Utilities on that tab with the Clip in its input, so that I see the result straight away.

### Keeping

13. As a developer, I want only the newest 50 unpinned Clips kept, so that the list and the storage stay small.
14. As a developer, I want my Clips in my backup and restored from it, as my Notes and Todos are, so that moving machines doesn't lose them.

## Implementation Decisions

### Platform

- No new permission. Pasting gives the App the text through the `paste` event's `clipboardData`, which needs none; copying back uses `clipboardWrite`, which webOS already has. `clipboardRead` is deliberately not requested.

### Apps and the Dock

- Apps: Notes, Countdowns, World Clock, Clipboard, Dev Utilities, Settings. Clipboard is docked, first in the Dock. It has no Widget.
- Clipboard App icon: a clipboard.
- The App listens for `paste` on the document while it is the open App. A paste into a text field (there is none in this spec) goes to that field instead.

### Core

- A **Clip** is `{ id, text, savedAt, pinned }`. `savedAt` is epoch milliseconds and is updated when the same text is pasted again.
- The core's Clipboard API, `webos.clips`: `list()` (pinned first, each group newest first, each Clip with when it was saved and its **kind**), `save(text)`, `setPinned(id, pinned)`, `delete(id)` and `clearUnpinned()`. It lives in `src/core/clipboard/`.
- `save` resolves to `'saved'`, `'moved'`, `'empty'` or `'too-long'`, so that the App can show the matching toast.
- The hand-off to Dev Utilities isn't persisted. The Clipboard App leaves the Clip's text with `DevUtilitiesHandoff`, sets the active tab through `setActiveTab` and opens Dev Utilities. The tab takes the text once, as it is created, and starts with it in its input; the Base64 tab also switches to Decode. Dev Utilities opened later from the Dock starts empty, as before. The Window swaps its content in place, as when any App opens while another is open.

### Persisted state

- **Schema 17**: adds `clips: []`.
- Backups include the Clips. They aren't a cache.

### Rules

- **Saving**: text is saved exactly as pasted, without trimming, but text that is empty or only whitespace is refused. Text over 100,000 characters is refused, as it would eat into the extension's storage quota. Text equal to a saved Clip moves that Clip to the top of its group and keeps its pin.
- **Keeping**: after every save, unpinned Clips beyond the newest 50 are deleted. Pinned Clips don't count toward the 50.
- **Preview**: the first 3 lines, each cut off at the Window's width; "Show All" when there are more lines or over 240 characters. Under it: when it was saved, as the Notes list shows it ("9:05 AM" today, then "Yesterday", "Nov 10"), and its size ("39 characters", "5 lines").
- **Kinds**, checked in this order on the trimmed text, with the first match winning:
  - **JSON**: starts with `{` or `[` and parses.
  - **Timestamp**: 9 to 13 digits only, read as seconds or milliseconds by the Timestamp tab's rule. A date in plain text isn't a timestamp here.
  - **Base64**: at least 8 characters, standard or URL-safe Base64, padded or not, decoding to valid UTF-8 that is all printable characters or whitespace. The decoding requirement keeps ordinary words like `password`, which are valid Base64, from matching.
  - Anything else has no kind and no button.
- **Clear unpinned** asks for confirmation, naming how many Clips it deletes.

## Testing Decisions

- As in the earlier specs, tests go only through the webOS core's public API, with the in-memory Storage, the controllable Clock and the stubs.
- What is tested: saving, the refusals (empty, whitespace, too long) and their reasons; a repeated paste moving its Clip and keeping its pin; the order (pinned first, newest first); the limit of 50 with pinned Clips exempt; deleting and clearing unpinned; schema 17; Clips in a backup, restored from it, and damaged Clips refused; the kind for each Dev Utilities tab, the order between them (digits are valid Base64), and near misses such as `password`, a UUID, a date and JSON that doesn't parse.
- The App, the paste handling and the hand-off to Dev Utilities are checked by hand.

## Out of Scope

- Reading the clipboard on a button click or when the App opens (it would need `clipboardRead` and store whatever happens to be on the clipboard).
- Capturing what I copy outside webOS.
- Images, files and rich text.
- Searching or filtering Clips, and renaming or editing them.
- A Clipboard Widget.
- Comparing two Clips in the Diff tab.
- Encrypting Clips at rest.

## Further Notes

- Clips are stored unencrypted in the extension's local storage, like Notes. Pinning a secret keeps it there until it is deleted.
- **Clip** is in the [GLOSSARY](../../GLOSSARY.md).
- The production bundle is now about 564 kB, still over Angular's 500 kB warning budget.
