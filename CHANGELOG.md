# Changelog

The first release combines the final Foundry v14 build. Earlier development
entries that shipped in 14.0.0 are included in that release below.

## [14.0.0] - 2026-08-20

Damage Overhaul brings the bounce from Scrolling Texts to Foundry v14. Damage,
healing, and conditions appear near the affected creature instead of getting
lost over the middle of a token.

### Added

- Overhaul mode brings back the animated bounce, with text anchored near the
  token's feet. Standard mode keeps Foundry's native scrolling text available.
- D&D 5e, Pathfinder 2e, and generic presets give conditions recognizable
  colors. GMs can supply their own preset file and optional sounds.
- Performance controls limit the number of announcements visible at once.
- Modern and 16-bit Videogame fonts are available; the latter is the default.
- Module authors can register their own announcement styles.
- Display choices persist after a reload. Announcements handle ordinary text,
  minus signs, and numbered conditions, then clear when their scene changes.

### Changed

- The package is now `damage-overhaul`. GMs replacing `scrolling-texts` should
  disable the old module before enabling this one.

### Upgrade notes

- This release uses a new module ID. On the first GM load, matching world
  settings migrate from `scrolling-texts` records that are still present.
  Review any custom preset file: the new structured JSON format needs a manual
  update.
- Disable or remove the former `scrolling-texts` package before enabling Damage Overhaul.

[14.0.0]: https://github.com/apoapostolov/Damage-Overhaul-for-Foundry-VTT/releases/tag/v14.0.0
