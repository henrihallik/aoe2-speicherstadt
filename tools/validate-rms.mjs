#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const rmsPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(here, "../Speicherstadt.rms");
const source = readFileSync(rmsPath, "utf8");

function stripComments(input) {
  let depth = 0;
  let output = "";

  for (let index = 0; index < input.length; index += 1) {
    const pair = input.slice(index, index + 2);
    if (pair === "/*") {
      depth += 1;
      output += "  ";
      index += 1;
    } else if (pair === "*/") {
      assert.ok(depth > 0, `stray comment terminator at offset ${index}`);
      depth -= 1;
      output += "  ";
      index += 1;
    } else {
      output += depth === 0 ? input[index] : input[index] === "\n" ? "\n" : " ";
    }
  }

  assert.equal(depth, 0, "unclosed block comment");
  return output;
}

function blocksFor(command, text, hasName = true) {
  const blocks = [];
  const pattern = hasName
    ? new RegExp(`\\b${command}\\s+([^\\s{}]+)\\s*\\{`, "g")
    : new RegExp(`\\b${command}\\s*\\{`, "g");
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const open = text.indexOf("{", match.index);
    let depth = 1;
    let cursor = open + 1;

    while (cursor < text.length && depth > 0) {
      if (text[cursor] === "{") depth += 1;
      if (text[cursor] === "}") depth -= 1;
      cursor += 1;
    }

    assert.equal(depth, 0, `unclosed ${command} ${match[1] ?? ""} block`);
    blocks.push({
      name: hasName ? match[1] : command,
      body: text.slice(open + 1, cursor - 1),
    });
    pattern.lastIndex = cursor;
  }

  return blocks;
}

function zoneConnectionBlocks(text) {
  const blocks = [];
  const pattern = /\bcreate_connect_land_zones\s+([^\s{}]+)\s+([^\s{}]+)\s*\{/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const open = text.indexOf("{", match.index);
    let depth = 1;
    let cursor = open + 1;

    while (cursor < text.length && depth > 0) {
      if (text[cursor] === "{") depth += 1;
      if (text[cursor] === "}") depth -= 1;
      cursor += 1;
    }

    assert.equal(depth, 0, `unclosed zone connection ${match[1]} ${match[2]}`);
    blocks.push({
      from: match[1],
      to: match[2],
      body: text.slice(open + 1, cursor - 1),
    });
    pattern.lastIndex = cursor;
  }

  return blocks;
}

function valuesFor(attribute, text) {
  return [
    ...text.matchAll(new RegExp(`\\b${attribute}\\s+([^\\s{}]+)`, "g")),
  ].map((match) => match[1]);
}

function valueFor(attribute, text) {
  return valuesFor(attribute, text)[0];
}

function pairFor(attribute, text) {
  const match = text.match(new RegExp(`\\b${attribute}\\s+(-?\\d+)\\s+(-?\\d+)`));
  return match ? [Number(match[1]), Number(match[2])] : undefined;
}

function objectQuantity(block) {
  const objects = Number(valueFor("number_of_objects", block.body) ?? 1);
  const groups = Number(valueFor("number_of_groups", block.body) ?? 1);
  return objects * groups;
}

function totalFor(name, blocks) {
  return blocks
    .filter((block) => block.name === name)
    .reduce((total, block) => total + objectQuantity(block), 0);
}

const code = stripComments(source);

assert.ok(!code.includes("//"), "RMS does not support // comments");
assert.ok(!code.includes("#include"), "custom includes do not transfer in lobbies");
assert.ok(!code.includes("<PLAYER_SETUP>\r"), "use LF-normalized source");

const braces = [...code].reduce((depth, character) => {
  const next = depth + (character === "{" ? 1 : character === "}" ? -1 : 0);
  assert.ok(next >= 0, "closing brace appears before an opening brace");
  return next;
}, 0);
assert.equal(braces, 0, "unbalanced braces");

const controlStack = [];
for (const match of code.matchAll(/\b(start_random|end_random|if|elseif|else|endif)\b/g)) {
  const token = match[1];
  if (token === "start_random" || token === "if") {
    controlStack.push(token);
  } else if (token === "end_random") {
    assert.equal(
      controlStack.pop(),
      "start_random",
      "end_random closes the wrong construct",
    );
  } else if (token === "endif") {
    assert.equal(controlStack.pop(), "if", "endif closes the wrong construct");
  } else {
    assert.equal(controlStack.at(-1), "if", `${token} appears outside an if block`);
  }
}
assert.deepEqual(controlStack, [], "unclosed conditional or random block");

