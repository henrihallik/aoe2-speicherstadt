# Static Validation Report

Candidate: Speicherstadt v0.6.0
Checked: 2026-08-11
RMS SHA-256: `590df5bd421d3bd1d98905abbebf32605fcc676b09d24371d86443b62590b213`

## Map-Specific Validator

`node tools/validate-rms.mjs` passes. It checks the section and control
structure, exact transposed geometry, six crossing rectangles, non-overlapping
land-origin squares, `border_fuzziness 100` on every constrained land, flat
elevation, four mirrored 90-tile corner forests, the 16-clump distributed
forest pass, twelve dedicated zone-to-zone seam connections, standard dockable
water terrain ID 1, ten non-overlapping mirrored fish parcels, explicit
9-villager start, three equal 58-tree home woodlines, mandatory five-relic
placement, six fixed central mine courtyards, object/resource totals,
actor-area references, land confinement, neutral ownership, and the
competition's prohibited mechanics. The fixed fish contract requires eight
shore fish and twelve deep fish on each side. The mine contract requires four
3-tile golds and two 4-tile stones in the center, for full-map 1v1 totals of 42
gold tiles and 26 stone tiles.

## Competitive Resource Benchmark

Tournament scripts archived in `AntoineRoll/python-aoe2rms` at commit
`20fc677c5d884d1c1a61d8a8aede5f8973516927` were compared directly. NAC5
Arabia and NAC5 Arena both allocate 7+4+4 gold and 5+4 stone per player, exactly
matching Speicherstadt's 15 home gold and 9 home stone. NAC5 Arena additionally
places 6 neutral gold and 4 neutral stone, for two-player totals of 36 and 22.
Speicherstadt already targets 42 gold and 26 stone after its 12 central gold
and 8 central stone are included. The defect was therefore unreliable central
placement, not an undersized allocation; v0.6.0 fixes those quantities to six
mandatory mirrored plots without increasing them.

The Garrison Golden Lakes, Hidden Cup 5 Cross, and Warlords 2 Four Lakes use
multiple fixed deep-fish groups plus broader shore fish. Speicherstadt v0.6.0
now supplies 40 fish across ten separated canal parcels rather than 20, while
retaining exact equality between the two sides.

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
dock/fish retest confirmed that the canals accept docks and the fixed fish
appear. Version 0.6.0 doubles each fish parcel, and replaces the central
multi-group search that could leave only relics with six compact fixed mine
plots. Its central-mine count, expanded-fish count, full seed matrix, and match
checks remain pending.
