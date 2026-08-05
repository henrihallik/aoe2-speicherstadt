# Static Validation Report

Candidate: Speicherstadt v0.2.0
Checked: 2026-08-05
RMS SHA-256: `baf4c096191534e5794dc079d9442c8ec2d6800fc16aaf7f6895eeba915f8a78`

## Map-Specific Validator

`node tools/validate-rms.mjs` passes. It checks the section and control
structure, exact transposed geometry, six crossing rectangles, non-overlapping
land-origin squares, `border_fuzziness 100` on every constrained land, flat
elevation, explicit 9-villager start, object/resource totals, actor-area
references, land confinement, neutral ownership, mandatory placement, and the
competition's prohibited mechanics.

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

Version 0.1.0 loaded and ran, but its first smoke test failed the intended
topology: `border_fuzziness 0` causes AoE2 land growth to ignore borders, so
shallow crossing terrain spread through the canals and disrupted resource
placement. Version 0.2.0 changes every constrained land to the fully respected
value of `100` and adds a static regression check. Its in-game retest, full
seed matrix, and match checks remain pending in `runtime-test-checklist.md`.
