import { registerConfiguration, MODULE_ID, injectSettingsHeaders } from "./configuration.js";
import { registerHotkey } from "./hotkeys.js";
import { bootAnnouncements, setDisplayMode, getStrategyChoices } from "./announcements.js";
import { loadBuiltinPresets, loadCustomPreset } from "./presets.js";

Hooks.once("setup", () => {
    registerConfiguration();
    registerHotkey();
});

Hooks.once("ready", async () => {
    document.fonts?.load?.('16px "ScrollingTextsPixel"');
    document.fonts?.load?.('16px "Press2P"');

    bootAnnouncements();
    await migrateLegacySettings();
    await loadBuiltinPresets();
    await loadCustomPreset(game.settings.get(MODULE_ID, "custom-preset-file"));

    const modeSetting = game.settings.settings.get(`${MODULE_ID}.announcement-mode`);
    if (modeSetting)
        modeSetting.choices = getStrategyChoices();

    setDisplayMode(game.settings.get(MODULE_ID, "display-toggle"));
});

Hooks.on("canvasReady", () => {
    bootAnnouncements();
    setDisplayMode(game.settings.get(MODULE_ID, "display-toggle"));
});

Hooks.on("renderSettingsConfig", injectSettingsHeaders);

const LEGACY_SETTINGS = {
    "scrolling-type": ["announcement-mode", value => value === "oldrpg" ? "overhaul" : value],
    "font-size": ["font-size", value => Number(value)],
    "minimum-size-hp-linear": ["hp-scale-min", value => Number(value)],
    "maximum-size-hp-linear": ["hp-scale-max", value => Number(value)],
    "condition-map": ["game-system-presets", value => value],
    "condition-custom-map": ["custom-preset-file", value => value],
    "enable-condition-sounds": ["condition-sounds", value => Boolean(value)],
    "performance-mode": ["performance-mode", value => Boolean(value)],
    "max-active-texts": ["max-active-texts", value => Number(value)],
};

function legacySettingValue(source, key) {
    const fullKey = `scrolling-texts.${key}`;
    const entry = Array.isArray(source)
        ? source.find(setting => setting.key === fullKey)?.value
        : source?.[fullKey];
    if (entry === undefined)
        return undefined;
    try {
        return JSON.parse(entry);
    }
    catch {
        return entry;
    }
}

function sameSettingValue(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

async function migrateLegacySettings() {
    if (!game.user.isGM || game.settings.get(MODULE_ID, "migrated-legacy"))
        return;

    const source = game.settings.storage.get("world")?._source ?? [];
    for (const [legacyKey, [currentKey, transform]] of Object.entries(LEGACY_SETTINGS)) {
        const legacyValue = legacySettingValue(source, legacyKey);
        if (legacyValue === undefined)
            continue;
        const setting = game.settings.settings.get(`${MODULE_ID}.${currentKey}`);
        if (!setting)
            continue;
        const currentValue = game.settings.get(MODULE_ID, currentKey);
        if (sameSettingValue(currentValue, setting.default))
            await game.settings.set(MODULE_ID, currentKey, transform(legacyValue));
    }
    await game.settings.set(MODULE_ID, "migrated-legacy", true);
}
