import { setDisplayMode } from "./announcements.js";
import { loadCustomPreset } from "./presets.js";

export const MODULE_ID = "damage-overhaul";

export const GROUPS = [
    {
        key: "announcement-mode",
        label: "Announcements",
        className: "damage-overhaul-announcements",
    },
    {
        key: "game-system-presets",
        label: "Presets",
        className: "damage-overhaul-presets",
    },
    {
        key: "performance-mode",
        label: "Performance",
        className: "damage-overhaul-performance",
    },
    {
        key: "debug-overlay",
        label: "Diagnostics",
        className: "damage-overhaul-diagnostics",
    },
];

function presetFileField() {
    return new foundry.data.fields.FilePathField({
        categories: ["TEXT"],
        nullable: true,
        blank: true,
        initial: "",
    });
}

export function registerConfiguration() {
    game.settings.register(MODULE_ID, "announcement-mode", {
        name: "Announcement Mode",
        hint: "Choose how floating damage and condition text appears on the canvas.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            overhaul: "Overhaul",
            standard: "Standard",
        },
        default: "overhaul",
        onChange: () => setDisplayMode(game.settings.get(MODULE_ID, "display-toggle")),
    });

    game.settings.register(MODULE_ID, "damage-font", {
        name: "Damage Font",
        hint: "Choose the typeface used for floating damage and condition text.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            modern: "Modern",
            pixel: "16-bit Videogame",
        },
        default: "pixel",
    });

    game.settings.register(MODULE_ID, "font-size", {
        name: "Font Size",
        hint: "Base text size for a standard 100-pixel grid.",
        scope: "world",
        config: true,
        type: Number,
        range: { min: 12, max: 48, step: 1 },
        default: 28,
    });

    game.settings.register(MODULE_ID, "hp-scale-min", {
        name: "Font Size - Max HP Linear (minimum)",
        hint: "Percentage of maximum HP where the text starts growing.",
        scope: "world",
        config: true,
        type: Number,
        range: { min: 0, max: 100, step: 1 },
        default: 20,
    });

    game.settings.register(MODULE_ID, "hp-scale-max", {
        name: "Font Size - Max HP Linear (maximum)",
        hint: "Percentage of maximum HP where the text reaches full size.",
        scope: "world",
        config: true,
        type: Number,
        range: { min: 0, max: 100, step: 1 },
        default: 40,
    });

    game.settings.register(MODULE_ID, "game-system-presets", {
        name: "Game System Presets",
        hint: "Which color set to use for condition announcements.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            auto: "Auto (By System)",
            default: "Default (Any System)",
            dnd5e: "Dungeons & Dragons 5th Edition",
            pf2e: "Pathfinder 2nd Edition",
            none: "None",
        },
        default: "auto",
    });

    game.settings.register(MODULE_ID, "custom-preset-file", {
        name: "Custom Preset File",
        scope: "world",
        config: true,
        type: presetFileField(),
        default: "",
        onChange: loadCustomPreset,
    });

    game.settings.register(MODULE_ID, "condition-sounds", {
        name: "Enable Condition Sound Cues",
        hint: "Play sounds attached to a preset when a condition is announced.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });

    game.settings.register(MODULE_ID, "performance-mode", {
        name: "Performance Mode",
        hint: "Use a lighter animation and a lower active-text limit.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register(MODULE_ID, "max-active-texts", {
        name: "Max Active Announcements",
        hint: "The number of announcements kept on screen at once.",
        scope: "world",
        config: true,
        type: Number,
        range: { min: 4, max: 80, step: 1 },
        default: 18,
    });

    game.settings.register(MODULE_ID, "debug-overlay", {
        name: "Debug Overlay",
        hint: "Show a small readout of the current animation decisions.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register(MODULE_ID, "display-toggle", {
        config: false,
        type: Boolean,
        default: true,
        onChange: setDisplayMode,
    });

    game.settings.register(MODULE_ID, "migrated-legacy", {
        config: false,
        scope: "world",
        type: Boolean,
        default: false,
    });
}

function settingRow(root, key) {
    const node = root.querySelector(`[name="${MODULE_ID}.${key}"]`)
        ?? root.querySelector(`[data-setting-id="${MODULE_ID}.${key}"]`);
    return node?.closest(".form-group") ?? node?.closest("[data-setting-id]") ?? null;
}

export function injectSettingsHeaders(app, html) {
    const root = html?.jquery ? html[0] : html;
    if (!(root instanceof HTMLElement))
        return;
    for (const group of GROUPS) {
        const row = settingRow(root, group.key);
        if (!row)
            continue;
        if (row.previousElementSibling?.classList.contains(group.className))
            continue;
        const header = document.createElement("h3");
        header.classList.add("form-header", "damage-overhaul-header", group.className);
        header.textContent = group.label;
        row.before(header);
    }
}
