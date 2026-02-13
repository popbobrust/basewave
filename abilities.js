// ===============================
// ABILITIES SYSTEM
// ===============================

const MAX_ABILITIES = 6;

let abilities = [];
let helpers = []; // each helper: { id, name, level }

// Visual state
let guardianOrbs = [];
let molotovPools = [];
let droneBursts = [];
let droneAngle = 0;

// Ability definitions
const ABILITY_POOL = [
  {
    id: "guardian_halo",
    name: "Guardian Halo",
    basePower: 6,
    cooldown: 800,
    evoReq: "guardian_core"
  },
  {
    id: "forcefield",
    name: "Forcefield",
    basePower: 5,
    cooldown: 500,
    evoReq: "forcefield_core"
  },
  {
    id: "molotov_ring",
    name: "Molotov Ring",
    basePower: 8,
    cooldown: 2200,
    evoReq: "molotov_core"
  },
  {
    id: "drone",
    name: "Assault Drone",
    basePower: 4,
    cooldown: 200,
    evoReq: "drone_core"
  }
];

// Helper definitions (stat + secondary evo helpers)
// Renamed to "Module" style
const HELPER_POOL = [
  // Stat helpers
  { id: "atk_speed", name: "Attack Speed Module" },
  { id: "move_speed", name: "Move Speed Module" },
  { id: "damage_up", name: "Damage Module" },
  { id: "cdr", name: "Cooldown Module" },
  { id: "regen", name: "Regen Module" },
  { id: "crit", name: "Crit Module" },

  // Ability evo keys
  { id: "guardian_core", name: "Guardian Halo Module" },
  { id: "forcefield_core", name: "Forcefield Module" },
  { id: "molotov_core", name: "Molotov Ring Module" },
  { id: "drone_core", name: "Assault Drone Module" },

  // Weapon evo keys
  { id: "berserker_core", name: "Soulblade Module" },   // Soulblade
  { id: "storm_core", name: "Stormbow Module" },        // Stormbow
  { id: "flame_core", name: "Flamethrower Module" },    // Flamethrower
  { id: "rail_core", name: "Railgun Module" }           // Railgun
];

// ===============================
// RESET
// ===============================

function resetAbilities() {
  abilities = [];
  helpers = [];
  guardianOrbs = [];
  molotovPools = [];
  droneBursts = [];
  droneAngle = 0;
  updateAbilitiesBar();
}

// ===============================
// ADD / UPGRADE ABILITIES
// ===============================

function addAbility(def) {
  if (abilities.length >= MAX_ABILITIES) return;
  const existing = abilities.find(a => a.id === def.id);
  if (existing) {
    upgradeAbility(existing);
    return;
  }
  abilities.push({
    ...def,
    level: 1,
    evolved: false,
    lastCast: performance.now()
  });
  updateAbilitiesBar();
}

function upgradeAbility(ab) {
  if (ab.level >= 5) return; // hard cap at 5
  ab.level = Math.min(ab.level + 1, 5);

  // Evo only when hitting 5★ and secondary is also 5★
  if (ab.level === 5) {
    evolveAbilityIfPossible(ab);
  }

  updateAbilitiesBar();
}

// ===============================
// HELPERS (SECONDARY ABILITIES)
// ===============================

function addHelper(def) {
  const existing = helpers.find(h => h.id === def.id);
  if (existing) {
    existing.level = Math.min(existing.level + 1, 5); // hard cap at 5
  } else {
    helpers.push({ ...def, level: 1 });
  }
  updateAbilitiesBar();
}

function getHelperLevel(id) {
  const h = helpers.find(h => h.id === id);
  return h ? h.level : 0;
}

function hasHelper(id) {
  return helpers.some(h => h.id === id);
}

// ===============================
// MULTIPLIERS
// ===============================

function getAbilityDamageMult() {
  let mult = 1;
  mult += getHelperLevel("damage_up") * 0.1;
  mult += getHelperLevel("crit") * 0.05;

  if (typeof player !== "undefined" && player && player.abilityDamageBonus) {
    mult += player.abilityDamageBonus;
  }

  return mult;
}

function getAttackSpeedMult() {
  return 1 + getHelperLevel("atk_speed") * 0.1;
}

function getMoveSpeedMult() {
  return 1 + getHelperLevel("move_speed") * 0.08;
}

function getCooldownMult() {
  let mult = Math.max(0.6, 1 - getHelperLevel("cdr") * 0.05);
  if (typeof player !== "undefined" && player && player.cooldownBonus) {
    mult *= (1 - player.cooldownBonus);
  }
  return mult;
}

