# Activity Graph

Render a GitHub-style activity heatmap from Dataview queries. The defining feature is that you write native Dataview queries directly (no custom DSL).

## Requirements

- Obsidian
- Dataview plugin enabled

## Basic usage

Use an `activity-graph` code block:

```activity-graph
TABLE file.day AS date, 1 AS value
FROM "Daily"
SORT file.day ASC
```

## Query requirements

Your Dataview query must return:

- `date`: a date value (Dataview date, `file.day`, or an ISO date string like `YYYY-MM-DD`)
- `value`: a number (for intensity; use `1` for binary activity)

## Examples

Count files (binary activity):

```activity-graph
TABLE date(file.name) AS date, 1 AS value
FROM "Exercise Logs"
```

Track a numeric field:

```activity-graph
TABLE file.day AS date, duration AS value
FROM "Exercise Logs"
```

## Per-graph overrides

Add a `---` block after the query:

```activity-graph
TABLE file.day AS date, duration AS value
FROM "Exercise Logs"

---
title: Exercise
daysToShow: 90
showLegend: false
colorGradient: purple
```

Supported overrides:

- title
- daysToShow
- showMonthLabels
- showWeekdayLabels
- showLegend
- startWeekOnMonday
- colorGradient
- legendLessLabel
- legendMoreLabel

## Notes

- The graph ends on the latest date returned by the query and shows `daysToShow` days backwards.
- Overrides are plain `key: value` lines following a `---`.
- Supported gradients: `green`, `blue`, `purple`, `orange`, `red` (default: `green`).

## Screenshots

<img width="1200" height="492" alt="activity graph desktop" src="https://github.com/user-attachments/assets/f8263d6a-ddc3-4bf1-9e0e-d68cd5c2b0d3" />
