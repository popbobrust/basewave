// Abilities with visuals + stars + evo

const MAX_ABILITIES = 6;

let abilities = [];
let helpers = [];

// Ability defs
const ABILITY_POOL = [
  {
    id: "guardian_halo",
    name: "Guardian Halo",
    basePower: 5,
    cooldown: 800
  },
  {
    id: "forcefield",
    name: "Forcefield",
    basePower: 4,
    cooldown: 500
  },
  {
    id: "molotov_ring",
    name: "Molotov Ring",
    basePower: 7,
    cooldown: 2200
  },
  {
    id: "drone",
    name: "Assault Drone",
    basePower: 6,
    cooldown: 400
  }
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

// Visual state
let guardianOrbs = [];
let molotovPools = [];
let droneBullets = [];

function resetAbilities() {
  abilities = [];
  helpers = [];
  guardianOrbs = [];
  molotovPools = [];
  droneBullets = [];
  updateAbilitiesBar();
}

function addAbility(abilityDef) {
  if (abilities.length >= MAX_ABILITIES) return;
  const now = performance.now();
  const ability = {
    ...abilityDef,
    level: 1,
    evolved: false,
    lastCast: now
  };
  abilities.push(ability);
  updateAbilitiesBar();
}

function upgradeAbility(ability) {
  ability.level = Math.min(ability.level + 1, 5);
  updateAbilitiesBar();
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

  updateGuardianOrbs(dt);
  updateMolotovPools(dt);
  updateDroneBullets(dt);

  applyRegen(dt);
}

function castAbility(ability, dmgMult) {
  evolveAbilityIfPossible(ability);
  const base = ability.basePower;
  const levelMult = 1 + (ability.level - 1) * 0.5;
  const evoMult = ability.evolved ? 2.5 : 1;
  const damage = base * levelMult * evoMult * dmgMult;

  switch (ability.id) {
    case "guardian_halo":
      spawnGuardianOrbs(ability, damage);
      break;
    case "forcefield":
      applyForcefield(ability, damage);
      break;
    case "molotov_ring":
      spawnMolotov(ability, damage);
      break;
    case "drone":
      spawnDroneShot(ability, damage);
      break;
  }
}

// ---------- Guardian Halo ----------

function spawnGuardianOrbs(ability, damage) {
  const count = 2 + ability.level;
  const baseRadius = 60 + ability.level * 10;
  const speed = ability.evolved ? 0.008 : 0.004;

  guardianOrbs = [];
  for (let i = 0; i < count; i++) {
    guardianOrbs.push({
      angle: (Math.PI * 2 * i) / count,
      radius: baseRadius,
      damage,
      speed
    });
  }
}

function updateGuardianOrbs(dt) {
  if (!player) return;
  guardianOrbs.forEach(orb => {
    orb.angle += orb.speed * dt;
    const x = player.x + Math.cos(orb.angle) * orb.radius;
    const y = player.y + Math.sin(orb.angle) * orb.radius;

    enemies.forEach(e => {
      if (!e.alive) return;
      const dist = Math.hypot(e.x - x, e.y - y);
      if (dist < 18) {
        e.health -= orb.damage;
        spawnHitParticles(e.x, e.y, "#66bb6a");
        if (e.health <= 0 && e.alive) {
          e.alive = false;
          onEnemyKilled();
          addCoins(5 + wave);
        }
      }
    });
  });
}

// ---------- Forcefield ----------

function applyForcefield(ability, damage) {
  if (!player) return;
  const baseRadius = 70 + ability.level * 12;
  const radius = ability.evolved ? baseRadius * 1.4 : baseRadius;

  enemies.forEach(e => {
    if (!e.alive) return;
    const dist = Math.hypot(e.x - player.x, e.y - player.y);
    if (dist < radius) {
      const slowFactor = ability.evolved ? 0.4 : 0.7;
      e.x -= (e.x - player.x) * 0.01 * slowFactor;
      e.y -= (e.y - player.y) * 0.01 * slowFactor;

      e.health -= damage * 0.5;
      if (e.health <= 0 && e.alive) {
        e.alive = false;
        spawnHitParticles(e.x, e.y, "#42a5f5");
        onEnemyKilled();
        addCoins(5 + wave);
      }
    }
  });
}

// ---------- Molotov Ring ----------

function spawnMolotov(ability, damage) {
  if (!player) return;
  const count = 1 + ability.level;
  const baseRadius = 120 + ability.level * 15;
  const life = ability.evolved ? 4500 : 3000;
  const size = ability.evolved ? 80 : 50;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const x = player.x + Math.cos(angle) * baseRadius;
    const y = player.y + Math.sin(angle) * baseRadius;
    molotovPools.push({
      x,
      y,
      radius: size,
      damage,
      life
    });
  }
}