const expectedSections = [
  "PLAYER_SETUP",
  "LAND_GENERATION",
  "ELEVATION_GENERATION",
  "TERRAIN_GENERATION",
  "CONNECTION_GENERATION",
  "OBJECTS_GENERATION",
];
const actualSections = [...code.matchAll(/<([A-Z_]+)>/g)].map((match) => match[1]);
assert.deepEqual(actualSections, expectedSections, "sections are missing or out of order");

assert.match(code, /\bdirect_placement\b/, "1v1 geometry requires direct placement");
assert.match(code, /\bbehavior_version\s+2\b/, "behavior_version 2 is required");
assert.match(code, /\bbase_terrain\s+HARBOR_WATER\b/, "harbor water must be the base");
assert.match(code, /\benable_waves\s+0\b/, "waves must be disabled for bridge clarity");
assert.ok(!/\bbase_elevation\b/.test(code), "the flat map must not set base_elevation");
assert.ok(!/\bcreate_elevation\b/.test(code), "the six crossings must remain level");

const constants = new Map();
for (const match of code.matchAll(/#const\s+([A-Z0-9_]+)\s+(-?\d+)/g)) {
  assert.ok(!constants.has(match[1]), `duplicate custom constant ${match[1]}`);
  constants.set(match[1], Number(match[2]));
}

for (const [name, value] of [
  ["PLAYER_GROUND", 12],
  ["CENTRAL_GROUND", 11],
  ["HARBOR_WATER", 1],
  ["BRIDGE_GROUND", 4],
  ["OAK_FOREST", 10],
  ["NEAR_MAINLAND_ZONE", 11],
  ["FAR_MAINLAND_ZONE", 12],
  ["CENTRAL_ISLAND_ZONE", 20],
  ["NEAR_UPPER_BRIDGE_ZONE", 31],
  ["NEAR_MIDDLE_BRIDGE_ZONE", 32],
  ["NEAR_LOWER_BRIDGE_ZONE", 33],
  ["FAR_UPPER_BRIDGE_ZONE", 34],
  ["FAR_MIDDLE_BRIDGE_ZONE", 35],
  ["FAR_LOWER_BRIDGE_ZONE", 36],
  ["CORNER_FOREST_ZONE", 40],
  ["WATER_RESOURCE_ZONE", 50],
  ["CENTRAL_RESOURCE_ZONE", 60],
  ["NEAR_SHORE_A_ID", 401],
  ["NEAR_SHORE_B_ID", 402],
  ["FAR_SHORE_A_ID", 403],
  ["FAR_SHORE_B_ID", 404],
  ["NEAR_DEEP_A_ID", 411],
  ["NEAR_DEEP_B_ID", 412],
  ["NEAR_DEEP_C_ID", 413],
  ["FAR_DEEP_A_ID", 414],
  ["FAR_DEEP_B_ID", 415],
  ["FAR_DEEP_C_ID", 416],
  ["CENTRAL_GOLD_A_ID", 501],
  ["CENTRAL_GOLD_B_ID", 502],
  ["CENTRAL_GOLD_C_ID", 503],
  ["CENTRAL_GOLD_D_ID", 504],
  ["CENTRAL_STONE_A_ID", 511],
  ["CENTRAL_STONE_B_ID", 512],
  ["START_HERDABLE", 594],
  ["START_LUREABLE", 48],
  ["START_HUNTABLE", 65],
  ["START_TREE", 349],
  ["HARBOR_FISH", 457],
  ["CHURCH_RUIN", 1517],
]) {
  assert.equal(constants.get(name), value, `${name} must keep object/terrain ID ${value}`);
}

/* The contest prohibits mechanics that redefine normal units or buildings. */
for (const forbidden of [
  "effect_percent",
  "SET_ATTRIBUTE",
  "ADD_ATTRIBUTE",
  "GAIA_SET_ATTRIBUTE",
  "GAIA_ADD_ATTRIBUTE",
  "guard_state",
  "resource_delta",
  "set_building_capturable",
  "make_indestructible",
  "set_gaia_unconvertible",
  "create_trigger",
  "xsScriptCall",
]) {
  assert.ok(!new RegExp(`\\b${forbidden}\\b`).test(code), `forbidden mechanic ${forbidden}`);
}

const effects = [...code.matchAll(/\beffect_amount\s+([^\n]+)/g)].map((match) =>
  match[1].trim(),
);
assert.deepEqual(
  effects.sort(),
  [
    "MOD_RESOURCE AMOUNT_STARTING_FOOD ATTR_ADD -100",
    "MOD_RESOURCE AMOUNT_STARTING_WOOD ATTR_ADD -30",
  ].sort(),
  "only the standard quick-start resource adjustments are allowed",
);

const landBlocks = blocksFor("create_land", code, false);
const landsByTerrain = (terrain) =>
  landBlocks.filter((block) => valueFor("terrain_type", block.body) === terrain);

assert.equal(landsByTerrain("PLAYER_GROUND").length, 4, "two rotated pairs of mainlands required");
assert.equal(landsByTerrain("CENTRAL_GROUND").length, 2, "one island per rotation required");
assert.equal(
  landsByTerrain("CENTRAL_DETAIL").length,
  12,
  "six fixed central mine plots are required in both rotations",
);
assert.equal(landsByTerrain("BRIDGE_GROUND").length, 12, "six bridges per rotation required");
assert.equal(landsByTerrain("OAK_FOREST").length, 4, "all four map corners need fixed forests");
assert.equal(
  landsByTerrain("HARBOR_WATER").length,
  20,
  "five fixed fish parcels per canal are required in both rotations",
);
assert.ok(!/\bHARBOR_DEEP\b/.test(code), "all harbor water must use dockable terrain ID 1");
assert.ok(!/\bROAD_GROUND\b/.test(code), "detached decorative road lands must not return");

for (const block of landsByTerrain("PLAYER_GROUND")) {
  assert.match(block.body, /\bassign_to_player\s+1\b/, "mainland must support player 1");
  assert.match(block.body, /\bassign_to_player\s+2\b/, "mainland must support player 2");
}

for (const block of landBlocks) {
  const landId = valueFor("land_id", block.body);
  const terrain = valueFor("terrain_type", block.body);
  const position = pairFor("land_position", block.body)?.join(",") ?? "unknown";
  const label = landId ?? `${terrain}@${position}`;
  assert.equal(
    valueFor("border_fuzziness", block.body),
    "100",
    `${label} must fully respect its borders (AoE2 treats 0 as ignoring them)`,
  );
  assert.equal(
    valueFor("clumping_factor", block.body),
    terrain === "OAK_FOREST" ? "15" : "100",
    `${label} has the wrong clumping factor`,
  );
  assert.equal(
    valueFor("other_zone_avoidance_distance", block.body),
    "0",
    `${label} must meet adjacent lands without avoidance gaps`,
  );
}

const positions = landBlocks.map((block) => pairFor("land_position", block.body));
for (const expected of [
  [18, 50],
  [82, 50],
  [50, 18],
  [50, 82],
]) {
  assert.ok(
    positions.some((position) => position?.[0] === expected[0] && position[1] === expected[1]),
    `missing mirrored player land at ${expected.join(",")}`,
  );
}

const centralBorders = landsByTerrain("CENTRAL_GROUND").map((block) => [
  Number(valueFor("left_border", block.body)),
  Number(valueFor("right_border", block.body)),
  Number(valueFor("top_border", block.body)),
  Number(valueFor("bottom_border", block.body)),
]);
assert.deepEqual(
  centralBorders.sort(),
  [
    [8, 8, 43, 43],
    [43, 43, 8, 8],
  ].sort(),
  "the island must rotate exactly and leave connected harbor water at both ends",
);

const mainlandGeometry = landsByTerrain("PLAYER_GROUND")
  .map((block) => {
    const [x, y] = pairFor("land_position", block.body);
    const borders = ["left_border", "right_border", "top_border", "bottom_border"]
      .map((attribute) => valueFor(attribute, block.body))
      .join(",");
    return `${x},${y}:${borders}`;
  })
  .sort();
assert.deepEqual(
  mainlandGeometry,
  [
    "18,50:0,65,0,0",
    "82,50:65,0,0,0",
    "50,18:0,0,0,65",
    "50,82:0,0,65,0",
  ].sort(),
  "player mainlands must reach the outer edge without creating a back-water strip",
);

const cornerForests = landsByTerrain("OAK_FOREST");
const cornerForestGeometry = cornerForests
  .map((block) => {
    const [x, y] = pairFor("land_position", block.body);
    const borders = ["left_border", "right_border", "top_border", "bottom_border"]
      .map((attribute) => valueFor(attribute, block.body))
      .join(",");
    return `${x},${y}:${borders}`;
  })
  .sort();
assert.deepEqual(
  cornerForestGeometry,
  [
    "8,8:2,70,2,70",
    "92,8:70,2,2,70",
    "8,92:2,70,70,2",
    "92,92:70,2,70,2",
  ].sort(),
  "the four fixed forests must occupy mirrored corner boxes",
);
for (const forest of cornerForests) {
  assert.equal(valueFor("number_of_tiles", forest.body), "90");
  assert.equal(valueFor("base_size", forest.body), "2");
  assert.equal(valueFor("zone", forest.body), "CORNER_FOREST_ZONE");
  assert.equal(
    valueFor("land_id", forest.body),
    undefined,
    "corner forests need no object land ID",
  );
}

const landIdCounts = new Map();
for (const landId of valuesFor("land_id", code)) {
  landIdCounts.set(landId, (landIdCounts.get(landId) ?? 0) + 1);
}
const fixedLandIds = [
  "NEAR_MAINLAND_ID",
  "FAR_MAINLAND_ID",
  "CENTRAL_ISLAND_ID",
  "NEAR_UPPER_BRIDGE_ID",
  "NEAR_MIDDLE_BRIDGE_ID",
  "NEAR_LOWER_BRIDGE_ID",
  "FAR_UPPER_BRIDGE_ID",
  "FAR_MIDDLE_BRIDGE_ID",
  "FAR_LOWER_BRIDGE_ID",
  "NEAR_SHORE_A_ID",
  "NEAR_SHORE_B_ID",
  "FAR_SHORE_A_ID",
  "FAR_SHORE_B_ID",
  "NEAR_DEEP_A_ID",
  "NEAR_DEEP_B_ID",
  "NEAR_DEEP_C_ID",
  "FAR_DEEP_A_ID",
  "FAR_DEEP_B_ID",
  "FAR_DEEP_C_ID",
  "CENTRAL_GOLD_A_ID",
  "CENTRAL_GOLD_B_ID",
  "CENTRAL_GOLD_C_ID",
  "CENTRAL_GOLD_D_ID",
  "CENTRAL_STONE_A_ID",
  "CENTRAL_STONE_B_ID",
];

const expectedZoneByLandId = new Map([
  ["NEAR_MAINLAND_ID", "NEAR_MAINLAND_ZONE"],
  ["FAR_MAINLAND_ID", "FAR_MAINLAND_ZONE"],
  ["CENTRAL_ISLAND_ID", "CENTRAL_ISLAND_ZONE"],
  ["NEAR_UPPER_BRIDGE_ID", "NEAR_UPPER_BRIDGE_ZONE"],
  ["NEAR_MIDDLE_BRIDGE_ID", "NEAR_MIDDLE_BRIDGE_ZONE"],
  ["NEAR_LOWER_BRIDGE_ID", "NEAR_LOWER_BRIDGE_ZONE"],
  ["FAR_UPPER_BRIDGE_ID", "FAR_UPPER_BRIDGE_ZONE"],
  ["FAR_MIDDLE_BRIDGE_ID", "FAR_MIDDLE_BRIDGE_ZONE"],
  ["FAR_LOWER_BRIDGE_ID", "FAR_LOWER_BRIDGE_ZONE"],
  ["NEAR_SHORE_A_ID", "WATER_RESOURCE_ZONE"],
  ["NEAR_SHORE_B_ID", "WATER_RESOURCE_ZONE"],
  ["FAR_SHORE_A_ID", "WATER_RESOURCE_ZONE"],
  ["FAR_SHORE_B_ID", "WATER_RESOURCE_ZONE"],
  ["NEAR_DEEP_A_ID", "WATER_RESOURCE_ZONE"],
  ["NEAR_DEEP_B_ID", "WATER_RESOURCE_ZONE"],
  ["NEAR_DEEP_C_ID", "WATER_RESOURCE_ZONE"],
  ["FAR_DEEP_A_ID", "WATER_RESOURCE_ZONE"],
  ["FAR_DEEP_B_ID", "WATER_RESOURCE_ZONE"],
  ["FAR_DEEP_C_ID", "WATER_RESOURCE_ZONE"],
  ["CENTRAL_GOLD_A_ID", "CENTRAL_RESOURCE_ZONE"],
  ["CENTRAL_GOLD_B_ID", "CENTRAL_RESOURCE_ZONE"],
  ["CENTRAL_GOLD_C_ID", "CENTRAL_RESOURCE_ZONE"],
  ["CENTRAL_GOLD_D_ID", "CENTRAL_RESOURCE_ZONE"],
  ["CENTRAL_STONE_A_ID", "CENTRAL_RESOURCE_ZONE"],
  ["CENTRAL_STONE_B_ID", "CENTRAL_RESOURCE_ZONE"],
]);

function landGeometry(block) {
  return {
    position: pairFor("land_position", block.body),
    borders: ["left_border", "right_border", "top_border", "bottom_border"].map(
      (attribute) => Number(valueFor(attribute, block.body)),
    ),
  };
}

function transposeGeometry({ position, borders: [left, right, top, bottom] }) {
  return {
    position: [position[1], position[0]],
    borders: [top, bottom, left, right],
  };
}

for (const landId of fixedLandIds) {
  assert.equal(landIdCounts.get(landId), 2, `${landId} needs one declaration per rotation`);

  const rotatedPair = landBlocks.filter(
    (block) => valueFor("land_id", block.body) === landId,
  );
  assert.deepEqual(
    landGeometry(rotatedPair[1]),
    transposeGeometry(landGeometry(rotatedPair[0])),
    `${landId} must use the exact transposed geometry in the rotated layout`,
  );

  for (const block of rotatedPair) {
    assert.equal(
      valueFor("zone", block.body),
      expectedZoneByLandId.get(landId),
      `${landId} must use its dedicated connection zone`,
    );
    if (expectedZoneByLandId.get(landId) === "CENTRAL_RESOURCE_ZONE") {
      assert.equal(valueFor("land_percent", block.body), undefined);
    } else {
      assert.equal(
        valueFor("land_percent", block.body),
        "100",
        `${landId} must fully fill its constrained rectangle`,
      );
    }
  }
}

const centralMineLandIds = new Set([
  "CENTRAL_GOLD_A_ID",
  "CENTRAL_GOLD_B_ID",
  "CENTRAL_GOLD_C_ID",
  "CENTRAL_GOLD_D_ID",
  "CENTRAL_STONE_A_ID",
  "CENTRAL_STONE_B_ID",
]);
for (const block of landBlocks.filter((candidate) =>
  centralMineLandIds.has(valueFor("land_id", candidate.body)),
)) {
  assert.equal(valueFor("terrain_type", block.body), "CENTRAL_DETAIL");
  assert.equal(valueFor("number_of_tiles", block.body), "25");
  assert.equal(valueFor("base_size", block.body), "2");
  assert.equal(
    valueFor("land_percent", block.body),
    undefined,
    "central mine plots must stay compact rather than fill their whole bounds",
  );
}

/* AoE2 places every square land origin before any land starts growing. */
const tinyMapTiles = 120;
function landOriginSquare(block) {
  const [xPercent, yPercent] = pairFor("land_position", block.body);
  const baseSize = Number(valueFor("base_size", block.body));
  const [left, right, top, bottom] = [
    "left_border",
    "right_border",
    "top_border",
    "bottom_border",
  ].map((attribute) => Number(valueFor(attribute, block.body)));
  const toTiles = (percent) => (percent * tinyMapTiles) / 100;

  return {
    id:
      valueFor("land_id", block.body) ??
      `${valueFor("terrain_type", block.body)}@${xPercent},${yPercent}`,
    minX: toTiles(xPercent) - baseSize,
    maxX: toTiles(xPercent) + baseSize,
    minY: toTiles(yPercent) - baseSize,
    maxY: toTiles(yPercent) + baseSize,
    allowedMinX: toTiles(left),
    allowedMaxX: toTiles(100 - right),
    allowedMinY: toTiles(top),
    allowedMaxY: toTiles(100 - bottom),
  };
}

function squaresOverlap(first, second) {
  return (
    first.minX <= second.maxX &&
    second.minX <= first.maxX &&
    first.minY <= second.maxY &&
    second.minY <= first.maxY
  );
}

for (const orientationIndex of [0, 1]) {
  const origins = fixedLandIds
    .map((landId) => {
      const pair = landBlocks.filter(
        (block) => valueFor("land_id", block.body) === landId,
      );
      return landOriginSquare(pair[orientationIndex]);
    })
    .concat(cornerForests.map(landOriginSquare));

  for (const origin of origins) {
    assert.ok(
      origin.minX >= origin.allowedMinX &&
        origin.maxX <= origin.allowedMaxX &&
        origin.minY >= origin.allowedMinY &&
        origin.maxY <= origin.allowedMaxY,
      `${origin.id} has a base square outside its constrained rectangle`,
    );
  }

  for (let firstIndex = 0; firstIndex < origins.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < origins.length; secondIndex += 1) {
      const first = origins[firstIndex];
      const second = origins[secondIndex];
      assert.ok(
        !squaresOverlap(first, second),
        `${first.id} and ${second.id} have overlapping land-origin squares`,
      );
    }
  }
}

