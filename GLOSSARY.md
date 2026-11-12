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
The thin bar across the top of the Desktop showing the open App's name, Data Source status, a Launcher button and the time.
_Avoid_: Top bar, header, status bar

**Launcher**:
The keyboard-driven search box that finds and opens Apps, Links, Todos, Notes, bookmarks and history, runs quick actions, and otherwise falls back to a web search.
_Avoid_: Spotlight, command palette, search bar, omnibox

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
A tool you open from the Dock into the Window for focused work.
_Avoid_: Program, tool, module

**Link**:
A curated URL saved in webOS, shown on the Desktop. Distinct from a browser bookmark.
_Avoid_: Bookmark, shortcut, favorite

**Link Group**:
A named section of Links inside the Links Widget.
_Avoid_: Folder, category, collection

**Docked Link**:
A Link placed in the Dock after the App icons.
_Avoid_: Pinned Link, favorite

**Note**:
A Markdown document written in the Notes App.
_Avoid_: Memo, page, document

**Pinned Note**:
The one Note whose preview is shown on the Notes Widget.
_Avoid_: Favorite note, featured note

**Todo**:
A single item on the one flat to-do list. It is either open or completed.
_Avoid_: Task, item, ticket

## Data

**Data Source**:
An external API that supplies personal data to webOS, such as sleep data or a training plan. The weather is not a Data Source: it is public data, not the user's own.
_Avoid_: Integration, plugin, connector, feed
