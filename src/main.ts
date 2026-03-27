import { MarkdownPostProcessorContext, Plugin } from "obsidian";
import {
	ActivityGraphSettingTab,
	ActivityGraphSettings,
	DEFAULT_SETTINGS,
	GRADIENTS,
	GradientPalette,
} from "settings";

type HeatmapRow = {
	date: string;
	value: number;
};

type GraphOverrides = Partial<ActivityGraphSettings> & {
	title?: string;
};

type DataviewQueryResult = {
	successful: boolean;
	value: unknown;
	error?: string;
};

type DataviewApi = {
	query: (query: string, sourcePath?: string) => Promise<DataviewQueryResult>;
};

type DataviewPlugin = {
	api: DataviewApi;
};

type DataviewTableResult = {
	type: "table";
	headers?: string[];
	values?: unknown[][];
};

type DateWithToISO = {
	toISODate: () => string | null | undefined;
};

const isGradientName = (
	value: unknown,
	customGradients: Record<string, GradientPalette>
): value is ActivityGraphSettings["colorGradient"] => {
	if (typeof value !== "string") return false;
	return value in GRADIENTS || value in customGradients;
};

const isDataviewApi = (value: unknown): value is DataviewApi => {
	return (
		typeof value === "object" &&
		value !== null &&
		"query" in value &&
		typeof (value as { query?: unknown }).query === "function"
	);
};

const isDataviewPlugin = (value: unknown): value is DataviewPlugin => {
	return (
		typeof value === "object" &&
		value !== null &&
		"api" in value &&
		isDataviewApi((value as { api?: unknown }).api)
	);
};

const isDataviewTableResult = (value: unknown): value is DataviewTableResult => {
	return (
		typeof value === "object" &&
		value !== null &&
		(value as { type?: unknown }).type === "table"
	);
};

const hasToISODate = (value: unknown): value is DateWithToISO => {
	return (
		typeof value === "object" &&
		value !== null &&
		"toISODate" in value &&
		typeof (value as { toISODate?: unknown }).toISODate === "function"
	);
};