const terrainBlocks = blocksFor("create_terrain", code);
assert.deepEqual(
  terrainBlocks.map((block) => block.name),
  ["OAK_FOREST", "PLAYER_DETAIL", "CENTRAL_DETAIL"],
  "forest generation must precede the visual player-ground pass",
);

const distributedForest = terrainBlocks.find((block) => block.name === "OAK_FOREST");
assert.equal(valueFor("base_terrain", distributedForest.body), "PLAYER_GROUND");
assert.equal(valueFor("land_percent", distributedForest.body), "7");
assert.equal(valueFor("number_of_clumps", distributedForest.body), "16");
assert.equal(valueFor("clumping_factor", distributedForest.body), "15");
assert.equal(valueFor("spacing_to_other_terrain_types", distributedForest.body), "3");
assert.equal(valueFor("set_avoid_player_start_areas", distributedForest.body), "14");

const connections = zoneConnectionBlocks(code);
assert.ok(
  !/\baccumulate_connections\b/.test(code),
  "seam paths must be calculated independently from the original terrain",
);
const expectedConnectionPairs = [
  ["NEAR_MAINLAND_ZONE", "NEAR_UPPER_BRIDGE_ZONE"],
  ["NEAR_UPPER_BRIDGE_ZONE", "CENTRAL_ISLAND_ZONE"],
  ["CENTRAL_ISLAND_ZONE", "FAR_UPPER_BRIDGE_ZONE"],
  ["FAR_UPPER_BRIDGE_ZONE", "FAR_MAINLAND_ZONE"],
  ["NEAR_MAINLAND_ZONE", "NEAR_MIDDLE_BRIDGE_ZONE"],
  ["NEAR_MIDDLE_BRIDGE_ZONE", "CENTRAL_ISLAND_ZONE"],
  ["CENTRAL_ISLAND_ZONE", "FAR_MIDDLE_BRIDGE_ZONE"],
  ["FAR_MIDDLE_BRIDGE_ZONE", "FAR_MAINLAND_ZONE"],
  ["NEAR_MAINLAND_ZONE", "NEAR_LOWER_BRIDGE_ZONE"],
  ["NEAR_LOWER_BRIDGE_ZONE", "CENTRAL_ISLAND_ZONE"],
  ["CENTRAL_ISLAND_ZONE", "FAR_LOWER_BRIDGE_ZONE"],
  ["FAR_LOWER_BRIDGE_ZONE", "FAR_MAINLAND_ZONE"],
].map(([from, to]) => `${from}->${to}`);
assert.deepEqual(
  connections.map(({ from, to }) => `${from}->${to}`),
  expectedConnectionPairs,
  "each of the three lanes needs four explicit seam connections",
);

