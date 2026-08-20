import { MODULE_ID } from "./configuration.js";

const BUILTIN_PRESETS = ["generic", "dnd5e", "pf2e"];

const presetCache = {
    generic: {},
    dnd5e: {},
    pf2e: {},
    custom: {},
};

const HARMFUL = new Set([
    "asleep", "bleeding", "blind", "blinded", "broken", "burning", "charmed",
    "confused", "controlled", "corroding", "cursed", "dead", "deaf", "deafened", "exhaustion",
    "degenerating", "disadvantage", "diseased", "distracted", "doomed", "drained",
    "dying", "encumbered", "enfeebled", "exhausted", "exhaustion1", "exhaustion2",
    "exhaustion3", "exhaustion4", "exhaustion5", "fascinated", "fatigued",
    "flat-footed", "fleeing", "frightened", "frozen", "grabbed", "grappled",
    "immobilized", "incapacitated", "marked", "paralyzed", "persistent", "petrified",
    "poisoned", "prone", "restrained", "shocked", "sickened", "silenced", "slowed",
    "stunned", "stupefied", "turned", "unconscious", "wounded", "clumsy", "weakened",
]);

const BENEFICIAL = new Set([
    "blessed", "concealed", "concentrating", "cover", "disengage", "dodging",
    "empowered", "flying", "hasted", "holy shield", "ice shield", "immune",
    "invisible", "hidden", "magic shield", "quickened", "reaction used", "burrowing",
    "hovering", "raging", "regenerating", "targeted", "undetected",
]);

const UTILITY = new Set([
    "invisible", "hidden", "marked", "targeted", "undetected", "burrowing", "hovering",
]);

function validatePreset(data, label) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        console.warn(`[${MODULE_ID}] Ignoring ${label}: expected an object keyed by condition name.`);
        return false;
    }
    const invalid = Object.entries(data).filter(([, entry]) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry))
            return true;
        return !Object.hasOwn(entry, "apply") && !Object.hasOwn(entry, "remove");
    });
    if (invalid.length) {
        const names = invalid.slice(0, 5).map(([name]) => name).join(", ");
        console.warn(`[${MODULE_ID}] Ignoring ${label}: invalid condition entries (${names}). Expected apply/remove fields.`);
        return false;
    }
    return true;
}

export async function loadBuiltinPresets() {
    for (const name of BUILTIN_PRESETS) {
        try {
            const preset = await foundry.utils.fetchJsonWithTimeout(`modules/${MODULE_ID}/assets/presets/${name}.json`);
            presetCache[name] = validatePreset(preset, `${name} preset`) ? preset : {};
        }
        catch (error) {
            console.warn(`[${MODULE_ID}] Unable to load ${name} preset`, error);
            presetCache[name] = {};
        }
    }
}

export async function loadCustomPreset(path) {
    presetCache.custom = {};
    if (!path)
        return;
    try {
        const preset = await foundry.utils.fetchJsonWithTimeout(path);
        if (validatePreset(preset, "custom preset"))
            presetCache.custom = preset;
    }
    catch (error) {
        console.warn(`[${MODULE_ID}] Unable to load custom preset`, error);
    }
}

export function isValidPreset(data) {
    return validatePreset(data, "preset");
}

export function classifyPolarity(conditionName) {
    const key = (conditionName ?? "").toLowerCase().trim();
    if (HARMFUL.has(key))
        return "harmful";
    if (BENEFICIAL.has(key))
        return "beneficial";
    return "neutral";
}

export function isUtilityCondition(conditionName) {
    return UTILITY.has((conditionName ?? "").toLowerCase().trim());
}

export function resolvePreset() {
    const customPath = game.settings.get(MODULE_ID, "custom-preset-file");
    if (customPath && Object.keys(presetCache.custom).length)
        return presetCache.custom;
    const mode = game.settings.get(MODULE_ID, "game-system-presets");
    if (mode === "none")
        return {};
    if (mode === "custom")
        return presetCache.custom;
    if (mode === "auto") {
        if (game.system.id === "dnd5e")
            return presetCache.dnd5e;
        if (game.system.id === "pf2e")
            return presetCache.pf2e;
        return presetCache.generic;
    }
    return presetCache[mode] ?? presetCache.generic;
}
