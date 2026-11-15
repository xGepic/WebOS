# Spec 0015: Weather on the Wallpaper

Status: built (2026-11-15)
Related: [Spec 0010: The Forecast](0010-weather-forecast.md), [Spec 0011: Wallpapers](0011-wallpapers.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, the Desktop is the same dark screen whether it is pouring outside or snowing. The Weather Widget knows, but it is one tile among many, and I only read it when I look for it. I want the Desktop itself to feel the weather, quietly, the way a window does, without becoming a screensaver.

## Solution

**Wallpaper Weather**: when the Weather city has rain, snow or fog right now, the Wallpaper shows it, very faintly. Rain falls in thin streaks, snow drifts down, fog lies low as a slow mist. It sits behind the Widgets, so their translucent material blurs it, and under the Wallpaper's grain, so it reads as part of the Wallpaper rather than on top of it. Settings › Wallpaper can turn it off.

## User Stories

1. As a developer, I want to see that it is raining or snowing in my city without reading a Widget, so that the Desktop feels connected to the day.
2. As a developer, I want it faint enough to ignore, so that it never pulls my attention from my work.
3. As a developer, I want it to show the weather as it is now, never from hours ago, so that I can trust it.
4. As a developer, I want to turn it off in Settings, so that I can keep a still Desktop.
5. As a developer who has turned on reduced motion, I want nothing falling on my screen, so that webOS respects my setting.
6. As a developer, I want it to cost next to nothing, so that a tab left open all day doesn't keep the machine busy.

## Implementation Decisions

- The core gives `weather.onWallpaper()`: `drizzle`, `rain`, `storm`, `snow`, `fog`, or null for nothing. Drizzle is drizzle; rain and showers are rain; a thunderstorm is a storm, heavier rain without lightning, as flashes would startle and can harm people with photosensitive epilepsy; snow is snow; fog is fog. Clear, partly cloudy and cloudy skies show nothing.
- It is null without a Weather city, before the first report, when the report is 2 hours old or more, and when it is turned off. It follows the clock, so a report that grows old clears the Wallpaper without a new tab opening.
- A tab shown again asks for the weather, which fetches it only when the last report is 30 minutes old, as a new tab does. So a tab kept open all day keeps up, and the Weather Widget with it.
- The choice is `wallpaper.showsWeather()` and `wallpaper.setShowsWeather()`, shown as a "Show the weather" checkbox under the Wallpapers in Settings. It is on by default. Schema 25 adds `wallpaperWeather: true` for every Desktop. Backups include it.
- The App draws it in a fixed layer behind the Desktop, above the Wallpaper's light and under its grain, hidden from screen readers and from the pointer. Each effect is two layers of a repeating SVG tile of different sizes, moved by CSS animations of `transform` only, so the compositor runs them, nothing runs in JavaScript, and the browser stops them in hidden tabs. They are linear loops, not springs: nothing is interrupted. It fades in and out over 1.5 seconds as the weather changes.
- Under reduced motion, rain and snow aren't drawn and the mist stays still.
- The streaks and flakes are pale and very faint, the same on every Wallpaper, so all five stay dark. Settings' Wallpaper previews show no weather.

## Testing Decisions

- The core tests cover each condition's Wallpaper Weather, nothing without a city or before a report, nothing from a report 2 hours old, clearing as the report grows old, turning it off and on, following another tab's choice, the migration from schema 24, and the choice in backups.
- Checked by hand in the app at 1920 × 1080: each effect on Midnight, snow on Ember, nothing for a cloudy sky, nothing when turned off, rain hidden and the mist still under reduced motion, the Settings checkbox, and the main thread over 10 seconds of rain (21 ms of tasks, no script, layout or style work).

## Out of Scope

- Lightning, sound, or wind direction and strength.
- Clouds, stars, sunshine or the time of day on the Wallpaper.
- Weather on the Settings previews.
- Choosing which effects show, or how strong they are.