for (const connection of connections) {
  const label = `${connection.from}->${connection.to}`;
  assert.match(
    connection.body,
    /\breplace_terrain\s+HARBOR_WATER\s+BRIDGE_GROUND\b/,
    `${label} must fill normal harbor water with shallows`,
  );
  assert.match(
    connection.body,
    /\bterrain_cost\s+HARBOR_WATER\s+12\b/,
    `${label} must prefer the existing bridge and banks over open water`,
  );
  assert.match(connection.body, /\bterrain_size\s+HARBOR_WATER\s+2\s+0\b/);
  assert.ok(
    !/\bdefault_terrain_replacement\b/.test(connection.body),
    `${label} must not repaint mainland or island terrain`,
  );
}

const objectBlocks = blocksFor("create_object", code);
const playerObjects = objectBlocks.filter((block) =>
  /\bset_place_for_every_player\b/.test(block.body),
);
const centralObjects = objectBlocks.filter((block) =>
  /\bplace_on_specific_land_id\s+CENTRAL_ISLAND_ID\b/.test(block.body),
);
const centralMineObjects = objectBlocks.filter((block) =>
  centralMineLandIds.has(valueFor("place_on_specific_land_id", block.body)),
);
const mainlandObjects = playerObjects.filter((block) =>
  /\bterrain_to_place_on\s+PLAYER_GROUND\b/.test(block.body),
);

