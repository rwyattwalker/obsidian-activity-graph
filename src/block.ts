import {
	type ActivityGraphSettings,
	type GradientPalette,
	isGradientName,
} from "./settings";

export type GraphOverrides = Partial<ActivityGraphSettings> & {
	title?: string;
};

type OverrideValue = string | number | boolean | null;

export const parseBlock = (
	source: string,
	customGradients: Record<string, GradientPalette>,
): { query: string; overrides: GraphOverrides } => {
	const separator = "\n---\n";
	const separatorIndex = source.indexOf(separator);

	if (separatorIndex === -1) {
		return { query: source.trim(), overrides: {} };
	}

	return {
		query: source.slice(0, separatorIndex).trim(),
		overrides: parseOverrides(
			source.slice(separatorIndex + separator.length).trim(),
			customGradients,
		),
	};
};

const parseOverrides = (
	text: string,
	customGradients: Record<string, GradientPalette>,
): GraphOverrides => {
	const overrides: GraphOverrides = {};

	for (const rawLine of text.split("\n")) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;

		const separator = line.indexOf(":");
		if (separator === -1) continue;

		applyOverride(
			overrides,
			line.slice(0, separator).trim(),
			parseValue(line.slice(separator + 1).trim()),
			customGradients,
		);
	}

	return overrides;
};

const parseValue = (value: string): OverrideValue => {
	if (value === "true") return true;
	if (value === "false") return false;
	if (value === "null") return null;

	const number = Number(value);
	return value && !Number.isNaN(number) ? number : value;
};

const applyOverride = (
	overrides: GraphOverrides,
	key: string,
	value: OverrideValue,
	customGradients: Record<string, GradientPalette>,
): void => {
	switch (key) {
		case "title":
			overrides.title = String(value);
			break;
		case "daysToShow":
			if (typeof value === "number") overrides.daysToShow = value;
			break;
		case "showMonthLabels":
		case "showWeekdayLabels":
		case "showLegend":
		case "startWeekOnMonday":
			if (typeof value === "boolean") overrides[key] = value;
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
			if (isGradientName(value, customGradients)) {
				overrides.colorGradient = value;
			}
			break;
		case "scaleMin":
		case "minValue":
			if (typeof value === "number" || value === null) {
				overrides.scaleMin = value;
			}
			break;
		case "scaleMax":
		case "maxValue":
			if (typeof value === "number" || value === null) {
				overrides.scaleMax = value;
			}
			break;
	}
};
