# Activity Graph (Obsidian Plugin)

A lightweight, GitHub-style contribution graph for Obsidian that uses **Dataview queries directly** — no extra DSL, no abstraction layer.

---

## ✨ Features

- 📊 GitHub-style heatmap visualization
- 🔍 Direct Dataview query support
- 🎨 Multiple color gradients (Tokyo Night inspired)
- ⚙️ Global settings + per-graph overrides
- 📅 Month + weekday labels
- 📈 Automatic scaling (binary + intensity aware)

---

## 🚀 Usage

Create a code block like this:

```activity-graph
TABLE date(file.name) AS date, 1 AS value
FROM "Exercise Logs"
SORT date(file.name) ASC
```

---

## 🧠 Query Requirements

Your query must return:

TABLE <date_expr> AS date, <number_expr> AS value

### Examples

#### Count files (binary activity)

```activity-graph
TABLE file.day AS date, 1 AS value
FROM "Exercise Logs"
```

#### Track duration

```activity-graph
TABLE file.day AS date, duration AS value
FROM "Exercise Logs"
```

#### Track hours studied

```activity-graph
TABLE file.day AS date, hours_studied AS value
FROM "School/Study Log"
```

---

## 🎨 Color Gradients

Available gradients:

- Green (default)
- Blue
- Purple
- Orange
- Red

Configured in plugin settings.

---

## ⚙️ Settings

Global settings include:

- Days to display
- Show month labels
- Show weekday labels
- Show legend
- Start week on Monday
- Color gradient
- Legend labels ("Less" → "More")

---

## 🔧 Overrides (Per Graph)

You can override any setting per graph using `---`:

```activity-graph
TABLE file.day AS date, duration AS value
FROM "Exercise Logs"

---
title: Exercise
daysToShow: 90
showLegend: false
colorGradient: purple
```

### Supported Overrides

- title
- daysToShow
- showMonthLabels
- showWeekdayLabels
- showLegend
- startWeekOnMonday
- colorGradient
- legendLessLabel
- legendMoreLabel

---

## 📊 Behavior

### Binary data (e.g. file exists)

If all values are `1`, the graph uses a single color level.

### Continuous data (e.g. hours, duration)

Values are scaled relative to the maximum value in the dataset.

---

## 🧱 Architecture

Markdown → Dataview → Activity Graph → Visualization

- Dataview handles querying
- Plugin handles rendering
- No custom query language required

---

## 💡 Design Philosophy

- Keep data in plain markdown
- Use Dataview as the query engine
- Keep the plugin as a pure visualization layer

---

## 🛠 Development

Built using:

- Obsidian Plugin API
- Dataview Plugin API
- TypeScript

---

## 📌 Notes

- Requires Dataview plugin
- Works best with ISO date filenames (YYYY-MM-DD.md)
- Supports both frontmatter and inline fields

---

## 🔮 Future Improvements

- Smooth gradient interpolation
- Custom user-defined gradients
- Tooltip enhancements
- Per-cell click actions
- Export support
