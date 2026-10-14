import {
	type Events,
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	Plugin,
} from "obsidian";
import { type DataviewApi, getAPI } from "obsidian-dataview";
import { parseBlock } from "./block";
import { type HeatmapRow, renderCalendar } from "./graph";
import {
	ActivityGraphSettingTab,
	type ActivityGraphSettings,
	normalizeSettings,
} from "./settings";

type QueryResult = Awaited<ReturnType<DataviewApi["tryQuery"]>>;

export default class ActivityGraphPlugin extends Plugin {
	settings: ActivityGraphSettings;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new ActivityGraphSettingTab(this.app, this));
		this.registerMarkdownCodeBlockProcessor(
			"activity-graph",
			(source, container, context) =>
				this.registerGraph(source, container, context),
		);
	}

	async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private registerGraph(
		source: string,
		container: HTMLElement,
		context: MarkdownPostProcessorContext,
	): void {
		let disposed = false;
		let generation = 0;

		const render = async () => {
			const currentGeneration = ++generation;
			const dataview = getAPI(this.app);
			if (!dataview || !dataview.index.initialized) {
				container.setText("Waiting for dataview...");
				return;
			}

			try {
				const { query, overrides } = parseBlock(
					source,
					this.settings.customGradients,
				);
				const result = await dataview.tryQuery(
					query,
					context.sourcePath,
				);
				if (disposed || currentGeneration !== generation) return;

				const rows = normalizeRows(result, dataview);
				container.empty();
				if (!rows.length) {
					container.setText("No results.");
					return;
				}

				renderCalendar(
					container,
					rows,
					{ ...this.settings, ...overrides },
					overrides.title,
				);
			} catch (error) {
				if (disposed || currentGeneration !== generation) return;
				container.empty();
				container.createEl("pre", {
					text: `Plugin error:\n${String(error)}`,
				});
			}
		};

		const events: Events = this.app.metadataCache;
		const readyRef = events.on("dataview:index-ready", () => void render());
		context.addChild(
			new (class extends MarkdownRenderChild {
				onunload() {
					disposed = true;
					generation += 1;
					events.offref(readyRef);
				}
			})(container),
		);

		void render();
	}
}

const normalizeRows = (
	result: QueryResult,
	dataview: DataviewApi,
): HeatmapRow[] => {
	if (result.type !== "table") return [];

	const dateIndex = result.headers.indexOf("date");
	const valueIndex = result.headers.indexOf("value");
	if (dateIndex === -1 || valueIndex === -1) return [];

	return result.values.flatMap((row) => {
		const rawDate = row[dateIndex];
		const date =
			typeof rawDate === "string"
				? rawDate
				: dataview.value.isDate(rawDate)
					? (rawDate.toISODate() ?? "")
					: "";
		const value = Number(row[valueIndex] ?? 0);

		return date && !Number.isNaN(value) ? [{ date, value }] : [];
	});
};
