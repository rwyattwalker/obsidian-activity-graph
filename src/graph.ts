import { type ActivityGraphSettings, GRADIENTS } from "./settings";

export type HeatmapRecord = {
	date: string;
	value: number;
};

export const renderCalendar = (
	container: HTMLElement,
	rows: HeatmapRecord[],
	settings: ActivityGraphSettings,
	title?: string,
): void => {
	container.empty();

	const end = startOfToday();
	const rangeStart = addDays(end, -(settings.daysToShow - 1));
	const calendarStart = startOfWeek(rangeStart, settings.startWeekOnMonday);
	const valueMap = new Map(rows.map(({ date, value }) => [date, value]));
	const { min, max } = getScale(rows, rangeStart, end, settings);
	const root = container.createDiv({ cls: "activity-graph" });

	if (title) root.createDiv({ text: title, cls: "activity-graph-title" });

	applyGradient(root, settings);
	if (settings.showMonthLabels) renderMonthLabels(root, calendarStart, end);

	const body = root.createDiv({ cls: "activity-graph-body" });
	if (settings.showWeekdayLabels) renderWeekdayLabels(body, settings);

	const weeks = renderWeeks(body, calendarStart, end, valueMap, min, max);
	if (settings.showLegend) renderLegend(root, settings);
	applySizing(root, weeks, settings.showWeekdayLabels);
};

const startOfToday = (): Date => {
	const date = new Date();
	date.setHours(0, 0, 0, 0);
	return date;
};

const addDays = (date: Date, days: number): Date => {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
};

const startOfWeek = (date: Date, mondayFirst: boolean): Date => {
	const start = new Date(date);
	const weekStart = mondayFirst ? 1 : 0;
	start.setDate(start.getDate() - ((start.getDay() - weekStart + 7) % 7));
	return start;
};

const getScale = (
	rows: HeatmapRecord[],
	start: Date,
	end: Date,
	settings: ActivityGraphSettings,
): { min: number; max: number } => {
	const values = rows
		.filter(({ date }) => {
			const rowDate = new Date(`${date}T00:00:00`);
			return rowDate >= start && rowDate <= end;
		})
		.map(({ value }) => value);
	const min = settings.scaleMin ?? 0;
	const max = Math.max(settings.scaleMax ?? Math.max(1, ...values), min + 1);
	return { min, max };
};

const applyGradient = (
	root: HTMLElement,
	settings: ActivityGraphSettings,
): void => {
	const gradient =
		settings.customGradients[settings.colorGradient] ??
		GRADIENTS[settings.colorGradient as keyof typeof GRADIENTS] ??
		GRADIENTS.green;

	gradient.forEach((color, index) => {
		root.style.setProperty(`--heatmap-${index + 1}`, color);
	});
};

const renderWeeks = (
	container: HTMLElement,
	start: Date,
	end: Date,
	values: Map<string, number>,
	min: number,
	max: number,
): number => {
	const weeksEl = container.createDiv({ cls: "activity-graph-weeks" });
	const current = new Date(start);
	let weeks = 0;

	while (current <= end) {
		const week = weeksEl.createDiv({ cls: "activity-graph-week" });
		weeks += 1;

		for (let day = 0; day < 7 && current <= end; day += 1) {
			const date = toISODate(current);
			const value = values.get(date) ?? 0;
			const level = getLevel(value, min, max);
			const cell = week.createDiv({
				cls: `activity-graph-cell level-${level}`,
			});
			cell.setAttr("title", `${date}: ${value}`);
			cell.setAttr("aria-label", `${date}: ${value}`);
			current.setDate(current.getDate() + 1);
		}
	}

	return weeks;
};

const renderMonthLabels = (
	container: HTMLElement,
	start: Date,
	end: Date,
): void => {
	const monthRow = container.createDiv({ cls: "activity-graph-months" });
	monthRow.createDiv({ cls: "activity-graph-month-spacer" });
	const labels = monthRow.createDiv({ cls: "activity-graph-month-labels" });
	const current = new Date(start);
	let previousMonth = -1;

	while (current <= end) {
		const month = current.getMonth();
		labels.createDiv({
			text:
				month === previousMonth
					? ""
					: current.toLocaleString(undefined, { month: "short" }),
			cls:
				month === previousMonth
					? "activity-graph-month-label activity-graph-month-label--empty"
					: "activity-graph-month-label",
		});
		previousMonth = month;
		current.setDate(current.getDate() + 7);
	}
};

const renderWeekdayLabels = (
	container: HTMLElement,
	settings: ActivityGraphSettings,
): void => {
	const labels = settings.startWeekOnMonday
		? ["Mon", "", "Wed", "", "Fri", "", ""]
		: ["Sun", "", "Tue", "", "Thu", "", "Sat"];
	const labelsEl = container.createDiv({
		cls: "activity-graph-weekday-labels",
	});

	for (const label of labels) {
		labelsEl.createDiv({
			text: label,
			cls: "activity-graph-weekday-label",
		});
	}
};

const renderLegend = (
	container: HTMLElement,
	settings: ActivityGraphSettings,
): void => {
	const legend = container.createDiv({ cls: "activity-graph-legend" });
	legend.createSpan({
		text: settings.legendLessLabel,
		cls: "activity-graph-legend-text",
	});

	for (let level = 0; level <= 4; level += 1) {
		legend.createDiv({
			cls: `activity-graph-cell activity-graph-legend-cell level-${level}`,
		});
	}

	legend.createSpan({
		text: settings.legendMoreLabel,
		cls: "activity-graph-legend-text",
	});
};

const applySizing = (
	root: HTMLElement,
	weekCount: number,
	showWeekdayLabels: boolean,
): void => {
	const labelWidth = showWeekdayLabels ? 32 : 0;
	root.style.setProperty("--activity-graph-label-width", `${labelWidth}px`);

	const update = () => {
		if (!weekCount || !root.clientWidth) return;

		const availableWidth = Math.max(root.clientWidth - labelWidth, 0);
		let gap = 4;
		let cellSize = Math.floor(
			(availableWidth - (weekCount - 1) * gap) / weekCount,
		);

		if (cellSize < 4) {
			gap = 1;
			cellSize = Math.floor(
				(availableWidth - (weekCount - 1) * gap) / weekCount,
			);
		}

		root.style.setProperty(
			"--activity-graph-cell-size",
			`${Math.max(cellSize, 4)}px`,
		);
		root.style.setProperty("--activity-graph-cell-gap", `${gap}px`);
	};

	const retry = (remaining: number) => {
		update();
		if (remaining > 0 && !root.clientWidth) {
			requestAnimationFrame(() => retry(remaining - 1));
		}
	};

	retry(10);
};

const getLevel = (value: number, min: number, max: number): number => {
	if (value <= min) return 0;
	if (value >= max) return 4;
	const ratio = (value - min) / (max - min);
	return ratio <= 1 / 3 ? 1 : ratio <= 2 / 3 ? 2 : 3;
};

const toISODate = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};
