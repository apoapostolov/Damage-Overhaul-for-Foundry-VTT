import { MODULE_ID } from "./configuration.js";
import { getActorAttribute } from "./actor-attributes.js";
import { resolvePreset, classifyPolarity, isUtilityCondition } from "./presets.js";

const PreciseText = foundry?.canvas?.containers?.PreciseText ?? globalThis.PreciseText;
const CanvasAnimation = foundry?.canvas?.animation?.CanvasAnimation ?? globalThis.CanvasAnimation;

let coreScrollingText = null;
let externalPatchWarned = false;
let standardFallbackWarned = false;
let tokenCache = [];
let tokenCacheSceneId = null;

const pluginStrategies = new Map();
const liveTexts = [];
let debugElement = null;

function findScrollingContainer() {
    const iface = canvas?.interface;
    if (!iface)
        return null;
    const z = CONFIG.Canvas.groups.interface.zIndexScrollingText;
    return iface.children.find((child) => child?.zIndex === z) ?? iface;
}

export function preferredFontFamily() {
    if (game.settings.get(MODULE_ID, "damage-font") === "pixel")
        return '"Press2P"';
    if (document?.fonts?.check?.("16px Verdana"))
        return "Verdana";
    if (document?.fonts?.check?.('16px "Press2P"'))
        return '"Press2P"';
    return '"Courier New", monospace';
}

function refreshTokenCache() {
    tokenCacheSceneId = canvas?.scene?.id ?? null;
    tokenCache = canvas?.tokens?.placeables ?? [];
}

function performanceMode() {
    return !!game.settings.get(MODULE_ID, "performance-mode");
}

export function adaptiveCap() {
    let cap = Number(game.settings.get(MODULE_ID, "max-active-texts")) || 18;
    if (performanceMode())
        cap = Math.max(4, Math.floor(cap * 0.75));
    const fps = canvas?.app?.ticker?.FPS ?? 60;
    if (fps < 20)
        cap = Math.max(4, Math.floor(cap * 0.45));
    else if (fps < 30)
        cap = Math.max(6, Math.floor(cap * 0.6));
    else if (fps < 45)
        cap = Math.max(8, Math.floor(cap * 0.8));
    return Math.clamp(cap, 4, 80);
}

function pruneLiveTexts() {
    for (let i = liveTexts.length - 1; i >= 0; i--) {
        const text = liveTexts[i];
        if (!text || text.destroyed || !text.parent)
            liveTexts.splice(i, 1);
    }
}

function enforceCap() {
    pruneLiveTexts();
    const cap = adaptiveCap();
    while (liveTexts.length >= cap) {
        const oldest = liveTexts.shift();
        if (!oldest || oldest.destroyed)
            continue;
        try {
            oldest.parent?.removeChild(oldest);
            oldest.destroy();
        }
        catch (error) {
            console.warn(`[${MODULE_ID}] Unable to remove an old announcement`, error);
        }
    }
    return cap;
}

function updateDebugOverlay(payload) {
    if (!game.settings.get(MODULE_ID, "debug-overlay")) {
        debugElement?.remove();
        debugElement = null;
        return;
    }
    if (!debugElement) {
        debugElement = document.createElement("div");
        debugElement.id = "damage-overhaul-debug";
        Object.assign(debugElement.style, {
            position: "fixed",
            right: "12px",
            bottom: "12px",
            zIndex: "120",
            padding: "6px 8px",
            borderRadius: "6px",
            background: "rgba(0,0,0,0.75)",
            color: "#f5f5f5",
            fontFamily: '"Courier New", monospace',
            fontSize: "11px",
            pointerEvents: "none",
            whiteSpace: "pre-line",
        });
        document.body.appendChild(debugElement);
    }
    debugElement.textContent = [
        `Mode: ${payload.mode}`,
        `Kind: ${payload.kind}`,
        `Text: ${payload.text}`,
        `Color: ${payload.color}`,
        `Size: ${Math.round(payload.size)}`,
        `Cap: ${payload.cap}`,
    ].join("\n");
}

