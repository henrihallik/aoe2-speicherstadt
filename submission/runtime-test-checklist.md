# Runtime Test Checklist

Static parsers cannot prove that AoE2 DE will generate, place, and path every
object correctly. Complete this checklist in the same current game build that
will be used for the submission.

Test v0.5.0 or newer. Version 0.1.0 failed its large-scale topology. Version
0.2.0 restored the intended layout, but screenshot testing found water seams at
the crossing banks, insufficient home wood, and only four of five relics.
Version 0.3.0 repaired the joins and relic placement constraints, but still
left the outer mainland and all four map corners almost completely empty.

## Required Lobby

- Game mode: Random Map
- Map style: Custom
- Location: Speicherstadt
- Players: 2
- Map size: Tiny
- Resources: Standard
- Reveal map: start with All Visible for diagnostics
- Civilization: use Byzantines for both players during count checks
- Opponent: AI present

## Generation Matrix

Generate at least 12 fresh maps. Record each result in the table below. The set
must include both vertical-canal and horizontal-canal layouts and both player
color assignments.

| Seed | Orientation | P1 side | Generated | Counts pass | Routes pass | 5-minute pass |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |
| 9 | | | | | | |
| 10 | | | | | | |
| 11 | | | | | | |
| 12 | | | | | | |

## Per-Seed Checks

- Both players have a Town Center, 9 generic villagers, 2 houses, and 1 scout.
- Both players have 8 sheep, 2 boar, 4 deer, 6 berries, 15 home gold, and 9
  home stone.
- Each player has three 58-tree home woodlines and six TC stragglers, for 180
  home trees total.
- Each player side has two fixed corner forests, and additional forest clumps
  are distributed through the outer mainland. No map corner is barren.
- Each player side has exactly 4 shore fish and 6 deep fish, spread across five
  distinct reserved canal parcels rather than clustered in one location.
- The island has 12 gold, 8 stone, exactly 5 visible relics, four wood clusters,
  and two church ruins.
- No resource is trapped in water, inside a building, or beyond the map edge.
- The minimap matches the two-mainland, two-canal, central-island layout.
- Land units cannot enter canal water except at the six shallow crossings.
- All six shallow crossings connect cleanly to both banks, with no intervening
  deep-water tile at any of the twelve joins.
- A land unit can cross through all three complete lanes.
- A ship can traverse both canals and rotate around both ends of the island.
- Docks can be built on both mainland canal shores; canal water uses standard
  dockable terrain ID 1 everywhere outside the shallow crossings.
- No water or fish appears in a thin strip behind either player's mainland.
- There are no accidental land connections around the island ends.
- The game remains stable for five minutes while moving units, docking,
  building houses, scrolling the full revealed map, and letting the AI act.

## Final Match Checks

After the All Visible matrix passes, play at least two normal Fog of War games
for 20 in-game minutes: one of each orientation. Confirm that scouting,
resource readability, dock access, AI behavior, and bridge pathfinding remain
normal.