assert.equal(mainlandObjects.length, 18, "all player-ground declarations must be accounted for");
for (const block of mainlandObjects) {
  assert.match(
    block.body,
    /\bavoid_other_land_zones\s+2\b/,
    `${block.name} must remain on its assigned mainland`,
  );
}

for (const block of centralObjects) {
  assert.match(
    block.body,
    /\bavoid_other_land_zones\s+2\b/,
    `${block.name} must remain on the central island`,
  );
}

for (const required of ["TOWN_CENTER", "VILLAGER", "HOUSE", "SCOUT"]) {
  assert.equal(
    playerObjects.filter((block) => block.name === required).length,
    1,
    `exactly one player-scoped ${required} declaration is required`,
  );
}

const villager = playerObjects.find((block) => block.name === "VILLAGER");
assert.equal(
  valueFor("number_of_objects", villager.body),
  "9",
  "quick start must explicitly place 9 villagers",
);
assert.match(
  villager.body,
  /\bactor_area_to_place_in\s+VILLAGER_ANCHOR_AREA\b/,
  "villagers must use their reliable anchor",
);

const houses = playerObjects.find((block) => block.name === "HOUSE");
assert.equal(valueFor("number_of_objects", houses.body), "2", "quick start needs two houses");

assert.equal(totalFor("START_HERDABLE", playerObjects), 8, "each player needs 8 herdables");
assert.equal(totalFor("START_LUREABLE", playerObjects), 2, "each player needs 2 lureables");
assert.equal(totalFor("START_HUNTABLE", playerObjects), 4, "each player needs 4 deer");
assert.equal(totalFor("FORAGE", playerObjects), 6, "each player needs 6 forage bushes");
assert.equal(totalFor("GOLD", playerObjects), 15, "each player needs 7+4+4 home gold");
assert.equal(totalFor("STONE", playerObjects), 9, "each player needs 5+4 home stone");
assert.equal(totalFor("START_TREE", playerObjects), 180, "each player needs 180 guaranteed trees");
assert.equal(totalFor("SHORE_FISH", playerObjects), 0, "fish must use fixed neutral parcels");
assert.equal(totalFor("HARBOR_FISH", playerObjects), 0, "fish must use fixed neutral parcels");