function tokenNear(origin) {
    if (!origin)
        return null;
    if (tokenCacheSceneId !== (canvas?.scene?.id ?? null))
        refreshTokenCache();
    const snapDistance = Math.max(8, (canvas?.scene?.grid?.size ?? 100) * 0.25);
    let best = null;
    let bestDistance = snapDistance;
    for (const token of tokenCache) {
        const center = token?.center;
        if (!center)
            continue;
        const distance = Math.hypot(center.x - origin.x, center.y - origin.y);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = token;
            if (distance <= 8)
                break;
        }
    }
    return best;
}

export function parseContent(content) {
    const source = String(content ?? "");
    const numericSource = source.replace(/−/gu, "-");
    const numeric = Number(numericSource);
    const isNumeric = Number.isFinite(numeric) && source.trim() !== "";
    const leading = source.match(/^[^A-Za-z]*/u)?.[0] ?? "";
    const negative = /[-−]/u.test(leading);
    const display = source.trim();
    let body = source;
    if (isNumeric)
        body = String(Math.abs(numeric));
    else
        body = source.replace(/^[\s(+−-]+/u, "").replace(/[)\s]+$/u, "");
    return { isNumeric, numeric, negative, body, display };
}

function numericColor(numeric, negative) {
    if (negative)
        return "#ef9a9a";
    if (numeric > 0)
        return "#a5d6a7";
    return "#f5f5f0";
}

function conditionColors(conditionName, isRemoval) {
    const polarity = classifyPolarity(conditionName);
    const utility = isUtilityCondition(conditionName);
    let apply = "#f5f5f0";
    let remove = "#f5f5f0";

    if (polarity === "harmful") {
        apply = "#ef9a9a";
        remove = "#a5d6a7";
    }
    else if (polarity === "beneficial") {
        apply = "#a5d6a7";
        remove = "#f5f5f0";
    }
    if (utility) {
        apply = "#90caf9";
        remove = "#f5f5f0";
    }

    const entry = resolvePreset()[conditionName];
    if (entry) {
        apply = entry.apply ?? apply;
        remove = entry.remove ?? remove;
    }

    const color = isRemoval ? remove : apply;
    const sound = isRemoval ? entry?.removeSound : entry?.applySound;
    return { color, sound };
}