function applyRegen(dt) {
  if (!player) return;

  const lvl = getHelperLevel("regen");
  const baseRegen = lvl ? lvl * 0.5 : 0;
  const extraRegen = player.regenBonus || 0;
  const totalRegen = baseRegen + extraRegen;

  if (!totalRegen) return;

  player.health = Math.min(
    player.maxHealth,
    player.health + totalRegen * dt / 1000
  );
}

// ===============================
// EVOLUTION
// ===============================

function evolveAbilityIfPossible(ab) {
  // Rule: must be 5★ and have the corresponding secondary at 5★
  if (!ab.evoReq) return;
  if (ab.level !== 5) return;
  if (getHelperLevel(ab.evoReq) !== 5) return;
  ab.evolved = true;
}

// ===============================
// ABILITY CASTING
// ===============================

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

  updateGuardianOrbs(dt);
  updateMolotovPools(dt);
  updateDroneBursts(dt);

  applyRegen(dt);
}

function castAbility(ab, dmgMult) {
  const base = ab.basePower;
  const levelMult = 1 + (ab.level - 1) * 0.5;
  const evoMult = ab.evolved ? 2.5 : 1;
  const damage = base * levelMult * evoMult * dmgMult;

  switch (ab.id) {
    case "guardian_halo": spawnGuardianOrbs(ab, damage); break;
    case "forcefield": applyForcefield(ab, damage); break;
    case "molotov_ring": spawnMolotov(ab, damage); break;
    case "drone": spawnDroneShot(ab, damage); break;
  }
}

// ===============================
// GUARDIAN HALO
// ===============================

function spawnGuardianOrbs(ab, damage) {
  const count = 2 + ab.level;
  const radius = 60 + ab.level * 10;
  const speed = ab.evolved ? 0.008 : 0.004;

  let baseAngle = 0;
  if (guardianOrbs.length > 0) {
    baseAngle = guardianOrbs[0].angle;
  }

  guardianOrbs = [];
  for (let i = 0; i < count; i++) {
    guardianOrbs.push({
      angle: baseAngle + (Math.PI * 2 * i) / count,
      radius,
      damage,
      speed
    });
  }
}

function updateGuardianOrbs(dt) {
  if (!player) return;

  guardianOrbs.forEach(o => {
    o.angle += o.speed * dt;
    const x = player.x + Math.cos(o.angle) * o.radius;
    const y = player.y + Math.sin(o.angle) * o.radius;

    enemies.forEach(e => {
      if (!e.alive) return;
      if (Math.hypot(e.x - x, e.y - y) < 18) {
        e.health -= o.damage;
        spawnHitParticles(e.x, e.y, "#66bb6a");
        if (e.health <= 0) {
          e.alive = false;
          onEnemyKilled();
          addCoins(5 + wave);
        }
      }
    });
  });
}

// ===============================
// FORCEFIELD
// ===============================

function applyForcefield(ab, damage) {
  const baseRadius = 70 + ab.level * 12;
  const radius = ab.evolved ? baseRadius * 1.4 : baseRadius;

  enemies.forEach(e => {
    if (!e.alive) return;

    const dist = Math.hypot(e.x - player.x, e.y - player.y);
    if (dist < radius) {
      const slow = ab.evolved ? 0.4 : 0.7;
      e.x -= (e.x - player.x) * 0.01 * slow;
      e.y -= (e.y - player.y) * 0.01 * slow;

      const tickDamage = damage * 0.5;
      e.health -= tickDamage;
      spawnHitParticles(e.x, e.y, "#42a5f5");

      if (e.health <= 0) {
        e.alive = false;
        spawnHitParticles(e.x, e.y, "#42a5f5");
        onEnemyKilled();
        addCoins(5 + wave);
      }
    }
  });
}

// ===============================
// MOLOTOV
// ===============================

function spawnMolotov(ab, damage) {
  const count = 1 + ab.level;
  const radius = 120 + ab.level * 15;
  const size = ab.evolved ? 80 : 50;
  const life = ab.evolved ? 4500 : 3000;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    molotovPools.push({
      x: player.x + Math.cos(angle) * radius,
      y: player.y + Math.sin(angle) * radius,
      radius: size,
      damage,
      life
    });
  }
}

function updateMolotovPools(dt) {
  molotovPools.forEach(p => {
    p.life -= dt;
    enemies.forEach(e => {
      if (!e.alive) return;
      if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius) {
        e.health -= p.damage * (dt / 1000) * 3;
        spawnHitParticles(e.x, e.y, "#ff7043");
        if (e.health <= 0) {
          e.alive = false;
          onEnemyKilled();
          addCoins(5 + wave);
        }
      }
    });
  });
  molotovPools = molotovPools.filter(p => p.life > 0);
}

