import { MarkdownPostProcessorContext, Plugin } from "obsidian";

type HeatmapRow = {
	date: string;
	value: number;
};

export default class ExerciseHeatmapPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor(
			"exercise-heatmap",
			async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				const dv = (this.app as any).plugins?.plugins?.dataview?.api;
				if (!dv) {
					el.createEl("div", { text: "Dataview is required and is not enabled." });
					return;
				}

				try {
					const result = await dv.query(source, ctx.sourcePath);

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

					this.renderCalendar(el, rows);
				} catch (err) {
					el.createEl("pre", {
						text: `Plugin error:\n${err instanceof Error ? err.message : String(err)}`,
					});
				}
			}
		);
	}

	normalizeRows(tableResult: any): HeatmapRow[] {
		if (!tableResult || tableResult.type !== "table") {
			return [];
		}

		const headers: string[] = tableResult.headers ?? [];
		const values: any[][] = tableResult.values ?? [];

		const dateIndex = headers.findIndex((h) => h === "date");
		const valueIndex = headers.findIndex((h) => h === "value");

		if (dateIndex === -1 || valueIndex === -1) {
			return [];
		}

		const rows: HeatmapRow[] = [];

		for (const row of values) {
			const rawDate = row[dateIndex];
			const rawValue = row[valueIndex];

			if (!rawDate) continue;

			const dateString =
				typeof rawDate === "string"
					? rawDate
					: typeof rawDate?.toISODate === "function"
						? rawDate.toISODate()
						: String(rawDate);

			const numValue = Number(rawValue ?? 0);
			if (!dateString || Number.isNaN(numValue)) continue;

			rows.push({ date: dateString, value: numValue });
		}

		return rows;
	}

	renderCalendar(container: HTMLElement, rows: HeatmapRow[]) {
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

		const end = new Date(dates[dates.length - 1]!.getTime());
		const start = new Date(end.getTime());
		start.setDate(start.getDate() - 364);

		// move start back to Sunday so the first column is a full week
		start.setDate(start.getDate() - start.getDay());

		const root = container.createDiv({ cls: "exercise-heatmap" });
		const weeksEl = root.createDiv({ cls: "exercise-heatmap-weeks" });

		const current = new Date(start);

		while (current <= end) {
			const weekEl = weeksEl.createDiv({ cls: "exercise-heatmap-week" });

			for (let i = 0; i < 7; i++) {
				if (current > end) break;

				const iso = this.toISODate(current);
				const value = valueMap.get(iso) ?? 0;

				const cell = weekEl.createDiv({
					cls: `exercise-heatmap-cell level-${this.getLevel(value)}`,
				});

				cell.setAttr("title", `${iso}: ${value}`);
				cell.setAttr("aria-label", `${iso}: ${value}`);

				current.setDate(current.getDate() + 1);
			}
		}
	}

	getLevel(value: number): number {
		if (value <= 0) return 0;
		if (value === 1) return 1;
		if (value === 2) return 2;
		if (value === 3) return 3;
		return 4;
	}

	toISODate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}
}