const fixedFishExpectations = new Map([
  ["NEAR_SHORE_A_ID", "SHORE_FISH"],
  ["NEAR_SHORE_B_ID", "SHORE_FISH"],
  ["FAR_SHORE_A_ID", "SHORE_FISH"],
  ["FAR_SHORE_B_ID", "SHORE_FISH"],
  ["NEAR_DEEP_A_ID", "HARBOR_FISH"],
  ["NEAR_DEEP_B_ID", "HARBOR_FISH"],
  ["NEAR_DEEP_C_ID", "HARBOR_FISH"],
  ["FAR_DEEP_A_ID", "HARBOR_FISH"],
  ["FAR_DEEP_B_ID", "HARBOR_FISH"],
  ["FAR_DEEP_C_ID", "HARBOR_FISH"],
]);
const allFish = objectBlocks.filter((block) =>
  ["SHORE_FISH", "HARBOR_FISH"].includes(block.name),
);
assert.equal(allFish.length, fixedFishExpectations.size, "every fish parcel needs one object block");
assert.equal(totalFor("SHORE_FISH", allFish), 16, "four shore parcels must hold four fish each");
assert.equal(totalFor("HARBOR_FISH", allFish), 24, "six deep parcels must hold four fish each");

for (const [landId, fishType] of fixedFishExpectations) {
  const matching = allFish.filter(
    (block) => valueFor("place_on_specific_land_id", block.body) === landId,
  );
  assert.equal(matching.length, 1, `${landId} needs exactly one fish declaration`);
  const fish = matching[0];
  assert.equal(fish.name, fishType, `${landId} has the wrong fish type`);
  assert.equal(objectQuantity(fish), 4, `${landId} must contain exactly four fish`);
  assert.equal(valueFor("number_of_objects", fish.body), "2");
  assert.equal(valueFor("number_of_groups", fish.body), "2");
  assert.equal(valueFor("group_placement_radius", fish.body), "1");
  assert.equal(valueFor("avoid_other_land_zones", fish.body), "0");
  assert.equal(valueFor("terrain_to_place_on", fish.body), "HARBOR_WATER");
  assert.equal(valueFor("temp_min_distance_group_placement", fish.body), "4");
  assert.match(fish.body, /\bset_gaia_object_only\b/);
  assert.match(fish.body, /\bfind_closest\b/);
  assert.match(fish.body, /\bforce_placement\b/);
  assert.ok(!/\bset_place_for_every_player\b/.test(fish.body));
}

