import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import ActivityGraphPlugin from "./main";

export type GradientPalette = [string, string, string, string];
type BuiltInGradientName = "green" | "blue" | "purple" | "orange" | "red";
type GradientName = string;

export interface ActivityGraphSettings {
	daysToShow: number;
	showMonthLabels: boolean;
	showWeekdayLabels: boolean;
	showLegend: boolean;
	startWeekOnMonday: boolean;
	legendLessLabel: string;
	legendMoreLabel: string;
	colorGradient: GradientName;
	scaleMin: number | null;
	scaleMax: number | null;
	customGradients: Record<string, GradientPalette>;
}

export const DEFAULT_SETTINGS: ActivityGraphSettings = {
	daysToShow: 365,
	showMonthLabels: true,
	showWeekdayLabels: true,
	showLegend: true,
	startWeekOnMonday: false,
	legendLessLabel: "Less",
	legendMoreLabel: "More",
	colorGradient: "green",
	scaleMin: null,
	scaleMax: null,
	customGradients: {},
};

export const GRADIENTS: Record<BuiltInGradientName, GradientPalette> = {
	green: ["#1d3b29", "#2f6b45", "#3f8f5d", "#56b878"],
	blue: ["#1a2333", "#283d66", "#3d59a1", "#7aa2f7"], // primary blue
	purple: ["#2a1f45", "#4b3673", "#7b5fb6", "#bb9af7"], // purple accent
	orange: ["#33231a", "#66442c", "#9c6a4a", "#ff9e64"], // orange accent
	red: ["#331a1a", "#662c2c", "#9c4a4a", "#f7768e"], // red accent
};

const setCssProps = (el: HTMLElement, props: Record<string, string>): void => {
	for (const [key, value] of Object.entries(props)) {
		el.style.setProperty(key, value);
	}
};

const parseNumberOrNull = (value: string): number | null => {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const parsed = Number(trimmed);
	return Number.isNaN(parsed) ? null : parsed;
};

const parsePaletteColors = (value: string): GradientPalette | null => {
	const parts = value
		.split(/[,\s]+/)
		.map((part) => part.trim())
		.filter(Boolean);
	if (parts.length !== 4) return null;
	const [first, second, third, fourth] = parts;
	if (!first || !second || !third || !fourth) return null;
	return [first, second, third, fourth];
};

const getGradientOptions = (customGradients: Record<string, GradientPalette>): Record<string, string> => {
	const options: Record<string, string> = {
		green: "Green",
		blue: "Blue",
		purple: "Purple",
		orange: "Orange",
		red: "Red",
	};

	for (const name of Object.keys(customGradients)) {
		options[name] = `Custom: ${name}`;
	}

	return options;
};

const getGradientPalette = (
	gradientName: string,
	customGradients: Record<string, GradientPalette>
): GradientPalette => {
	return customGradients[gradientName] ?? GRADIENTS[gradientName as BuiltInGradientName] ?? GRADIENTS.green;
};

export class ActivityGraphSettingTab extends PluginSettingTab {
	plugin: ActivityGraphPlugin;

