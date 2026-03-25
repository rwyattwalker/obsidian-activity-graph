# Activity Graph

Render a GitHub-style activity heatmap from Dataview queries. Use Dataview queries directly with optional query level setting overrides.

## Requirements

- Obsidian
- Dataview plugin enabled

## Basic usage

Use an `activity-graph` code block containing a Dataview query:

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

## Per-query overrides

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
- The following css snippet can be added to allow more space for the graph, can look squished otherwise:
  ```
  body {
  --file-line-width: 1000px;
  }
  ```

## Screenshots
### Query
<img width="984" height="393" alt="image" src="https://github.com/user-attachments/assets/5d8aa846-905a-475f-b900-74d23d85bfea" />

### Result
<img width="1200" height="492" alt="activity graph desktop" src="https://github.com/user-attachments/assets/f8263d6a-ddc3-4bf1-9e0e-d68cd5c2b0d3" />

### Default Color Pallets
#### Green
<img width="1154" height="257" alt="image" src="https://github.com/user-attachments/assets/a2b41036-7938-469e-bb69-9193735764a7" />

#### Blue
<img width="1155" height="257" alt="image" src="https://github.com/user-attachments/assets/05f1d1f9-f168-47a4-b132-ddd2a6261d7b" />

#### Purple
<img width="1144" height="243" alt="image" src="https://github.com/user-attachments/assets/15b30cd0-22c1-4cbd-96f7-4be9b3d3f6fc" />

#### Orange 
<img width="1152" height="239" alt="image" src="https://github.com/user-attachments/assets/8349cda5-7875-4213-87fe-7c54c2c776d5" />

#### Red
<img width="1166" height="255" alt="image" src="https://github.com/user-attachments/assets/db35ce21-ab49-4c4c-9395-f8c39a7f3346" />