const fixedCentralMineExpectations = new Map([
  ["CENTRAL_GOLD_A_ID", ["GOLD", 3]],
  ["CENTRAL_GOLD_B_ID", ["GOLD", 3]],
  ["CENTRAL_GOLD_C_ID", ["GOLD", 3]],
  ["CENTRAL_GOLD_D_ID", ["GOLD", 3]],
  ["CENTRAL_STONE_A_ID", ["STONE", 4]],
  ["CENTRAL_STONE_B_ID", ["STONE", 4]],
]);
assert.equal(
  centralMineObjects.length,
  fixedCentralMineExpectations.size,
  "every central mine plot needs one object block",
);
for (const [landId, [mineType, quantity]] of fixedCentralMineExpectations) {
  const matching = centralMineObjects.filter(
    (block) => valueFor("place_on_specific_land_id", block.body) === landId,
  );
  assert.equal(matching.length, 1, `${landId} needs exactly one mine declaration`);
  const mine = matching[0];
  assert.equal(mine.name, mineType, `${landId} has the wrong mine type`);
  assert.equal(objectQuantity(mine), quantity, `${landId} has the wrong tile count`);
  assert.equal(valueFor("number_of_groups", mine.body), "1");
  assert.equal(valueFor("group_placement_radius", mine.body), "2");
  assert.equal(valueFor("avoid_other_land_zones", mine.body), "0");
  assert.equal(valueFor("terrain_to_place_on", mine.body), "CENTRAL_DETAIL");
  assert.match(mine.body, /\bset_tight_grouping\b/);
  assert.match(mine.body, /\bset_gaia_object_only\b/);
  assert.match(mine.body, /\bfind_closest\b/);
  assert.match(mine.body, /\bforce_placement\b/);
  assert.ok(!/\bset_place_for_every_player\b/.test(mine.body));
}

