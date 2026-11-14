# webOS

A personal developer dashboard that replaces the browser's new tab and looks like a desktop operating system. It brings everyday tools and personal data into one place.

## Shell

**Desktop**:
The full-screen surface shown on every new tab: a wallpaper with Widgets arranged on it.
_Avoid_: Home, dashboard, board

**Dock**:
The bar of App icons used to open Apps.
_Avoid_: Taskbar, launcher bar

**Window**:
The single focused frame an App opens in. Only one Window exists at a time.
_Avoid_: Modal, dialog, panel

**Menu Bar**:
The thin bar across the top of the Desktop showing the open App's name, Data Source status and the time.
_Avoid_: Top bar, header, status bar

**Edit Mode**:
The Desktop state in which Widgets can be moved, resized and added or removed on the snap grid.
_Avoid_: Jiggle mode, customize mode, layout mode

## Building blocks

**Widget**:
A glanceable tile that lives on the Desktop and shows information without being opened.
_Avoid_: Card, panel, tile

**Title Bar**:
The thin strip across the top of a Widget that shows the Widget's name.
_Avoid_: Task bar, header

**App**:
A tool you open into the Window for focused work, from its Dock icon or, for Notes, Countdowns and World Clock, from its Widget.
_Avoid_: Program, tool, module

**Note**:
A Markdown document written in the Notes App.
_Avoid_: Memo, page, document

**Pinned Note**:
The one Note whose preview is shown on the Notes Widget.
_Avoid_: Favorite note, featured note

**Todo**:
A single item on the one flat to-do list. It is either open or completed.
_Avoid_: Task, item, ticket

**Clip**:
A text the user pasted into the Clipboard App to copy again later. It can be pinned, so it is never dropped.
_Avoid_: Snippet, clipping, history entry

**Today Widget**:
The Widget that shows the Day View of today, or of the day picked in the Calendar Widget until the user goes back to today.
_Avoid_: Agenda, day widget, schedule

**Countdown**:
A day the user counts down to, such as a race or a release, shown with the days to go on the Countdown Widget. It is cleared once its day has passed.
_Avoid_: Event, deadline, timer

**Day View**:
One day in full: its holiday, Countdowns and Events, and sunrise and sunset. The Today Widget shows it, for today or the day picked in the Calendar Widget.
_Avoid_: Day detail, agenda, popover

**World Clock city**:
A city on the World Clock Widget, kept with its time zone.
_Avoid_: Time zone, location

## Data

**Data Source**:
An external API that supplies personal data to webOS, such as sleep data or a training plan. The weather is not a Data Source: it is public data, not the user's own.
_Avoid_: Integration, plugin, connector, feed

**Apple Calendar**:
The Data Source of the user's iCloud calendars, read-only, connected in Settings with an Apple ID and an app-specific password.
_Avoid_: iCloud sync, calendar integration

**Event**:
One occurrence of something in Apple Calendar, such as a meeting or a training. A recurring one is an Event per occurrence. Not a Countdown, which the user makes in webOS.
_Avoid_: Appointment, meeting, entry
