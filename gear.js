// Simple gear system: 5 armor slots, 1 weapon, sets, tiers, merging

const ARMOR_SLOTS = ["helmet", "chest", "legs", "boots", "gloves"];
const SET_NAMES = ["Knight", "Rogue", "Mage", "Guardian", "Berserker"];
const TIER_NAMES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

let equippedArmor = {}; // slot -> item
let equippedWeapon = null;

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
  return {
    kind: "weapon",
    name: "Soulblade",
    tier,
    stats: generateWeaponStats(tier)
  };
}

function rollTier(chestType) {
  const odds = {
    basic: [60, 30, 8, 2, 0],
    advanced: [40, 35, 15, 8, 2],
    elite: [20, 30, 25, 15, 10]
  };
  const table = odds[chestType] || odds.basic;
  const roll = Math.random() * 100;
  let sum = 0;
  for (let i = 0; i < table.length; i++) {
    sum += table[i];
    if (roll < sum) return i; // 0-4
  }
  return 0;
}

function generateArmorStats(set, tier) {
  const baseHealth = 10 + tier * 8;
  const baseArmor = 2 + tier * 2;
  return {
    health: baseHealth,
    armor: baseArmor,
    set
  };
}

function generateWeaponStats(tier) {
  const baseDamage = 10 + tier * 6;
  const attackSpeed = 1 + tier * 0.1;
  return {
    damage: baseDamage,
    attackSpeed
  };
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function equipItem(item) {
  if (item.kind === "armor") {
    const current = equippedArmor[item.slot];
    const merged = current ? tryMerge(current, item) : null;
    equippedArmor[item.slot] = merged || item;
  } else if (item.kind === "weapon") {
    const merged = equippedWeapon ? tryMergeWeapon(equippedWeapon, item) : null;
    equippedWeapon = merged || item;
  }
  updateGearUI();
  applyGearToPlayer();
}

function tryMerge(a, b) {
  if (a.set !== b.set || a.slot !== b.slot || a.tier !== b.tier) return null;
  const newTier = Math.min(a.tier + 1, TIER_NAMES.length - 1);
  return {
    ...a,
    tier: newTier,
    stats: generateArmorStats(a.set, newTier)
  };
}

function tryMergeWeapon(a, b) {
  if (a.tier !== b.tier) return null;
  const newTier = Math.min(a.tier + 1, TIER_NAMES.length - 1);
  return {
    ...a,
    tier: newTier,
    stats: generateWeaponStats(newTier)
  };
}

function getSetBonuses() {
  const counts = {};
  for (const slot of ARMOR_SLOTS) {
    const item = equippedArmor[slot];
    if (!item) continue;
    counts[item.set] = (counts[item.set] || 0) + 1;
  }
  const bonuses = {
    healthMult: 1,
    speedMult: 1,
    abilityDamageMult: 1,
    armorMult: 1,
    attackSpeedMult: 1
  };

  for (const set of Object.keys(counts)) {
    if (counts[set] < 5) continue;
    switch (set) {
      case "Knight":
        bonuses.healthMult += 0.2;
        break;
      case "Rogue":
        bonuses.speedMult += 0.15;
        break;
      case "Mage":
        bonuses.abilityDamageMult += 0.25;
        break;
      case "Guardian":
        bonuses.armorMult += 0.3;
        break;
      case "Berserker":
        bonuses.attackSpeedMult += 0.2;
        break;
    }
  }
  return bonuses;
}

function updateGearUI() {
  const el = document.getElementById("gear-info");
  if (!el) return;

  let text = "Armor: ";
  ARMOR_SLOTS.forEach(slot => {
    const item = equippedArmor[slot];
    if (item) {
      text += `[${slot}: ${item.set} ${TIER_NAMES[item.tier]}] `;
    } else {
      text += `[${slot}: none] `;
    }
  });

  text += " | Weapon: ";
  if (equippedWeapon) {
    text += `${equippedWeapon.name} ${TIER_NAMES[equippedWeapon.tier]}`;
  } else {
    text += "none";
  }

  el.textContent = text;
}

function resetGear() {
  equippedArmor = {};
  equippedWeapon = null;
  updateGearUI();
}
