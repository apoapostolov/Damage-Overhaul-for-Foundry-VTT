# Changelog

All notable changes to Damage Overhaul are documented here.

## Unreleased

### Fixed

- The GM display toggle no longer resets on reload.
- Arbitrary text and Unicode-minus numbers are preserved.
- Numbered conditions retain their display text and preset lookup.
- Mode changes respect a disabled display toggle.
- Active announcements clean up against their original Scene container.
- The debug overlay is removed when disabled.
- Legacy `scrolling-texts` settings migrate when matching records are present.
- Custom presets reject the old scalar-entry format instead of failing silently.

### Added

- `Damage Font` setting with Modern and 16-bit Videogame options.
- The recovered Press Start 2P font is now enabled by default.
- Regression tests for parsing, preset validation, adaptive caps, and font selection.

## [14.0.0] - 2026-08-20

Damage Overhaul is the Foundry VTT v14 release of the module formerly known as Scrolling Texts. It focuses on readable,
feet-level token announcements with the original bounce behavior restored.

### Added

- Overhaul mode with launch, drop, rebound, settle, hold, and fade phases.
- Feet-level announcement placement based on the token's lower edge.
- Structured condition presets for D&D 5e, Pathfinder 2e, and generic systems.
- Custom JSON preset files with apply and removal colors and optional sound cues.
- Automatic condition-map selection by active game system.
- Performance Mode and a configurable active-announcement limit.
- Standard mode for Foundry's native scrolling text behavior.
- A registration API for custom announcement strategies.

### Changed

- Rebranded the package as Damage Overhaul with the module ID `damage-overhaul`.
- Renamed Scrolling Type to Announcement Mode and Old RPG to Overhaul.
- Renamed Condition Color Map to Game System Presets.
- Reordered settings into Announcements, Presets, Performance, and Diagnostics sections.
- Updated the package for Foundry VTT v14 APIs and native file-path settings.

### Fixed

- Scrolling text now attaches to Foundry's scrolling-text container instead of relying on a child index.
- HP-based sizing uses namespaced Foundry attribute access and a generic HP fallback.
- Condition parsing handles removal signs, parentheses, and numbered conditions.
- Release archives include all condition preset assets.

### Upgrade notes

- This release uses a new module ID. Foundry treats it as a new package, so settings from `scrolling-texts` do not transfer
  automatically.
- Disable or remove the former `scrolling-texts` package before enabling Damage Overhaul.

[14.0.0]: https://github.com/apoapostolov/Damage-Overhaul-for-Foundry-VTT/releases/tag/v14.0.0
