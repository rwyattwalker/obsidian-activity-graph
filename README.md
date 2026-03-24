# Activity Graph

Render a GitHub-style activity heatmap from Dataview queries.

## Requirements

- Obsidian
- Dataview plugin enabled

## Basic usage

```activity-graph
TABLE file.day AS date, 1 AS value
FROM "Daily"
SORT file.day ASC
```

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

## Screenshots

<img width="1200" height="492" alt="image" src="https://github.com/user-attachments/assets/f8263d6a-ddc3-4bf1-9e0e-d68cd5c2b0d3" />


