# Static Validation Report

Candidate: Speicherstadt v0.5.0
Checked: 2026-08-11
RMS SHA-256: `75a7548c967f4bd94bae79f225fe728a067c3c7150fdfe6ec20c548aec8617c4`

## Map-Specific Validator

`node tools/validate-rms.mjs` passes. It checks the section and control
structure, exact transposed geometry, six crossing rectangles, non-overlapping
land-origin squares, `border_fuzziness 100` on every constrained land, flat
elevation, four mirrored 90-tile corner forests, the 16-clump distributed
forest pass, twelve dedicated zone-to-zone seam connections, standard dockable
water terrain ID 1, ten non-overlapping mirrored fish parcels, explicit
9-villager start, three equal 58-tree home woodlines, mandatory five-relic
placement, object/resource totals, actor-area references, land confinement,
neutral ownership, and the competition's prohibited mechanics. The fixed fish
contract requires four shore fish and six deep fish on each side.

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

A parse-only comparison was completed during development after excluding its
unrelated legacy formatter from a temporary build. Its diagnostics corresponded
to those known table gaps and their arguments; it found no brace, section,
conditional, or random-block nesting error.

## Runtime Status

Version 0.1.0 loaded but failed the intended topology because
`border_fuzziness 0` made constrained lands ignore their borders. Version 0.2.0
restored the recognizable two-canal layout, but screenshots exposed water seams
between crossings and banks, only 90 home trees, and four placed relics instead
of five. Version 0.3.0 removes detached decorative road lands, gives every
crossing a dedicated zone and four explicit seam connections, raises home wood
to 180 trees, and makes five relics mandatory with reduced spacing. Version
0.4.0 additionally reserves a 90-tile forest in every geometric corner and
generates 7% more player-ground forest in 16 clumps. Version 0.5.0 replaces the
non-dockable visual water aliases with standard water terrain ID 1 and replaces
player-relative fish searches with five fixed shoals per side. Its targeted
dock/fish retest, full seed matrix, and match checks remain pending.