assert.equal(totalFor("GOLD", centralMineObjects), 12, "the island needs four fixed 3-tile golds");
assert.equal(totalFor("STONE", centralMineObjects), 8, "the island needs two fixed 4-tile stones");
assert.equal(
  2 * totalFor("GOLD", playerObjects) + totalFor("GOLD", centralMineObjects),
  42,
  "a 1v1 generation needs 42 gold tiles in total",
);
assert.equal(
  2 * totalFor("STONE", playerObjects) + totalFor("STONE", centralMineObjects),
  26,
  "a 1v1 generation needs 26 stone tiles in total",
);

const homeWoodlines = playerObjects.filter(
  (block) => block.name === "START_TREE" && valueFor("number_of_groups", block.body) === "1",
);
assert.equal(homeWoodlines.length, 3, "each player needs exactly three grouped home woodlines");
for (const woodline of homeWoodlines) {
  assert.equal(valueFor("number_of_objects", woodline.body), "58", "woodlines must be equal");
  assert.equal(valueFor("group_placement_radius", woodline.body), "7");
  assert.match(woodline.body, /\bforce_placement\b/, "home woodlines must be mandatory");
}

assert.equal(totalFor("GOLD", centralObjects), 0, "central mines must use fixed courtyard plots");
assert.equal(totalFor("STONE", centralObjects), 0, "central mines must use fixed courtyard plots");
assert.equal(totalFor("RELIC", centralObjects), 5, "the island needs five relics");
assert.equal(totalFor("START_TREE", centralObjects), 48, "the island needs four wood clusters");
assert.equal(totalFor("CHURCH_RUIN", centralObjects), 2, "the island needs two church ruins");

const centralRelics = centralObjects.find((block) => block.name === "RELIC");
assert.match(centralRelics.body, /\bforce_placement\b/, "all five central relics must be mandatory");
assert.equal(
  valueFor("min_distance_group_placement", centralRelics.body),
  "8",
  "central relic spacing must fit reliably on the narrow island",
);

for (const block of playerObjects.filter((candidate) =>
  [
    "START_HERDABLE",
    "START_LUREABLE",
    "START_HUNTABLE",
    "FORAGE",
    "GOLD",
    "STONE",
    "START_TREE",
  ].includes(candidate.name),
)) {
  assert.match(block.body, /\bset_gaia_object_only\b/, `${block.name} must start neutral`);
  assert.match(
    block.body,
    /\bmax_distance_to_other_zones\s+2\b/,
    `${block.name} must stay two tiles from restricted terrain`,
  );
}

for (const block of objectBlocks.filter((candidate) =>
  ["TOWN_CENTER", "VILLAGER", "HOUSE", "SCOUT"].includes(candidate.name),
)) {
  assert.match(block.body, /\bforce_placement\b/, `${block.name} must be mandatory`);
}

const actorProviders = new Set(valuesFor("actor_area", code));
for (const consumer of [
  ...valuesFor("actor_area_to_place_in", code),
  ...valuesFor("avoid_actor_area", code),
]) {
  assert.ok(actorProviders.has(consumer), `actor area ${consumer} has no provider`);
}

console.log(`PASS ${rmsPath}`);
console.log(`  ${source.split("\n").length} lines, ${source.length} bytes`);
console.log("  topology: 2 connected canals, 1 central island, 6 crossings");
console.log("  quick start: 9 generic villagers, 2 houses, standard resource adjustment");
console.log("  per player: 8 sheep, 2 boar, 4 deer, 15 gold, 9 stone, 180 home trees");
console.log("  mainland wood: 4 fixed 90-tile corner forests + 7% distributed forest terrain");
console.log("  dockable canals: terrain ID 1 throughout");
console.log("  fixed canal water: 8 shore fish and 12 deep fish per side across 5 slots");
console.log("  neutral island: 12 fixed gold, 8 fixed stone, 5 relics, 48 trees, 2 church ruins");
console.log("  integrity: no unit/building attribute changes or scripted income");
