# Spec 0025: Rain Ahead on the Weather Widget

Status: built (2026-11-16)
Related: [Spec 0010: The Forecast on the Weather Widget](0010-weather-forecast.md), [Spec 0015: Wallpaper Weather](0015-wallpaper-weather.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, the Weather Widget tells me it is cloudy now and gives me today's high and low, and the Forecast gives each day's chance of rain. Neither tells me what I want before a run or the walk home: will it rain in the next few hours, and when?

## Solution

The Weather Widget shows **Rain Ahead**, one line under the high and low: "Rain from 3 PM", "Snow until 9 PM", "Rain from 5 AM tomorrow", or "Dry for the next 12 hours". It looks 12 hours ahead.

## User Stories

1. As a developer, I want to see when rain starts in the next hours, so that I can go out before it does.
2. As a developer, I want to see when it stops while it is raining, so that I can wait it out.
3. As a developer, I want to be told when it stays dry, so that I don't have to open the Forecast to be sure.
4. As a developer, I want snow named as snow, so that I know what to wear.
5. As a developer, I want a time after midnight to say "tomorrow", so that 5 AM isn't taken for this morning.
6. As a developer who uses a screen reader, I want Rain Ahead read out with the rest of the weather.

## Implementation Decisions

- The forecast request adds `hourly=weather_code` and `forecast_hours=24`: the next 24 hours from the hour it is made in. The stored report gains `hours`, each the hour's start (epoch milliseconds, placed with the response's `utc_offset_seconds`) and its condition. A response without hours or the offset stores none.
- No schema change: a report from an earlier build has no `hours`, so a new tab fetches it again, however fresh, as with the Forecast. Backups still leave the report out.
- The view's `ahead` is worked out from the stored hours and the clock, so it moves on without a new fetch. An hour is wet when its condition is drizzle, rain, showers or a thunderstorm (all "Rain") or snow ("Snow"); fog and clouds are dry.
  - Wet in the hour now: "Rain until 8 PM", at the first dry hour in the next 12; "Rain for the next 12 hours" when there is none.
  - Otherwise: "Snow from 9 PM", at the first wet hour in the next 12; "Dry for the next 12 hours" when there is none.
  - Times are on the city's own clock, like the Sun Widget's, without ":00", and with "tomorrow" when they fall on its next day.
  - When the stored hours don't reach 12 hours ahead, as with an old report while offline, and nothing starts or stops in them, there is no Rain Ahead.
- The Widget shows it in its current weather, a little brighter than the condition, and leaves it out when very short, after "Updated …". It is part of the Widget's label for screen readers.

## Testing Decisions

- Core tests through the public API with stubbed Open-Meteo responses: the request, dry for 12 hours, rain starting, rain stopping, snow tomorrow, drizzle, showers and storms as rain and fog as dry, the 12-hour limit both ways, moving on with the clock without fetching, hours that don't reach far enough, the city's own clock (Tokyo), a response without hours or offset, and a report from before Rain Ahead fetched again.
- The layout is checked by hand.

## Out of Scope

- The chance of rain by the hour, and how much falls.
- A chart of the next hours.
- Rain Ahead on the Wallpaper or in Ambient mode.
