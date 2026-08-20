# Upstream Comparison

Compared against the original `scrolling-texts` v1.18 module by elizeuangelo in
`FoundryData.12`.

## Findings

The fork shared the following behavior and implementation shapes with the
original module:

- The same `scrolling-texts` module identity and settings namespace.
- The same five-stage floating-text animation sequence.
- The same `PreciseText` construction and canvas interface override.
- The same HP scaling thresholds and D&D 5e / Pathfinder 2e attribute paths.
- The same condition-map loading pattern and custom file-picker helper.
- The same condition-map color tables and keybinding behavior.

The v13 fork had already added performance controls, active-text culling,
condition polarity, generic fallback mapping, diagnostics, and a plugin API.
Those additions were also rewritten for the Damage Overhaul structure.

## Rewrite

Damage Overhaul now uses a new module identity and independent implementation:

- `damage-overhaul` replaces `scrolling-texts`.
- `scripts/announcements.js` replaces the old animation module with a new
  parser, container resolver, lifecycle model, cap enforcement path, and
  animation timeline.
- `scripts/presets.js` replaces the old condition loader and uses structured
  preset entries with `apply` and `remove` fields.
- `scripts/configuration.js` replaces the old settings registration and groups
  settings into Announcements, Presets, Performance, and Diagnostics.
- `scripts/actor-attributes.js` replaces the old attribute helper and includes
  a generic HP fallback for systems without a registered path map.
- A selected custom preset file overrides the selected built-in preset without
  adding a hidden or dead choice to the five-item Game System Presets list.
- `scripts/hotkeys.js` replaces the old keybinding module.
- The legacy custom FilePicker class was removed. Foundry v14's native
  `FilePathField` now handles JSON preset selection.
- Preset palettes were rebuilt with new semantic colors and structured JSON.
- The v14 scrolling-text container is resolved by its z-index instead of a
  child index.
- The v14 namespaced `foundry.utils.getProperty` API is used.

The remaining conceptual overlap is unavoidable product behavior: displaying
floating damage and condition announcements, choosing a system preset, and
keeping Standard mode available. The implementation, module identity, setting
surface, animation timeline, parser, preset schema, and color palette are now
owned by Damage Overhaul.