async function announce(origin, content) {
    if (!origin || content === null || content === undefined)
        return;
    const container = findScrollingContainer();
    if (!container)
        return;

    const parsed = parseContent(content);
    if (!parsed.display)
        return;
    const token = tokenNear(origin);
    const actor = token?.actor ?? token?.document?.actor ?? null;
    const hpmax = getActorAttribute(actor, "hpmax");

    let scaleBoost = 1;
    if (hpmax && parsed.isNumeric) {
        const low = (+game.settings.get(MODULE_ID, "hp-scale-min") * hpmax) / 100;
        const high = (+game.settings.get(MODULE_ID, "hp-scale-max") * hpmax) / 100;
        const span = high - low;
        if (span > 0)
            scaleBoost += Math.clamp((+parsed.body - low) / span, 0, 1);
    }

    const grid = canvas?.scene?.grid?.size ?? 100;
    const size = game.settings.get(MODULE_ID, "font-size") * (grid / 100) * scaleBoost;
    const style = {
        stroke: 0x000000,
        strokeThickness: 5,
        fill: 0xffffff,
        dropShadowColor: 0,
        dropShadowAlpha: 1,
        fontWeight: "bold",
        fontFamily: preferredFontFamily(),
        letterSpacing: 1,
        fontSize: size,
    };

    let colorHex = "#f5f5f0";
    if (parsed.isNumeric) {
        colorHex = numericColor(parsed.numeric, parsed.negative);
        style.fill = +foundry.utils.Color.fromString(colorHex);
    }
    else {
        const match = parsed.body.match(/^([a-z][a-z -]*?)(?:\s*(\d+))?$/iu);
        if (match) {
            const displayName = parsed.body;
            const baseName = match[1].trim().toLowerCase();
            const level = match[2];
            const preset = resolvePreset();
            const numberedName = level ? `${baseName}${level}` : baseName;
            const conditionName = level && (Object.hasOwn(preset, numberedName)
                || classifyPolarity(numberedName) !== "neutral")
                ? numberedName
                : baseName;
            parsed.body = `${parsed.negative ? "-" : ""}${displayName}`;
            const { color, sound } = conditionColors(conditionName, parsed.negative);
            colorHex = color;
            style.fill = +foundry.utils.Color.fromString(colorHex);
            if (sound && game.settings.get(MODULE_ID, "condition-sounds"))
                playCue(sound);
        }
        else {
            parsed.body = parsed.display;
            colorHex = "#f5f5f0";
            style.fill = +foundry.utils.Color.fromString(colorHex);
        }
    }

    const cap = enforceCap();
    const styleObject = PreciseText.getTextStyle({ ...style });
    const text = container.addChild(new PreciseText(parsed.body, styleObject));
    liveTexts.push(text);
    text.visible = false;
    text.anchor.set(0.5, 0.5);
    const footX = token?.center?.x ?? origin.x;
    const footY = token
        ? ((token.document?.y ?? token.y ?? (origin.y - token.h / 2)) + token.h - 4 - (text.height / 2))
        : origin.y - 10;
    text.position.set(footX, footY);

    updateDebugOverlay({
        mode: performanceMode() ? "performance" : "full",
        kind: parsed.isNumeric ? "number" : "condition",
        text: parsed.body,
        color: colorHex,
        size,
        cap,
    });

    try {
        await runAnimation(text, size);
    }
    finally {
        const index = liveTexts.indexOf(text);
        if (index >= 0)
            liveTexts.splice(index, 1);
        if (!text.destroyed) {
            text.parent?.removeChild(text);
            text.destroy();
        }
    }
}

async function runAnimation(text, size) {
    const duration = 2000;
    const baseY = text.position.y;
    const animateStep = (attributes, fraction, easing) => CanvasAnimation.animate(attributes, {
        context: text,
        duration: duration * fraction,
        easing,
        ontick: () => (text.visible = true),
    });

    if (performanceMode()) {
        const rise = Math.max(8, Math.round(size * 0.45));
        await animateStep([
            { parent: text, attribute: "alpha", from: 0, to: 1.0 },
            { parent: text.scale, attribute: "x", from: 0.8, to: 1.0 },
            { parent: text.scale, attribute: "y", from: 0.8, to: 1.0 },
            { parent: text, attribute: "y", from: baseY + 6, to: baseY - rise * 0.4 },
        ], 0.18, CanvasAnimation.easeOutCircle);
        await animateStep([
            { parent: text, attribute: "alpha", to: 0.0 },
            { parent: text, attribute: "y", to: baseY - rise },
        ], 0.32, CanvasAnimation.easeInCircle);
        return;
    }

    // The bounce is the defining Overhaul motion: launch, drop past the
    // anchor, rebound, settle, hold, then leave the canvas.
    await animateStep([
        { parent: text, attribute: "alpha", from: 0, to: 1.0 },
        { parent: text.scale, attribute: "x", from: 0.7, to: 1.0 },
        { parent: text.scale, attribute: "y", from: 0.7, to: 1.0 },
        { parent: text, attribute: "y", from: baseY + 8, to: baseY },
    ], 0.10, CanvasAnimation.easeInOutCosine);
    await animateStep([
        { parent: text, attribute: "y", to: baseY - size * 0.85 },
    ], 0.12, CanvasAnimation.easeOutCircle);
    await animateStep([
        { parent: text, attribute: "y", to: baseY + size * 0.22 },
    ], 0.10, CanvasAnimation.easeInCircle);
    await animateStep([
        { parent: text, attribute: "y", to: baseY - size * 0.24 },
    ], 0.10, CanvasAnimation.easeOutCircle);
    await animateStep([
        { parent: text, attribute: "y", to: baseY },
    ], 0.10, CanvasAnimation.easeInOutCosine);
    await animateStep([
        { parent: text, attribute: "y", to: baseY },
    ], 0.33, CanvasAnimation.easeInOutCosine);
    await animateStep([
        { parent: text, attribute: "alpha", to: 0.0 },
        { parent: text, attribute: "y", to: baseY - size * 0.16 },
    ], 0.15, CanvasAnimation.easeInCircle);
}

