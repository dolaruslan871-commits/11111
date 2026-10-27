// Generated from home-model.cjs.
// Shared construction rules for the native app and browser preview.
const HOME_NAMES = {
  dog: ["Будка", "Будка", "Kennel"],
  husky: ["Лежанка с ковриком", "Лежанка з килимком", "Bed and rug"],
  cat: ["Кошачий домик", "Котячий будиночок", "Cat hideaway"],
  fox: ["Лесная нора", "Лісова нора", "Woodland den"],
  rabbit: ["Домик в холме", "Будиночок у пагорбі", "Burrow cottage"],
  owl: ["Дупло на дереве", "Дупло на дереві", "Tree hollow"],
  kangaroo: ["Тенистое убежище", "Затінений прихисток", "Outback shelter"],
  dinosaur: ["Скальная пещера", "Скельна печера", "Rock cave"],
  croc: ["Лагуна с островком", "Лагуна з острівцем", "Island lagoon"],
};
const languageIndex = language => language === "uk" ? 1 : language === "en" ? 2 : 0;
function homeName(skin, language) { return (HOME_NAMES[skin] || HOME_NAMES.dog)[languageIndex(language)]; }
function homeStatus(life = {}) {
  const progress = Number.isFinite(life.house) ? Math.max(0, Math.min(100, life.house)) : 0;
  const upgrades = Number.isInteger(life.homeUpgrades) ? Math.max(0, Math.min(3, life.homeUpgrades)) : 0;
  const step = Math.floor(progress / 10);
  return {progress, step, upgrades, complete: progress >= 100 && upgrades >= 3,
    visualStage: progress === 0 ? 0 : progress < 30 ? 1 : progress < 60 ? 2 : progress < 80 ? 3 : progress < 100 ? 4 : 5};
}
function homePlan(life, skin = "dog") {
  const status = homeStatus(life);
  if (status.complete) return null;
  const upgrade = status.progress >= 100;
  const stage = upgrade ? 10 + status.upgrades * 2 : status.step;
  const factors = {dog:[1.15,.8],husky:[.8,.6],cat:[1,.7],fox:[1.1,1],rabbit:[1,.8],owl:[1.1,.6],kangaroo:[1,.9],dinosaur:[.7,1.4],croc:[.65,1.5]}[skin] || [1,1];
  return {coins:12+stage*3,wood:Math.ceil((8+stage*3)*factors[0]),stone:Math.ceil((3+stage*2)*factors[1]),
    progress:upgrade?100:Math.min(100,(status.step+1)*10),upgrades:upgrade?status.upgrades+1:status.upgrades,
    upgrade,step:upgrade?status.upgrades+1:status.step+1};
}
function homeCostLabel(life, skin, language) {
  const plan = homePlan(life,skin);
  if (!plan) return ["Все улучшения готовы", "Усі поліпшення готові", "All upgrades complete"][languageIndex(language)];
  return `${plan.coins} 🪙 · ${plan.wood} 🪵 · ${plan.stone} 🪨`;
}
function buildHome(life, skin, language = "ru") {
  const plan = homePlan(life,skin), index = languageIndex(language);
  if (!plan) return {ok:false,code:"COMPLETE",message:["Все улучшения готовы.","Усі поліпшення готові.","All upgrades are complete."][index]};
  if ((life.coins || 0) < plan.coins || (life.inventory?.wood || 0) < plan.wood || (life.inventory?.stone || 0) < plan.stone)
    return {ok:false,code:"RESOURCES",message:[`Нужно ${homeCostLabel(life,skin,language)}. Добудь ресурсы в играх.`,`Потрібно ${homeCostLabel(life,skin,language)}. Здобудь ресурси в іграх.`,`You need ${homeCostLabel(life,skin,language)}. Gather resources in the games.`][index]};
  life.coins-=plan.coins;life.inventory.wood-=plan.wood;life.inventory.stone-=plan.stone;
  life.house=plan.progress;life.homeUpgrades=plan.upgrades;
  return {ok:true,plan};
}
export {HOME_NAMES,homeName,homeStatus,homePlan,homeCostLabel,buildHome};
