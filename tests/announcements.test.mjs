import test from "node:test";
import assert from "node:assert/strict";

Math.clamp ??= (value, min, max) => Math.min(Math.max(value, min), max);

globalThis.foundry = {
  canvas: {
    containers: { PreciseText: class {} },
    animation: { CanvasAnimation: {} },
  },
  utils: {
    Color: { fromString: () => 0xffffff },
    getProperty: () => undefined,
  },
};
globalThis.game = {
  system: { id: "dnd5e" },
  user: { isGM: true },
  modules: new Map(),
  settings: {
    settings: new Map(),
    get: (_module, key) => ({
      "max-active-texts": 18,
      "performance-mode": false,
      "custom-preset-file": "",
      "game-system-presets": "auto",
      "damage-font": "pixel",
    }[key]),
  },
};
globalThis.canvas = { app: { ticker: { FPS: 60 } }, scene: { id: "scene", grid: { size: 100 } } };
globalThis.CONFIG = { Canvas: { groups: { interface: { zIndexScrollingText: 1100 } } } };
globalThis.document = { fonts: { check: () => true } };
globalThis.ui = { notifications: { warn() {} } };
globalThis.Hooks = { on() {}, once() {}, callAll() {} };

const { parseContent, adaptiveCap, preferredFontFamily } = await import("../scripts/announcements.js");
const { isValidPreset } = await import("../scripts/presets.js");

test("parseContent preserves arbitrary core scrolling text", () => {
  assert.equal(parseContent("Miss!").body, "Miss!");
  assert.equal(parseContent("5 damage").body, "5 damage");
  assert.equal(parseContent("−5").display, "−5");
  assert.equal(parseContent("−5").isNumeric, true);
  assert.equal(parseContent("−5").numeric, -5);
});

test("parseContent keeps condition levels available to the renderer", () => {
  const parsed = parseContent("Exhaustion 2");
  assert.equal(parsed.body, "Exhaustion 2");
  assert.equal(parsed.negative, false);
});

test("preset validation rejects legacy scalar entries", () => {
  assert.equal(isValidPreset({ stunned: { apply: "#ef9a9a", remove: "#a5d6a7" } }), true);
  assert.equal(isValidPreset({ stunned: "#ef9a9a" }), false);
});

test("Damage Font defaults to the recovered 16-bit face", () => {
  assert.equal(preferredFontFamily(), '"Press2P"');
  game.settings.get = (_module, key) => ({
    "damage-font": "modern",
  }[key]);
  assert.equal(preferredFontFamily(), "Verdana");
});

test("adaptiveCap respects performance and FPS floors", () => {
  assert.equal(adaptiveCap(), 18);
  game.settings.get = (_module, key) => ({
    "max-active-texts": 18,
    "performance-mode": true,
  }[key]);
  canvas.app.ticker.FPS = 15;
  assert.equal(adaptiveCap(), 5);
});
