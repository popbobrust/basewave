// Abilities: do damage
// Helpers: buffs (including "evo" helper that lets abilities evolve)

const MAX_ABILITIES = 6;

let abilities = [];
let helpers = [];

const ABILITY_POOL = [
  { id: "fire_orb", name: "Fire Orb", basePower: 8, cooldown: 2000 },
  { id: "lightning", name: "Lightning Strike", basePower: 14, cooldown: 3500 },
  { id: "frost_nova", name: "Frost Nova", basePower: 10, cooldown: 3000 },
  { id: "poison_cloud", name: "Poison Cloud", basePower: 7, cooldown: 2500 },
  { id: "holy_beam", name: "Holy Beam", basePower: 12, cooldown: 3200 },
  { id: "shadow_clone", name: "Shadow Clone", basePower: 9, cooldown: 2800 }
];

const HELPER_POOL = [
  { id: "atk_speed", name: "Attack Speed Up" },
  { id: "move_speed", name: "Move Speed Up" },
  { id: "damage_up", name: "Damage Up" },
  { id: "cdr", name: "Cooldown Reduction" },
  { id: "regen", name: "Health Regen" },
  { id: "crit", name: "Crit Chance" },
  { id: "evo", name: "Evolution Core" }
];

function resetAbilities() {
  abilities = [];
  helpers = [];
}

function addAbility(abilityDef) {
  if (abilities.length >= MAX_ABILITIES) return;
  const now = performance.now();
  abilities.push({
    ...abilityDef,
    level: 1,
    evolved: false,
    lastCast: now
  });
}

function upgradeAbility(ability) {
  ability.level++;
}

function addHelper(helperDef) {
  helpers.push(helperDef);
}

function hasHelper(id) {
  return helpers.some(h => h.id === id);
}

function evolveAbilityIfPossible(ability) {
  if (ability.evolved) return;
  if (!hasHelper("evo")) return;
  ability.evolved = true;
}

function getAbilityDamageMult() {
  const bonuses = getSetBonuses();
  let mult = bonuses.abilityDamageMult;
  if (hasHelper("damage_up")) mult += 0.25;
  if (hasHelper("crit")) mult += 0.1;
  return mult;
}

function getAttackSpeedMult() {
  const bonuses = getSetBonuses();
  let mult = bonuses.attackSpeedMult;
  if (hasHelper("atk_speed")) mult += 0.25;
  return mult;
}

function getMoveSpeedMult() {
  const bonuses = getSetBonuses();
  let mult = bonuses.speedMult;
  if (hasHelper("move_speed")) mult += 0.2;
  return mult;
}

function getCooldownMult() {
  let mult = 1;
  if (hasHelper("cdr")) mult -= 0.2;
  return mult;
}

function applyRegen(dt) {
  if (!player) return;
  if (!hasHelper("regen")) return;
  const regenPerSecond = 1;
  player.health = Math.min(
    player.maxHealth,
    player.health + (regenPerSecond * dt) / 1000
  );
}

function updateAbilities(dt) {
  if (!player) return;
  const now = performance.now();
  const dmgMult = getAbilityDamageMult();
  const cdMult = getCooldownMult();

  abilities.forEach(ab => {
    const cd = ab.cooldown * cdMult;
    if (now - ab.lastCast >= cd) {
      castAbility(ab, dmgMult);
      ab.lastCast = now;
    }
  });

  applyRegen(dt);
}

function castAbility(ability, dmgMult) {
  evolveAbilityIfPossible(ability);
  const base = ability.basePower;
  const levelMult = 1 + (ability.level - 1) * 0.4;
  const evoMult = ability.evolved ? 2.5 : 1;
  const damage = base * levelMult * evoMult * dmgMult;

  enemies.forEach(e => {
    const dist = Math.hypot(e.x - player.x, e.y - player.y);
    let inRange = false;

    switch (ability.id) {
      case "fire_orb":
      case "poison_cloud":
      case "frost_nova":
        inRange = dist < 140;
        break;
      case "lightning":
      case "holy_beam":
      case "shadow_clone":
        inRange = dist < 220;
        break;
    }

    if (inRange) {
      e.health -= damage;
      spawnHitParticles(e.x, e.y, "#ffeb3b");
      if (e.health <= 0 && e.alive) {
        e.alive = false;
        onEnemyKilled();
        addCoins(5 + wave);
      }
    }
  });
}
