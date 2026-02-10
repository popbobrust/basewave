const MAX_ABILITIES = 6;

let abilities = [];
let helpers = [];

function addAbility(ability) {
  if (abilities.length < MAX_ABILITIES) {
    abilities.push(ability);
  }
}

function addHelper(helper) {
  helpers.push(helper);
}

function evolveAbility(ability) {
  if (!helpers.includes("evo")) return ability;
  return {
    ...ability,
    evolved: true,
    power: ability.power * 2.5
  };
}
