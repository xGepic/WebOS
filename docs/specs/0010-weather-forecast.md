# Spec 0010: The Forecast on the Weather Widget

Status: built (2026-11-14)
Related: [Spec 0002: More Widgets](0002-more-widgets.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, the Weather Widget tells me what it is like now, and today's high and low. When I plan the week, a run or a trip, I want to know what the next days bring, without leaving the new tab.

## Solution

Clicking the Weather Widget turns it to the **Forecast**: today and the six days after it, a row each, with the condition as an icon, the chance of rain or snow when it is 20% or more, and the day's low and high on a bar that spans the week's range, so warm and cold days stand out. Clicking again turns it back to the current weather, which every new tab starts on.

## User Stories

1. As a developer, I want the current temperature first, so that the Widget stays a glance.
2. As a developer, I want one click to see the week ahead, and one click back, so that the Forecast never takes over the Widget for good.
3. As a developer, I want each day's low and high on a common scale, so that I see at once which days are warmer.
4. As a developer, I want the chance of rain or snow, but only when it is worth knowing, so that the rows stay quiet on dry days.
5. As a developer, I want the Forecast to fit every Widget size and screen, so that it is readable on 4K and on a laptop.

## Implementation Decisions

- The forecast request asks Open-Meteo for seven days (`forecast_days=7`) with each day's weather code, high, low and highest chance of precipitation. It is still one request every 30 minutes; nothing else is fetched.
- The stored report gains `days`, today first, in the city's time zone. No schema change: a report from an earlier build has no `days`, so a new tab fetches it again, however fresh, and the Widget shows "Loading the forecast…" until it arrives.
- The view lists the days from today in the city's own time zone on, so an old report shown offline leaves out the days already past. Days are labelled "Today", then by weekday. The chance of rain or snow is rounded to 10% and left out below 20%.
- Parsing keeps the days up to the first one the response gives without a date, code, high or low, and fails only if there is no first day.
- Which face shows is UI state, per tab, in the Widget. The whole Widget is one button; its accessible name reads out what it shows, then "Show the forecast" or "Show the current weather".
- The Forecast scales with the Widget's box. When it is narrow the chance of rain goes; when it is short, five days show.

## Testing Decisions

- The weather tests cover the seven days and their labels, rounding and hiding the chance of rain, starting on today in the city's time zone, leaving out past days in an old report, stopping at a broken day, and fetching again a report from before the Forecast.
- The Widget's two faces are checked by hand, at every size on 4K and on 1366 × 768.

## Out of Scope

- An hourly forecast.
- Choosing the number of days, or the Forecast as the default face.
- Wind, humidity, UV and other details.
