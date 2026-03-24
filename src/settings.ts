import { App, PluginSettingTab, Setting } from "obsidian";
import ActivityGraphPlugin from "./main";

type GradientName = "green" | "blue" | "purple" | "orange" | "red";

export interface ActivityGraphSettings {
	daysToShow: number;
	showMonthLabels: boolean;
	showWeekdayLabels: boolean;
	showLegend: boolean;
	startWeekOnMonday: boolean;
	legendLessLabel: string;
	legendMoreLabel: string;
	colorGradient: GradientName;
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
};

export const GRADIENTS: Record<GradientName, [string, string, string, string]> = {

	green: ["#1d3b29", "#2f6b45", "#3f8f5d", "#56b878"],
	blue: ["#1a2333", "#283d66", "#3d59a1", "#7aa2f7"], // primary blue
	purple: ["#241b33", "#3b2c66", "#5a4a9c", "#bb9af7"], // purple accent
	orange: ["#33231a", "#66442c", "#9c6a4a", "#ff9e64"], // orange accent
	red: ["#331a1a", "#662c2c", "#9c4a4a", "#f7768e"], // red accent
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

		containerEl.createEl("h2", { text: "Activity Graph Settings" });

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
			.setName("Start week on Monday")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.startWeekOnMonday)
					.onChange(async (value) => {
						this.plugin.settings.startWeekOnMonday = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Legend "Less" label')
			.addText((text) =>
				text
					.setValue(this.plugin.settings.legendLessLabel)
					.onChange(async (value) => {
						this.plugin.settings.legendLessLabel = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Legend "More" label')
			.addText((text) =>
				text
					.setValue(this.plugin.settings.legendMoreLabel)
					.onChange(async (value) => {
						this.plugin.settings.legendMoreLabel = value;
						await this.plugin.saveSettings();
					})
			);
		const gradientSetting = new Setting(containerEl)
			.setName("Color gradient")
			.setDesc("Default heatmap color theme")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						green: "Green",
						blue: "Blue",
						purple: "Purple",
						orange: "Orange",
						red: "Red",
					})
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

			const gradient = GRADIENTS[gradientName];

			const emptyCell = previewEl.createDiv({
				cls: "activity-graph-gradient-preview-cell",
			});
			emptyCell.style.background = "var(--background-modifier-border)";

			for (const color of gradient) {
				const cell = previewEl.createDiv({
					cls: "activity-graph-gradient-preview-cell",
				});
				cell.style.background = color;
			}
		};

		renderGradientPreview(this.plugin.settings.colorGradient);
	}
}
