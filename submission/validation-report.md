# Static Validation Report

Candidate: Speicherstadt v0.1.0
Checked: 2026-08-05
RMS SHA-256: `c74f93c3b4b7fb12612b71e6f9e9067b2de3acdff851fb01f1818b8fa493417f`

## Map-Specific Validator

`node tools/validate-rms.mjs` passes. It checks the section and control
structure, exact transposed geometry, six crossing rectangles, non-overlapping
land-origin squares, flat elevation, explicit 9-villager start,
object/resource totals, actor-area references, land confinement, neutral
ownership, mandatory placement, and the competition's prohibited mechanics.

## Current RMS Grammar

T-West's `tree-sitter-aoe2-rms` at commit
`dae495c167d2ca63ebea0e5f1cc7583cbcf3acfb` parses the RMS successfully:

```text
Total parses: 1; successful parses: 1; failed parses: 0; success percentage: 100.00%
```

The grammar's external-scanner build warnings are in that grammar repository;
they are not diagnostics against Speicherstadt.

## Legacy rms-check

Siege Engineers' `rms-check` at commit
`ac99e9d62b98d509dbda3dd76857bf94871e759c` dates from February 2022 and is not
treated as a current DE pass/fail authority. Its tables predate valid commands
used by current tournament maps, including `behavior_version`,
`find_closest_to_map_center`, `find_closest_to_map_edge`, and
`ignore_terrain_restrictions`. It also predates `avoid_other_land_zones`, the
distance parameter on `set_avoid_player_start_areas`, and reports custom numeric
constants as the wrong argument type instead of resolving them.

A parse-only run was still completed after excluding its unrelated legacy
formatter from a temporary build. Its 57 diagnostics all correspond to those
known table gaps and their arguments; it found no brace, section, conditional,
or random-block nesting error.

## Runtime Status

Pending. Static tools cannot execute AoE2 DE's proprietary map generator,
verify object placement, test pathfinding, or prove runtime stability. The
required seed matrix and match checks are in `runtime-test-checklist.md`.