export default class ActivityGraphPlugin extends Plugin {
	settings: ActivityGraphSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ActivityGraphSettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor(
			"activity-graph",
			async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				const dv = this.getDataviewApi();
				if (!dv) {
					el.createEl("div", { text: "Dataview is required and is not enabled." });
					return;
				}

				try {

					const { query, overrides } = this.parseBlock(source);
					const settings = { ...this.settings, ...overrides };

					const result = await dv.query(query, ctx.sourcePath);

					if (!result || result.successful === false) {
						el.createEl("pre", {
							text: `Dataview query failed:\n${result?.error ?? "Unknown error"}`,
						});
						return;
					}

					const rows = this.normalizeRows(result.value);
					if (!rows.length) {
						el.createEl("div", { text: "No results." });
						return;
					}

					this.renderCalendar(el, rows, settings, overrides.title);
				} catch (err) {
					el.createEl("pre", {
						text: `Plugin error:\n${err instanceof Error ? err.message : String(err)}`,
					});
				}
			}
		);
	}

	async loadSettings() {
		const data: unknown = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, this.normalizeSettings(data));
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	normalizeSettings(data: unknown): Partial<ActivityGraphSettings> {
		if (!data || typeof data !== "object") {
			return {};
		}

		const record = data as Record<string, unknown>;
		const settings: Partial<ActivityGraphSettings> = {};
		const customGradients = this.normalizeCustomGradients(record.customGradients);
		if (Object.keys(customGradients).length > 0) {
			settings.customGradients = customGradients;
		}

		if (typeof record.daysToShow === "number" && record.daysToShow > 0) {
			settings.daysToShow = record.daysToShow;
		}
		if (typeof record.showMonthLabels === "boolean") {
			settings.showMonthLabels = record.showMonthLabels;
		}
		if (typeof record.showWeekdayLabels === "boolean") {
			settings.showWeekdayLabels = record.showWeekdayLabels;
		}
		if (typeof record.showLegend === "boolean") {
			settings.showLegend = record.showLegend;
		}
		if (typeof record.startWeekOnMonday === "boolean") {
			settings.startWeekOnMonday = record.startWeekOnMonday;
		}
		if (typeof record.legendLessLabel === "string") {
			settings.legendLessLabel = record.legendLessLabel;
		}
		if (typeof record.legendMoreLabel === "string") {
			settings.legendMoreLabel = record.legendMoreLabel;
		}
		if (typeof record.scaleMin === "number" || record.scaleMin === null) {
			settings.scaleMin = typeof record.scaleMin === "number" ? record.scaleMin : null;
		}
		if (typeof record.scaleMax === "number" || record.scaleMax === null) {
			settings.scaleMax = typeof record.scaleMax === "number" ? record.scaleMax : null;
		}
		if (isGradientName(record.colorGradient, settings.customGradients ?? {})) {
			settings.colorGradient = record.colorGradient;
		}

		return settings;
	}

	normalizeCustomGradients(value: unknown): Record<string, GradientPalette> {
		if (!value || typeof value !== "object") return {};

		const record = value as Record<string, unknown>;
		const normalized: Record<string, GradientPalette> = {};

		for (const [name, palette] of Object.entries(record)) {
			if (typeof name !== "string") continue;
			if (!Array.isArray(palette) || palette.length !== 4) continue;
			if (!palette.every((color) => typeof color === "string" && color.trim().length > 0)) continue;
			normalized[name] = [palette[0], palette[1], palette[2], palette[3]];
		}

		return normalized;
	}

	getDataviewApi(): DataviewApi | null {
		const pluginsContainer = (this.app as unknown as { plugins?: { plugins?: Record<string, unknown> } })
			.plugins;
		const dataview = pluginsContainer?.plugins?.dataview;
		if (!dataview || !isDataviewPlugin(dataview)) return null;
		return dataview.api;
	}

	normalizeRows(tableResult: unknown): HeatmapRow[] {
		if (!isDataviewTableResult(tableResult)) {
			return [];
		}

		const headers = Array.isArray(tableResult.headers)
			? tableResult.headers.filter((header): header is string => typeof header === "string")
			: [];
		const values = Array.isArray(tableResult.values) ? tableResult.values : [];

		const dateIndex = headers.findIndex((h) => h === "date");
		const valueIndex = headers.findIndex((h) => h === "value");

		if (dateIndex === -1 || valueIndex === -1) {
			return [];
		}

		const rows: HeatmapRow[] = [];

		for (const row of values) {
			if (!Array.isArray(row)) continue;
			const rawDate = row[dateIndex];
			const rawValue = row[valueIndex];

			if (!rawDate) continue;

			const dateString =
				typeof rawDate === "string"
					? rawDate
					: rawDate instanceof Date
						? this.toISODate(rawDate)
						: hasToISODate(rawDate)
							? rawDate.toISODate() ?? ""
							: "";

			const numValue = Number(rawValue ?? 0);
			if (!dateString || Number.isNaN(numValue)) continue;

			rows.push({ date: dateString, value: numValue });
		}

		return rows;
	}

	renderCalendar(
		container: HTMLElement,
		rows: HeatmapRow[],
		settings: ActivityGraphSettings,
		title?: string
	) {
		container.empty();

		const valueMap = new Map<string, number>();
		for (const row of rows) {
			valueMap.set(row.date, row.value);
		}

		const dates = rows
			.map((r) => new Date(r.date + "T00:00:00"))
			.sort((a, b) => a.getTime() - b.getTime());

		if (dates.length === 0) {
			container.createEl("div", { text: "No results." });
			return;
		}

		const end = new Date();
		end.setHours(0, 0, 0, 0);
		const start = new Date(end.getTime());
		start.setDate(start.getDate() - (settings.daysToShow - 1));
		const rangeStart = new Date(start.getTime());

		const weekStart = settings.startWeekOnMonday ? 1 : 0;
		const startDay = start.getDay();
		const offset = (startDay - weekStart + 7) % 7;
		start.setDate(start.getDate() - offset);

		let maxValue = 1;
		for (const row of rows) {
			const rowDate = new Date(row.date + "T00:00:00");
			if (rowDate < rangeStart || rowDate > end) continue;
			if (row.value > maxValue) maxValue = row.value;
		}

		const scaleMin = settings.scaleMin ?? 0;
		let scaleMax = settings.scaleMax ?? maxValue;
		if (scaleMax <= scaleMin) {
			scaleMax = scaleMin + 1;
		}

		const root = container.createDiv({ cls: "activity-graph" });

		if (title) {
			root.createEl("div", {
				text: title,
				cls: "activity-graph-title",
			});
		}

		const gradient =
			settings.customGradients[settings.colorGradient] ??
			GRADIENTS[settings.colorGradient as keyof typeof GRADIENTS] ??
			GRADIENTS.green;

		root.style.setProperty("--heatmap-1", gradient[0]);
		root.style.setProperty("--heatmap-2", gradient[1]);
		root.style.setProperty("--heatmap-3", gradient[2]);
		root.style.setProperty("--heatmap-4", gradient[3]);

		if (settings.showMonthLabels) {
			this.renderMonthLabels(root, start, end);
		}

		const body = root.createDiv({ cls: "activity-graph-body" });

		if (settings.showWeekdayLabels) {
			this.renderWeekdayLabels(body, settings);
		}

		const weeksEl = body.createDiv({ cls: "activity-graph-weeks" });

		const current = new Date(start.getTime());
		let weekCount = 0;

		while (current <= end) {
			const weekEl = weeksEl.createDiv({ cls: "activity-graph-week" });
			weekCount += 1;

			for (let i = 0; i < 7; i++) {
				if (current > end) break;

				const iso = this.toISODate(current);
				const value = valueMap.get(iso) ?? 0;
				const level = this.getLevel(value, scaleMin, scaleMax);

				const cell = weekEl.createDiv({
					cls: `activity-graph-cell level-${level}`,
				});

				cell.setAttr("title", `${iso}: ${value}`);
				cell.setAttr("aria-label", `${iso}: ${value}`);

				current.setDate(current.getDate() + 1);
			}
		}

		if (settings.showLegend) {
			this.renderLegend(root, settings);
		}

		this.applySizing(root, weekCount, settings.showWeekdayLabels);
	}

	applySizing(root: HTMLElement, weekCount: number, showWeekdayLabels: boolean) {
		const labelWidth = showWeekdayLabels ? 32 : 0;
		root.style.setProperty("--activity-graph-label-width", `${labelWidth}px`);

		const minCell = 4;
		const maxGap = 4;
		const minGap = 1;

		const update = () => {
			if (weekCount <= 0) return;
			const width = root.clientWidth;
			if (!width) return;

			const availableWidth = Math.max(width - labelWidth, 0);
			let gap = maxGap;
			let cellSize = Math.floor((availableWidth - (weekCount - 1) * gap) / weekCount);

			if (cellSize < minCell) {
				gap = minGap;
				cellSize = Math.floor((availableWidth - (weekCount - 1) * gap) / weekCount);
			}

			if (cellSize < minCell) {
				cellSize = minCell;
			}

			root.style.setProperty("--activity-graph-cell-size", `${cellSize}px`);
			root.style.setProperty("--activity-graph-cell-gap", `${gap}px`);
		};

		const retry = (remaining: number) => {
			update();
			if (remaining <= 0) return;
			if (!root.clientWidth) {
				requestAnimationFrame(() => retry(remaining - 1));
			}
		};

		retry(10);
	}

	renderMonthLabels(container: HTMLElement, start: Date, end: Date) {
		const monthRow = container.createDiv({ cls: "activity-graph-months" });
		const spacer = monthRow.createDiv({ cls: "activity-graph-month-spacer" });
		spacer.setText("");

		const monthsEl = monthRow.createDiv({ cls: "activity-graph-month-labels" });

		const current = new Date(start.getTime());
		let lastMonth = -1;

		while (current <= end) {
			const month = current.getMonth();

			if (month !== lastMonth) {
				const label = monthsEl.createDiv({ cls: "activity-graph-month-label" });
				label.setText(
					current.toLocaleString(undefined, { month: "short" })
				);
				lastMonth = month;
			} else {
				const spacerCell = monthsEl.createDiv({ cls: "activity-graph-month-label activity-graph-month-label--empty" });
				spacerCell.setText("");
			}

			current.setDate(current.getDate() + 7);
		}
	}

	renderWeekdayLabels(container: HTMLElement, settings: ActivityGraphSettings) {
		const labelsEl = container.createDiv({ cls: "activity-graph-weekday-labels" });

		const labels = settings.startWeekOnMonday
			? ["Mon", "", "Wed", "", "Fri", "", ""]
			: ["Sun", "", "Tue", "", "Thu", "", "Sat"];

		for (const label of labels) {
			const labelEl = labelsEl.createDiv({ cls: "activity-graph-weekday-label" });
			labelEl.setText(label);
		}
	}

	renderLegend(container: HTMLElement, settings: ActivityGraphSettings) {
		const legend = container.createDiv({ cls: "activity-graph-legend" });

		legend.createSpan({
			text: settings.legendLessLabel,
			cls: "activity-graph-legend-text",
		});

		for (let i = 0; i <= 4; i++) {
			legend.createDiv({
				cls: `activity-graph-cell activity-graph-legend-cell level-${i}`,
			});
		}

		legend.createSpan({
			text: settings.legendMoreLabel,
			cls: "activity-graph-legend-text",
		});
	}

	getLevel(value: number, minValue: number, maxValue: number): number {
		if (value <= minValue) return 0;
		if (value >= maxValue) return 4;

		const ratio = (value - minValue) / (maxValue - minValue);
		if (ratio <= 1 / 3) return 1;
		if (ratio <= 2 / 3) return 2;
		return 3;
	}

	toISODate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	parseBlock(source: string): { query: string; overrides: GraphOverrides } {
		const separator = "\n---\n";
		const index = source.indexOf(separator);

		if (index === -1) {
			return {
				query: source.trim(),
				overrides: {},
			};
		}

		const query = source.slice(0, index).trim();
		const overridesText = source.slice(index + separator.length).trim();

		return {
			query,
			overrides: this.parseOverrides(overridesText),
		};
	}

	parseOverrides(text: string): GraphOverrides {
		const overrides: GraphOverrides = {};

		if (!text) return overrides;

		for (const rawLine of text.split("\n")) {
			const line = rawLine.trim();
			if (!line || line.startsWith("#")) continue;

			const colonIndex = line.indexOf(":");
			if (colonIndex === -1) continue;

			const key = line.slice(0, colonIndex).trim();
			const rawValue = line.slice(colonIndex + 1).trim();

			let value: string | number | boolean | null = rawValue;

			if (rawValue === "true") value = true;
			else if (rawValue === "false") value = false;
			else if (rawValue === "null") value = null;
			else if (!Number.isNaN(Number(rawValue)) && rawValue !== "") value = Number(rawValue);

			switch (key) {
				case "title":
					overrides.title = String(value);
					break;
				case "daysToShow":
					if (typeof value === "number") overrides.daysToShow = value;
					break;
				case "showMonthLabels":
					if (typeof value === "boolean") overrides.showMonthLabels = value;
					break;
				case "showWeekdayLabels":
					if (typeof value === "boolean") overrides.showWeekdayLabels = value;
					break;
				case "showLegend":
					if (typeof value === "boolean") overrides.showLegend = value;
					break;
				case "startWeekOnMonday":
					if (typeof value === "boolean") overrides.startWeekOnMonday = value;
					break;
				case "legendLessLabel":
				case "lessLabel":
					overrides.legendLessLabel = String(value);
					break;
				case "legendMoreLabel":
				case "moreLabel":
					overrides.legendMoreLabel = String(value);
					break;
				case "colorGradient":
					if (isGradientName(value, this.settings.customGradients)) {
						overrides.colorGradient = value;
					}
					break;
				case "scaleMin":
				case "minValue":
					if (typeof value === "number") overrides.scaleMin = value;
					if (value === null) overrides.scaleMin = null;
					break;
				case "scaleMax":
				case "maxValue":
					if (typeof value === "number") overrides.scaleMax = value;
					if (value === null) overrides.scaleMax = null;
					break;
			}
		}

		return overrides;
	}
}
