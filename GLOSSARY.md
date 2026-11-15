# webOS

A personal developer dashboard that replaces the browser's new tab and looks like a desktop operating system. It brings everyday tools and personal data into one place.

## Shell

**Desktop**:
The full-screen surface shown on every new tab: a Wallpaper with Widgets arranged on it.
_Avoid_: Home, dashboard, board

**Wallpaper**:
The dark background behind the Desktop, with a coloured light falling from the top: Midnight, Aurora, Ember, Violet or Graphite, chosen in Settings. The accent colour follows it.
_Avoid_: Theme, background colour, skin

**Dock**:
The bar of App icons used to open Apps. In Edit Mode it holds a large Done instead.
_Avoid_: Taskbar, launcher bar

**Window**:
The single focused frame an App opens in. Only one Window exists at a time.
_Avoid_: Modal, dialog, panel

**Menu Bar**:
The thin bar across the top of the Desktop showing the webOS mark, which opens About webOS, the open App's name, the Next Event and the time.
_Avoid_: Top bar, header, status bar

**Edit Mode**:
The Desktop state in which Widgets can be moved, resized, stacked and added or removed on the snap grid. A Widget added starts at size S.
_Avoid_: Jiggle mode, customize mode, layout mode

**Ambient mode**:
The Desktop after it has been left alone for the minutes chosen in Settings (1, 5 or 15, or off): everything but the Wallpaper fades, and a large clock shows with the date, the weather and the Next Event. Any key, click, scroll or move of the pointer ends it, and does nothing else.
_Avoid_: Screensaver, idle mode, standby, sleep

## Building blocks

**Widget**:
A glanceable tile that lives on the Desktop and shows information without being opened.
_Avoid_: Card, panel, tile

**Stack**:
Widgets that cover the same cells sharing one place on the Desktop, one shown at a time. Scrolling over it, or its dots, moves to another, and a new tab opens it on the one shown last. Made in Edit Mode with Stack….
_Avoid_: Smart stack, group, folder, carousel

**Title Bar**:
The thin strip across the top of a Widget that shows the Widget's name.
_Avoid_: Task bar, header

**App**:
A tool you open into the Window for focused work, from its Dock icon or, for Countdowns and World Clock, from its Widget. About webOS opens from the webOS mark in the Menu Bar.
_Avoid_: Program, tool, module

**Note**:
A Markdown document written in the Notes App.
_Avoid_: Memo, page, document

**Todo**:
A single item on the one flat to-do list. It is either open or completed.
_Avoid_: Task, item, ticket

**Clip**:
A text the user pasted into the Clipboard App to copy again later. It can be pinned, so it is never dropped.
_Avoid_: Snippet, clipping, history entry

**Today Widget**:
The Widget that shows the Day View of today, or of the day picked in the Calendar Widget until the user goes back to today.
_Avoid_: Agenda, day widget, schedule

**Top Sites**:
The sites the user visits most, as the browser's own new tab page lists them, each shown with its icon and name on the Top Sites Widget, at most 10. The browser keeps the list; webOS only shows it.
_Avoid_: Shortcuts, bookmarks, favourites, speed dial

**New Tabs**:
The new tabs the user opened on a day, each counted as its Desktop opens; a reload isn't one. The New Tabs Widget shows today's large, over a bar for each of the last seven days. webOS keeps only those seven.
_Avoid_: Tab count, tabs opened, page views, visits

**Countdown**:
A day the user counts down to, such as a race or a release, shown with the days to go on the Countdown Widget. It is cleared once its day has passed. One added with a day that has already passed counts up instead, with the days since.
_Avoid_: Event, deadline, timer

**Bridge day**:
A working day with a day off on each side, a weekend day or an Austrian public holiday, so taking it off makes one longer break. The Calendar marks it with a hollow dot, and its Day View says how many days off in a row it makes.
_Avoid_: Fenstertag, bridge holiday, long weekend

**Day View**:
One day in full: its holiday or bridge day, Countdowns and Events, Coming Up, and sunrise and sunset. The Today Widget shows it, for today or the day picked in the Calendar Widget.
_Avoid_: Day detail, agenda, popover

**Coming Up**:
The first Event on a later day than the one the Day View shows, with how many days from today it is, e.g. "Coming up · in 6 days". Only the synced range is known.
_Avoid_: Next entry, next appointment, upcoming

**Wallpaper Weather**:
Rain, snow or fog drawn faintly on the Wallpaper while the Weather city has it now. Drizzle falls as light rain and a thunderstorm as heavier rain, never with lightning. It can be turned off in Settings, and rain and snow stay off under reduced motion.
_Avoid_: Weather effects, animated wallpaper, particles

**Forecast**:
The weather for today and the six days after it in the Weather city, each with its condition, any chance of rain or snow, and its low and high. The Weather Widget shows it in place of the current weather when clicked.
_Avoid_: Outlook, week view, prediction

**World Clock city**:
A city on the World Clock Widget, kept with its time zone.
_Avoid_: Time zone, location

## Data

**Last backup**:
When a backup was last exported on this machine, shown in About webOS. A backup is due when there has been none, or the last is 30 days old or more. Importing a backup doesn't change it.
_Avoid_: Last sync, last save

**Data Source**:
An external API that supplies personal data to webOS, such as sleep data or a training plan. The weather is not a Data Source: it is public data, not the user's own.
_Avoid_: Integration, plugin, connector, feed

**Apple Calendar**:
The Data Source of the user's iCloud calendars, read-only, connected in Settings with an Apple ID and an app-specific password.
_Avoid_: iCloud sync, calendar integration

**Event**:
One occurrence of something in Apple Calendar, such as a meeting or a training. A recurring one is an Event per occurrence. Not a Countdown, which the user makes in webOS.
_Avoid_: Appointment, meeting, entry

**Next Event**:
The Event that starts next today, shown in the Menu Bar with when it starts: "in 12 min", "at 2:30 PM", or "now" for its first five minutes. All-day Events don't count.
_Avoid_: Upcoming event, next meeting, agenda