async function playCue(path) {
    if (!path)
        return;
    try {
        await new Audio(path).play();
    }
    catch (error) {
        console.warn(`[${MODULE_ID}] Unable to play condition sound`, error);
    }
}

function warnExternalPatch() {
    if (externalPatchWarned || !game.user?.isGM)
        return;
    const current = canvas?.interface?.createScrollingText;
    if (typeof current !== "function" || current === announce)
        return;
    const source = String(current);
    if (!source.includes("/modules/"))
        return;
    externalPatchWarned = true;
    const message = `[${MODULE_ID}] Another module also changes floating text. If results look wrong, switch Announcement Mode to Standard or disable the other module.`;
    ui.notifications?.warn(message);
    console.warn(message);
}

function builtinChoices() {
    const choices = { overhaul: "Overhaul", standard: "Standard" };
    for (const [id, strategy] of pluginStrategies.entries())
        choices[id] = strategy.label;
    return choices;
}

function strategyFor(value) {
    if (value === "standard") {
        if (coreScrollingText)
            return coreScrollingText.bind(canvas.interface);
        if (!standardFallbackWarned) {
            standardFallbackWarned = true;
            ui.notifications?.warn("Damage Overhaul could not restore Foundry's native scrolling text.");
            console.warn(`[${MODULE_ID}] Native scrolling text was not captured; Standard mode is unavailable.`);
        }
        return () => undefined;
    }
    if (value === "overhaul" || !value)
        return announce;
    return pluginStrategies.get(value)?.fn ?? announce;
}

export function registerStrategy(id, fn, options = {}) {
    if (!id || typeof id !== "string")
        throw new Error(`[${MODULE_ID}] registerStrategy requires a string id`);
    if (typeof fn !== "function")
        throw new Error(`[${MODULE_ID}] registerStrategy requires a function`);
    if (id === "overhaul" || id === "standard")
        throw new Error(`[${MODULE_ID}] The id "${id}" is reserved`);
    const label = options.label || id;
    pluginStrategies.set(id, { fn, label });
    refreshStrategyChoices();
    return () => {
        const removed = pluginStrategies.delete(id);
        refreshStrategyChoices();
        return removed;
    };
}

export function unregisterStrategy(id) {
    const removed = pluginStrategies.delete(id);
    refreshStrategyChoices();
    return removed;
}

export function getStrategyChoices() {
    return builtinChoices();
}

export function setStrategy(value) {
    const strategy = strategyFor(value);
    if (canvas?.interface)
        canvas.interface.createScrollingText = strategy;
}

export function setDisplayMode(active) {
    if (!active)
        setStrategy("standard");
    else
        setStrategy(game.settings.get(MODULE_ID, "announcement-mode"));
}

function refreshStrategyChoices() {
    const modeSetting = game.settings.settings.get(`${MODULE_ID}.announcement-mode`);
    if (modeSetting)
        modeSetting.choices = builtinChoices();
}

export function bootAnnouncements() {
    refreshTokenCache();
    const current = canvas?.interface?.createScrollingText;
    if (!coreScrollingText && typeof current === "function" && current !== announce)
        coreScrollingText = current;
    warnExternalPatch();
    game.modules.get(MODULE_ID).api = {
        registerStrategy,
        unregisterStrategy,
        getStrategyChoices,
    };
    Hooks.callAll(`${MODULE_ID}.registerAnimationStrategies`, {
        registerStrategy,
        unregisterStrategy,
        getStrategyChoices,
    });
    refreshStrategyChoices();
}

Hooks.on("canvasReady", refreshTokenCache);
Hooks.on("createToken", refreshTokenCache);
Hooks.on("deleteToken", refreshTokenCache);