function updateMolotovPools(dt) {
  molotovPools.forEach(pool => {
    pool.life -= dt;
    enemies.forEach(e => {
      if (!e.alive) return;
      const dist = Math.hypot(e.x - pool.x, e.y - pool.y);
      if (dist < pool.radius) {
        e.health -= pool.damage * (dt / 1000) * 3;
        if (e.health <= 0 && e.alive) {
          e.alive = false;
          spawnHitParticles(e.x, e.y, "#ff7043");
          onEnemyKilled();
          addCoins(5 + wave);
        }
      }
    });
  });
  molotovPools = molotovPools.filter(p => p.life > 0);
}

// ---------- Drone ----------

function spawnDroneShot(ability, damage) {
  if (!player) return;
  const speed = 6 + ability.level * 0.8;
  const evolved = ability.evolved;

  if (!evolved) {
    const angle = performance.now() / 200;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    droneBullets.push({
      x: player.x,
      y: player.y,
      vx,
      vy,
      damage,
      life: 1200
    });
  } else {
    droneBullets.push(
      {
        x: player.x,
        y: player.y,
        vx: speed,
        vy: 0,
        damage,
        life: 1200
      },
      {
        x: player.x,
        y: player.y,
        vx: -speed,
        vy: 0,
        damage,
        life: 1200
      }
    );
  }
}

function updateDroneBullets(dt) {
  droneBullets.forEach(b => {
    b.life -= dt;
    b.x += b.vx;
    b.y += b.vy;

    enemies.forEach(e => {
      if (!e.alive) return;
      const dist = Math.hypot(e.x - b.x, e.y - b.y);
      if (dist < 14) {
        e.health -= b.damage;
        spawnHitParticles(e.x, e.y, "#ffee58");
        b.life = 0;
        if (e.health <= 0 && e.alive) {
          e.alive = false;
          onEnemyKilled();
          addCoins(5 + wave);
        }
      }
    });
  });
  droneBullets = droneBullets.filter(b => b.life > 0);
}

// ---------- Drawing ----------

function drawAbilities(ctx) {
  // Guardian orbs
  guardianOrbs.forEach(orb => {
    const x = player.x + Math.cos(orb.angle) * orb.radius;
    const y = player.y + Math.sin(orb.angle) * orb.radius;
    ctx.fillStyle = "rgba(102, 187, 106, 0.8)";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  // Forcefield visual
  const ff = abilities.find(a => a.id === "forcefield");
  if (ff && player) {
    const baseRadius = 70 + ff.level * 12;
    const radius = ff.evolved ? baseRadius * 1.4 : baseRadius;
    ctx.strokeStyle = "rgba(66, 165, 245, 0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Molotov pools
  molotovPools.forEach(pool => {
    const alpha = Math.max(pool.life / 3000, 0.2);
    ctx.fillStyle = `rgba(255, 112, 67, ${alpha})`;
    ctx.beginPath();
    ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // Drone bullets
  droneBullets.forEach(b => {
    ctx.fillStyle = "#ffee58";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ---------- UI: abilities bar ----------

function updateAbilitiesBar() {
  const bar = document.getElementById("abilities-bar");
  if (!bar) return;
  bar.innerHTML = "";

  for (let i = 0; i < MAX_ABILITIES; i++) {
    const slot = document.createElement("div");
    slot.className = "ability-slot";
    const ab = abilities[i];
    if (ab) {
      const name = document.createElement("span");
      name.className = "ability-name";
      name.textContent = ab.name;

      const stars = document.createElement("span");
      stars.className = "ability-stars";
      stars.textContent = "★".repeat(ab.level) + "☆".repeat(5 - ab.level);

      slot.appendChild(name);
      slot.appendChild(stars);
    } else {
      slot.textContent = "Empty";
    }
    bar.appendChild(slot);
  }
}