	constructor(app: App, plugin: ActivityGraphPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Display").setHeading();

		new Setting(containerEl)
			.setName("Days to show")
			.setDesc("How many days should appear in the heatmap.")
			.addText((text) =>
				text
					.setPlaceholder("365")
					.setValue(String(this.plugin.settings.daysToShow))
					.onChange(async (value) => {
						const parsed = Number(value);
						if (!Number.isNaN(parsed) && parsed > 0) {
							this.plugin.settings.daysToShow = parsed;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("Show month labels")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showMonthLabels)
					.onChange(async (value) => {
						this.plugin.settings.showMonthLabels = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Show weekday labels")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showWeekdayLabels)
					.onChange(async (value) => {
						this.plugin.settings.showWeekdayLabels = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Show legend")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showLegend)
					.onChange(async (value) => {
						this.plugin.settings.showLegend = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Week starts on monday")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.startWeekOnMonday)
					.onChange(async (value) => {
						this.plugin.settings.startWeekOnMonday = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('"Less" label')
			.addText((text) =>
				text
					.setValue(this.plugin.settings.legendLessLabel)
					.onChange(async (value) => {
						this.plugin.settings.legendLessLabel = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('"More" label')
			.addText((text) =>
				text
					.setValue(this.plugin.settings.legendMoreLabel)
					.onChange(async (value) => {
						this.plugin.settings.legendMoreLabel = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName("Scaling").setHeading();

		new Setting(containerEl)
			.setName("Minimum value")
			.setDesc("Leave blank to keep the scale relative to the data.")
			.addText((text) =>
				text
					.setPlaceholder("relative")
					.setValue(this.plugin.settings.scaleMin === null ? "" : String(this.plugin.settings.scaleMin))
					.onChange(async (value) => {
						this.plugin.settings.scaleMin = parseNumberOrNull(value);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Maximum value")
			.setDesc("Leave blank to keep the scale relative to the data.")
			.addText((text) =>
				text
					.setPlaceholder("relative")
					.setValue(this.plugin.settings.scaleMax === null ? "" : String(this.plugin.settings.scaleMax))
					.onChange(async (value) => {
						this.plugin.settings.scaleMax = parseNumberOrNull(value);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName("Color palettes").setHeading();

		const gradientSetting = new Setting(containerEl)
			.setName("Color gradient")
			.setDesc("Default heatmap color theme")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(getGradientOptions(this.plugin.settings.customGradients))
					.setValue(this.plugin.settings.colorGradient)
					.onChange(async (value) => {
						this.plugin.settings.colorGradient = value as GradientName;
						renderGradientPreview(this.plugin.settings.colorGradient);
						await this.plugin.saveSettings();
					})
			);

		const previewEl = gradientSetting.controlEl.createDiv({
			cls: "activity-graph-gradient-preview",
		});

		const renderGradientPreview = (gradientName: GradientName) => {
			previewEl.empty();

			const gradient = getGradientPalette(gradientName, this.plugin.settings.customGradients);

			const emptyCell = previewEl.createDiv({
				cls: "activity-graph-gradient-preview-cell",
			});
			setCssProps(emptyCell, {
				"--activity-graph-preview-color": "var(--background-modifier-border)",
			});

			for (const color of gradient) {
				const cell = previewEl.createDiv({
					cls: "activity-graph-gradient-preview-cell",
				});
				setCssProps(cell, { "--activity-graph-preview-color": color });
			}
		};

		renderGradientPreview(this.plugin.settings.colorGradient);

		let newPaletteName = "";
		let newPaletteColors = "";

		new Setting(containerEl)
			.setName("Add custom palette")
			.setDesc("Provide a name and four CSS colors (comma or space separated).")
			.addText((text) =>
				text
					.setPlaceholder("my-palette")
					.onChange((value) => {
						newPaletteName = value;
					})
			)
			.addText((text) =>
				text
					.setPlaceholder("#111111 #333333 #555555 #777777")
					.onChange((value) => {
						newPaletteColors = value;
					})
			)
			.addButton((button) =>
				button.setButtonText("Add").onClick(async () => {
					const name = newPaletteName.trim();
					const palette = parsePaletteColors(newPaletteColors);

					if (!name) {
						new Notice("Custom palette name is required.");
						return;
					}

					if (!palette) {
						new Notice("Enter exactly four colors for the palette.");
						return;
					}

					this.plugin.settings.customGradients[name] = palette;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		for (const [name, colors] of Object.entries(this.plugin.settings.customGradients)) {
			const paletteSetting = new Setting(containerEl)
				.setName(name)
				.setDesc(colors.join(", "));

			const preview = paletteSetting.controlEl.createDiv({
				cls: "activity-graph-gradient-preview",
			});

			const emptyCell = preview.createDiv({
				cls: "activity-graph-gradient-preview-cell",
			});
			setCssProps(emptyCell, {
				"--activity-graph-preview-color": "var(--background-modifier-border)",
			});

			for (const color of colors) {
				const cell = preview.createDiv({
					cls: "activity-graph-gradient-preview-cell",
				});
				setCssProps(cell, { "--activity-graph-preview-color": color });
			}

			paletteSetting.addButton((button) =>
				button.setButtonText("Remove").onClick(async () => {
					delete this.plugin.settings.customGradients[name];
					if (this.plugin.settings.colorGradient === name) {
						this.plugin.settings.colorGradient = "green";
					}
					await this.plugin.saveSettings();
					this.display();
				})
			);
		}
	}
}