// ===============================
// DRONE (ORBIT + RING AOE)
// ===============================

function spawnDroneShot(ab, damage) {
  // handled in updateDroneBursts via continuous firing
}

let droneMissileTimer = 0;

function updateDroneBursts(dt) {
  droneAngle += 0.002 * dt;

  const droneAb = abilities.find(a => a.id === "drone");
  if (droneAb && player) {
    const fireInterval = droneAb.evolved ? 140 : 200;
    droneMissileTimer += dt;

    while (droneMissileTimer >= fireInterval) {
      droneMissileTimer -= fireInterval;

      const droneRadius = 40;
      const droneX = player.x + Math.cos(droneAngle) * droneRadius;
      const droneY = player.y + Math.sin(droneAngle) * droneRadius;

      const burstCount = droneAb.evolved ? 6 : 4;
      const baseAngle = droneAngle;

      for (let i = 0; i < burstCount; i++) {
        const a = baseAngle + (Math.PI * 2 * i) / burstCount;
        const dist = 22;
        const x = droneX + Math.cos(a) * dist;
        const y = droneY + Math.sin(a) * dist;

        droneBursts.push({
          x,
          y,
          radius: 20,
          damage: droneAb.basePower * (1 + (droneAb.level - 1) * 0.5) * getAbilityDamageMult(),
          life: 180
        });
      }
    }
  }

  droneBursts.forEach(b => {
    b.life -= dt;

    enemies.forEach(e => {
      if (!e.alive) return;
      if (Math.hypot(e.x - b.x, e.y - b.y) < b.radius) {
        e.health -= b.damage;
        spawnHitParticles(e.x, e.y, "#ffee58");
        if (e.health <= 0) {
          e.alive = false;
          onEnemyKilled();
          addCoins(5 + wave);
        }
      }
    });
  });

  droneBursts = droneBursts.filter(b => b.life > 0);
}

// ===============================
// DRAW VISUALS
// ===============================

function drawAbilities(ctx) {
  // Guardian orbs
  guardianOrbs.forEach(o => {
    const x = player.x + Math.cos(o.angle) * o.radius;
    const y = player.y + Math.sin(o.angle) * o.radius;
    ctx.fillStyle = "rgba(102,187,106,0.8)";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  // Forcefield
  const ff = abilities.find(a => a.id === "forcefield");
  if (ff) {
    const base = 70 + ff.level * 12;
    const radius = ff.evolved ? base * 1.4 : base;
    ctx.strokeStyle = "rgba(66,165,245,0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Molotov pools
  molotovPools.forEach(p => {
    ctx.fillStyle = "rgba(255,112,67,0.3)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // Drone body
  const droneAb = abilities.find(a => a.id === "drone");
  if (droneAb && player) {
    const radius = 40;
    const x = player.x + Math.cos(droneAngle) * radius;
    const y = player.y + Math.sin(droneAngle) * radius;
    ctx.fillStyle = "#90caf9";
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Drone bursts
  droneBursts.forEach(b => {
    ctx.fillStyle = "rgba(255,238,88,0.8)";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ===============================
// ABILITY BAR UI
// ===============================

function updateAbilitiesBar() {
  const bar = document.getElementById("abilities-bar");
  if (!bar) return;
  bar.innerHTML = "";

  // Active abilities
  abilities.forEach(ab => {
    const slot = document.createElement("div");
    slot.className = "ability-slot";

    const name = document.createElement("span");
    name.className = "ability-name";
    name.textContent = ab.name + (ab.evolved ? " +" : "");

    const stars = document.createElement("span");
    stars.className = "ability-stars";
    stars.textContent = "★".repeat(ab.level) + "☆".repeat(5 - ab.level);

    slot.appendChild(name);
    slot.appendChild(stars);
    bar.appendChild(slot);
  });

  // Secondary abilities (helpers) shown as abilities
  helpers.forEach(h => {
    const slot = document.createElement("div");
    slot.className = "ability-slot";

    const name = document.createElement("span");
    name.className = "ability-name";
    name.textContent = h.name;

    const stars = document.createElement("span");
    stars.className = "ability-stars";
    stars.textContent = "★".repeat(h.level) + "☆".repeat(5 - h.level);

    slot.appendChild(name);
    slot.appendChild(stars);
    bar.appendChild(slot);
  });
}
