const ARMOR_SLOTS = ["helmet", "chest", "legs", "boots", "gloves"];
const SET_NAMES = ["Knight", "Rogue", "Mage", "Guardian", "Berserker"];
const TIER_NAMES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

let equippedArmor = {};
let equippedWeapon = null;

// Weapon pool
const WEAPON_POOL = [
  {
    id: "soulblade",
    name: "Soulblade",
    evoReq: "berserker_core"
  },
  {
    id: "stormbow",
    name: "Stormbow",
    evoReq: "storm_core" // not used yet, but ready
  }
];

function createArmor(chestType) {
  const set = randomFrom(SET_NAMES);
  const slot = randomFrom(ARMOR_SLOTS);
  const tier = rollTier(chestType);
  return {
    kind: "armor",
    set,
    slot,
    tier,
    stats: generateArmorStats(set, tier)
  };
}

function createWeapon(chestType) {
  const tier = rollTier(chestType);
  const def = randomFrom(WEAPON_POOL);
  return {
    kind: "weapon",
    id: def.id,
    name: def.name,
    tier,
    evoReq: def.evoReq || null,
    evolved: false,
    stats: generateWeaponStats(tier)
  };
}

function rollTier(chestType) {
  const odds = {
    basic: [80, 15, 4, 1, 0],
    advanced: [60, 20, 10, 7, 3],
    elite: [20, 30, 25, 15, 10]
  };
  const table = odds[chestType];
  const roll = Math.random() * 100;
  let sum = 0;
  for (let i = 0; i < table.length; i++) {
    sum += table[i];
    if (roll < sum) return i;
  }
  return 0;
}

function generateArmorStats(set, tier) {
  return {
    health: 10 + tier * 8,
    armor: 2 + tier * 2,
    set
  };
}

function generateWeaponStats(tier) {
  return {
    damage: 14 + tier * 8,
    attackSpeed: 1 + tier * 0.12
  };
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function equipItem(item) {
  if (item.kind === "armor") {
    equippedArmor[item.slot] = item;
  } else {
    equippedWeapon = item;
  }
  updateGearUI();
  updateEquippedUI && updateEquippedUI();
  saveInventory && saveInventory();
}

function tryMerge(a, b) {
  const newTier = Math.min(a.tier + 1, 4);
  return {
    ...a,
    tier: newTier,
    stats: generateArmorStats(a.set, newTier)
  };
}

function tryMergeWeapon(a, b) {
  const newTier = Math.min(a.tier + 1, 4);
  return {
    ...a,
    tier: newTier,
    stats: generateWeaponStats(newTier)
  };
}

function getTotalArmor() {
  let total = 0;
  for (const slot of ARMOR_SLOTS) {
    const item = equippedArmor[slot];
    if (item) total += item.stats.armor;
  }
  return total;
}

function updateGearUI() {
  const el = document.getElementById("gear-info");
  if (!el) return;

  let text = "Armor: ";
  ARMOR_SLOTS.forEach(slot => {
    const item = equippedArmor[slot];
    text += item
      ? `[${slot}: ${item.set} ${TIER_NAMES[item.tier]}] `
      : `[${slot}: none] `;
  });

  text += " | Weapon: ";
  text += equippedWeapon
    ? `${equippedWeapon.name} ${TIER_NAMES[equippedWeapon.tier]}`
    : "none";

  el.textContent = text;
}

function describeItem(item) {
  if (item.kind === "armor") {
    return `${item.set} ${item.slot} (${TIER_NAMES[item.tier]})`;
  } else {
    return `${item.name} (${TIER_NAMES[item.tier]})`;
  }
}

function getSetCounts() {
  const counts = {};
  for (const slot of ARMOR_SLOTS) {
    const item = equippedArmor[slot];
    if (!item) continue;
    counts[item.set] = (counts[item.set] || 0) + 1;
  }
  return counts;
}

function getLegendarySets() {
  const legendaries = {};
  for (const slot of ARMOR_SLOTS) {
    const item = equippedArmor[slot];
    if (!item) continue;
    if (item.tier === 4) {
      legendaries[item.set] = true;
    }
  }
  return legendaries;
}
