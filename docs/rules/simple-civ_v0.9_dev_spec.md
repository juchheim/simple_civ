SIMPLE CIV — v0.9 DEV-SPEC (ENGINE + AI READY)
0. Spec Guarantees

Source of truth: Authoritative v0.9 rulebook pasted by user.

No tuning or structural edits in this document.

Implementation goal: zero interpretation needed by engine/AI/UI.

1. Core Constants
1.1 Global
const GAME_VERSION = "0.9";
const MAP_SHAPE = "hex";
const MAX_PLAYERS = 4;

1.2 Yields
enum YieldType { Food = "F", Production = "P", Science = "S" }

const BASE_CITY_SCIENCE = 1;               // per city per turn
const CITY_CENTER_MIN_FOOD = 2;
const CITY_CENTER_MIN_PROD = 1;

1.3 City Borders / Work Radius
const CITY_WORK_RADIUS_RINGS = 2;          // city controls tiles within 2 rings
const TILE_OWNERSHIP_SHARED = false;       // no tile may belong to more than 1 city
const CITY_CAN_WORK_WATER_TILES = true;    // coast/deep sea tiles in borders

1.4 HP / Combat
const BASE_UNIT_HP = 10;
const ARMY_UNIT_HP = 15;

const BASE_CITY_HP = 20;
const CAPTURED_CITY_HP_RESET = 10;

const DAMAGE_MIN = 1;
const DAMAGE_MAX = 7;
const DAMAGE_BASE = 3;                     // rawDamage baseline

const ATTACK_RANDOM_BAND = [-1, 0, +1];    // uniform random choice

1.5 Fortify / Healing
const FORTIFY_DEF_BONUS = 1;

const HEAL_FRIENDLY_TILE = 3;
const HEAL_FRIENDLY_CITY = 5;

1.6 Growth (v0.8 tuned)
const BASECOST_POP2 = 20;

const GROWTH_FACTORS: Array<{min:number,max:number,f:number}> = [
  {min:2,  max:4,  f:1.20},
  {min:5,  max:6,  f:1.27},
  {min:7,  max:8,  f:1.32},
  {min:9,  max:10, f:1.37},
  {min:11, max:999,f:1.42},
];

const FARMSTEAD_GROWTH_MULT = 0.9;         // −10% cost

1.7 Tech Costs (v0.8 tuned)
const TECH_COST_HEARTH = 20;
const TECH_COST_BANNER = 50;
const TECH_COST_ENGINE = 85;

const ERA_GATE_HEARTH_REQUIRED = 0;
const ERA_GATE_BANNER_REQUIRED = 2;        // need ≥2 Hearth techs
const ERA_GATE_ENGINE_REQUIRED = 2;        // need ≥2 Banner techs

1.8 Projects (v0.8 tuned)
const OBSERVATORY_COST = 120;
const GRAND_ACADEMY_COST = 165;
const GRAND_EXPERIMENT_COST = 210;

const PROGRESS_STEP_ONCE_PER_CIV = true;
const PROGRESS_STEP_ONE_CITY_AT_A_TIME = true;
const PROJECT_CANCEL_ON_CAPTURE_LOSE_PROGRESS = true; // partial production lost

1.9 Settler
const SETTLER_COST = 70;
const SETTLER_POP_LOSS_ON_BUILD = 1;       // min Pop 1

1.10 City Defense (v0.8 tuned)
const CITY_DEFENSE_BASE = 5;
const CITY_DEFENSE_PER_POP_DIV2 = true;    // + floor(Pop/2)
const CITY_WARD_DEFENSE_BONUS = 4;

const CITY_ATTACK_BASE = 3;
const CITY_WARD_ATTACK_BONUS = 1;
const CITY_ATTACK_RANGE = 2;

1.11 Map Sizes
enum MapSize { Small="Small", Standard="Standard", Large="Large" }

const MAP_DIMS = {
  Small:    {w:16, h:12},
  Standard: {w:20, h:14},
  Large:    {w:24, h:18},
};

2. Enums / Types
2.1 Terrain & Features
enum TerrainType {
  Plains, Hills, Forest, Marsh, Desert, Mountain, Coast, DeepSea
}

enum OverlayType {
  RiverEdge, RichSoil, OreVein, SacredSite
}

2.2 Units
enum UnitType {
  Settler, Scout, SpearGuard, BowGuard, Riders, Skiff,
  ArmyScout, ArmySpearGuard, ArmyBowGuard, ArmyRiders
}

enum UnitDomain { Land, Naval, Civilian }

enum UnitState { Normal, Fortified, Garrisoned, PendingSpawn }

2.3 Buildings
enum BuildingType {
  Farmstead, StoneWorkshop, Scriptorium,
  Reservoir, LumberMill, Academy, CityWard,
  Forgeworks, CitySquare
}

2.4 Tech / Eras
enum EraId { Hearth, Banner, Engine }

enum TechId {
  // Hearth
  Fieldcraft, StoneworkHalls, ScriptLore, FormationTraining, TrailMaps,
  // Banner
  Wellworks, TimberMills, ScholarCourts, DrilledRanks, CityWards,
  // Engine
  SteamForges, SignalRelay, UrbanPlans, ArmyDoctrine, StarCharts
}

2.5 Projects
enum ProjectId {
  Observatory, GrandAcademy, GrandExperiment,
  FormArmy_SpearGuard, FormArmy_BowGuard, FormArmy_Riders
}

2.6 Diplomacy / Victory
enum DiplomacyState { Peace, War }

enum VictoryType { Conquest, Progress }

enum CivState { Alive, Eliminated }

2.7 Turn Structure
enum PlayerPhase { StartOfTurn, Planning, Action, EndOfTurn }

enum GlobalRoundPhase { PlayerTurns, EndOfRoundResolution }

3. Data Tables
3.1 Terrain Base Yields / Costs / Defense
type TerrainData = {
  yields: Record<YieldType, number>,
  moveCostLand?: number,     // undefined => impassable
  moveCostNaval?: number,    // undefined => not enterable by naval
  defenseMod: number,
  blocksLoS: boolean,
  workable: boolean,
  domain: UnitDomain | "Any"
}

const TERRAIN: Record<TerrainType, TerrainData> = {
  Plains:   {yields:{F:1,P:1,S:0}, moveCostLand:1, defenseMod:0,  blocksLoS:false, workable:true,  domain:"Any"},
  Hills:    {yields:{F:0,P:2,S:0}, moveCostLand:2, defenseMod:+2, blocksLoS:true,  workable:true,  domain:"Any"},
  Forest:   {yields:{F:1,P:1,S:0}, moveCostLand:2, defenseMod:+1, blocksLoS:true,  workable:true,  domain:"Any"},
  Marsh:    {yields:{F:2,P:0,S:0}, moveCostLand:2, defenseMod:-1, blocksLoS:false, workable:true,  domain:"Any"},
  Desert:   {yields:{F:0,P:1,S:0}, moveCostLand:1, defenseMod:-1, blocksLoS:false, workable:true,  domain:"Any"},
  Mountain: {yields:{F:0,P:0,S:0}, moveCostLand:undefined, defenseMod:0, blocksLoS:true, workable:false, domain:"Any"},
  Coast:    {yields:{F:1,P:0,S:0}, moveCostNaval:1, defenseMod:0, blocksLoS:false, workable:true,  domain:"Naval"},
  DeepSea:  {yields:{F:1,P:0,S:0}, moveCostNaval:1, defenseMod:0, blocksLoS:false, workable:true,  domain:"Naval"},
};

3.2 Overlay Features
type OverlayData = {
  yieldBonus?: Partial<Record<YieldType, number>>,
  riverEdge?: boolean
}

const OVERLAY: Record<OverlayType, OverlayData> = {
  RiverEdge:  {riverEdge:true},              // adjacency effect handled in city yield calc
  RichSoil:   {yieldBonus:{F:1}},
  OreVein:    {yieldBonus:{P:1}},
  SacredSite: {yieldBonus:{S:1}},
};

3.3 Units (Base Stats)
type UnitStats = {
  atk:number, def:number, rng:number, move:number, hp:number, cost:number,
  domain:UnitDomain,
  canCaptureCity:boolean,
  vision:number
}

const UNITS: Record<UnitType, UnitStats> = {
  Settler:     {atk:0, def:0, rng:1, move:1, hp:1,  cost:70, domain:"Civilian", canCaptureCity:false, vision:2},

  Scout:       {atk:1, def:1, rng:1, move:2, hp:10, cost:25, domain:"Land", canCaptureCity:false, vision:3},
  SpearGuard:  {atk:2, def:2, rng:1, move:1, hp:10, cost:30, domain:"Land", canCaptureCity:true,  vision:2},
  BowGuard:    {atk:2, def:1, rng:2, move:1, hp:10, cost:30, domain:"Land", canCaptureCity:false, vision:2},
  Riders:      {atk:2, def:2, rng:1, move:2, hp:10, cost:40, domain:"Land", canCaptureCity:true,  vision:2},
  Skiff:   {atk:2, def:2, rng:1, move:3, hp:10, cost:35, domain:"Naval",canCaptureCity:false, vision:2},

  // Armies inherit move/range/vision of base type, but stats+hp overwritten on transform.
  ArmyScout:      {atk:3, def:3, rng:1, move:2, hp:15, cost:0, domain:"Land", canCaptureCity:false, vision:3},
  ArmySpearGuard: {atk:4, def:4, rng:1, move:1, hp:15, cost:0, domain:"Land", canCaptureCity:true,  vision:2},
  ArmyBowGuard:   {atk:4, def:3, rng:2, move:1, hp:15, cost:0, domain:"Land", canCaptureCity:false, vision:2},
  ArmyRiders:     {atk:4, def:4, rng:1, move:2, hp:15, cost:0, domain:"Land", canCaptureCity:true,  vision:2},
};

3.4 Buildings
type BuildingData = {
  era:EraId, techReq:TechId, cost:number,
  yieldFlat?: Partial<Record<YieldType,number>>,
  growthMult?: number,
  defenseBonus?: number,
  cityAttackBonus?: number,
  conditional?: string
}

const BUILDINGS: Record<BuildingType, BuildingData> = {
  Farmstead:      {era:EraId.Hearth, techReq:TechId.Fieldcraft, cost:40,
                   yieldFlat:{F:1}, growthMult:0.9},

  StoneWorkshop:  {era:EraId.Hearth, techReq:TechId.StoneworkHalls, cost:40,
                   yieldFlat:{P:1}},

  Scriptorium:    {era:EraId.Hearth, techReq:TechId.ScriptLore, cost:40,
                   yieldFlat:{S:1}},

  Reservoir:      {era:EraId.Banner, techReq:TechId.Wellworks, cost:60,
                   yieldFlat:{F:1}, conditional:"+1F more if river city"},

  LumberMill:     {era:EraId.Banner, techReq:TechId.TimberMills, cost:60,
                   yieldFlat:{P:1}, conditional:"+1P more if any Forest worked"},

  Academy:        {era:EraId.Banner, techReq:TechId.ScholarCourts, cost:60,
                   yieldFlat:{S:2}},

  CityWard:       {era:EraId.Banner, techReq:TechId.CityWards, cost:60,
                   defenseBonus:4, cityAttackBonus:1},

  Forgeworks:     {era:EraId.Engine, techReq:TechId.SteamForges, cost:80,
                   yieldFlat:{P:2}},

  CitySquare:     {era:EraId.Engine, techReq:TechId.UrbanPlans, cost:80,
                   yieldFlat:{F:1,P:1}},
};

3.5 Tech Tree
type TechData = {
  era:EraId,
  cost:number,
  prereqTechs:TechId[],
  unlock:
    | {type:"Building", id:BuildingType}
    | {type:"Unit", id:UnitType}
    | {type:"Passive", key:string}
    | {type:"Project", id:ProjectId}
}

const TECHS: Record<TechId, TechData> = {
  // Hearth (cost 20)
  Fieldcraft:       {era:Hearth, cost:20, prereqTechs:[], unlock:{type:"Building",id:Farmstead}},
  StoneworkHalls:   {era:Hearth, cost:20, prereqTechs:[], unlock:{type:"Building",id:StoneWorkshop}},
  ScriptLore:       {era:Hearth, cost:20, prereqTechs:[], unlock:{type:"Building",id:Scriptorium}},
  FormationTraining:{era:Hearth, cost:20, prereqTechs:[], unlock:{type:"Passive", key:"+1 Def to Melee"}},
  TrailMaps:        {era:Hearth, cost:20, prereqTechs:[], unlock:{type:"Unit", id:Skiff}},

  // Banner (cost 50; era gate ≥2 Hearth)
  Wellworks:        {era:Banner, cost:50, prereqTechs:[Fieldcraft], unlock:{type:"Building",id:Reservoir}},
  TimberMills:      {era:Banner, cost:50, prereqTechs:[StoneworkHalls], unlock:{type:"Building",id:LumberMill}},
  ScholarCourts:    {era:Banner, cost:50, prereqTechs:[ScriptLore], unlock:{type:"Building",id:Academy}},
  DrilledRanks:     {era:Banner, cost:50, prereqTechs:[FormationTraining], unlock:{type:"Passive", key:"+1 Atk to Melee & Ranged"}},
  CityWards:        {era:Banner, cost:50, prereqTechs:[StoneworkHalls]/*OR FormationTraining handled in avail check*/,
                     unlock:{type:"Building",id:CityWard}},

  // Engine (cost 85; era gate ≥2 Banner)
  SteamForges:      {era:Engine, cost:85, prereqTechs:[TimberMills], unlock:{type:"Building",id:Forgeworks}},
  SignalRelay:      {era:Engine, cost:85, prereqTechs:[ScholarCourts], unlock:{type:"Passive", key:"+1 Science per city"}},
  UrbanPlans:       {era:Engine, cost:85, prereqTechs:[Wellworks], unlock:{type:"Building",id:CitySquare}},
  ArmyDoctrine:     {era:Engine, cost:85, prereqTechs:[DrilledRanks], unlock:{type:"Passive", key:"Enable Form Army projects"}},
  StarCharts:       {era:Engine, cost:85, prereqTechs:[ScriptLore, ScholarCourts], unlock:{type:"Project", id:Observatory}},
};


Note on City Wards prereq: Availability check is StoneworkHalls OR FormationTraining in addition to era gate.

3.6 Projects
type ProjectData = {
  cost:number,
  prereqTechs?:TechId[],
  prereqMilestone?:ProjectId,
  oncePerCiv:boolean,
  oneCityAtATime:boolean,
  onComplete:{type:"Milestone"|"Victory"|"Transform", payload:any}
}

const PROJECTS: Record<ProjectId, ProjectData> = {
  Observatory: {
    cost:120, prereqTechs:[StarCharts],
    oncePerCiv:true, oneCityAtATime:true,
    onComplete:{type:"Milestone", payload:{scienceBonusCity:+1, unlock:GrandAcademy}}
  },
  GrandAcademy: {
    cost:165, prereqMilestone:Observatory,
    oncePerCiv:true, oneCityAtATime:true,
    onComplete:{type:"Milestone", payload:{scienceBonusPerCity:+1, unlock:GrandExperiment}}
  },
  GrandExperiment: {
    cost:210, prereqMilestone:GrandAcademy,
    oncePerCiv:true, oneCityAtATime:true,
    onComplete:{type:"Victory", payload:{victory:Progress}}
  },

  // Form Army projects exist after ArmyDoctrine.
  FormArmy_SpearGuard:{
    cost:15, // 50% of 30
    oncePerCiv:false, oneCityAtATime:false,
    onComplete:{type:"Transform", payload:{baseUnit:SpearGuard, armyUnit:ArmySpearGuard}}
  },
  FormArmy_BowGuard:{
    cost:15, // 50% of 30
    oncePerCiv:false, oneCityAtATime:false,
    onComplete:{type:"Transform", payload:{baseUnit:BowGuard, armyUnit:ArmyBowGuard}}
  },
  FormArmy_Riders:{
    cost:20, // 50% of 40
    oncePerCiv:false, oneCityAtATime:false,
    onComplete:{type:"Transform", payload:{baseUnit:Riders, armyUnit:ArmyRiders}}
  },
};

4. Formulas / Resolution Rules
4.1 City Center Yield
function calcCityCenterYield(tile): Yields {
  let y = baseTerrainYield(tile.terrain);
  y += overlayYield(tile.overlays); // includes RichSoil/OreVein/SacredSite on center

  // minimums
  y.F = Math.max(y.F, 2);
  y.P = Math.max(y.P, 1);

  // science has no minimum
  y = applyCivTraitToTile(y, tile, city.civ);

  return y;
}

4.2 Worked Tiles / Yield Totals
function cityYieldPerTurn(city): Yields {
  let y = sum(yieldsOf(city.workedTilesIncludingCenter));

  // river adjacency
  // For each worked tile adjacent to a RiverEdge -> +1 Food
  y.F += countRiverAdjWorkedTiles(city) * 1;

  // buildings flat bonuses
  y += sum(buildingFlatYields(city.buildings));

  // conditional building bonuses
  if (cityHas(Reservoir) && city.isRiverCity) y.F += 1;
  if (cityHas(LumberMill) && cityWorksTerrain(Forest)) y.P += 1;

  // civ traits that modify city yields globally
  y = applyCivTraitToCity(y, city);

  return y;
}

4.3 Food Storage & Growth
function growthCost(pop:number, hasFarmstead:boolean): number {
  const base = baseCostTable(pop + 1); // Pop→Pop+1 uses BaseCost[Pop+1]
  const mult = hasFarmstead ? 0.9 : 1.0;
  return ceil(base * mult);
}

function baseCostTable(N:number): number {
  if (N === 2) return 20;
  return ceil(baseCostTable(N-1) * f(N));
}

function f(N:number): number {
  return GROWTH_FACTORS.find(r => N>=r.min && N<=r.max)!.f;
}

function applyGrowth(city) {
  city.storedFood += cityYieldPerTurn(city).F;

  while (city.storedFood >= growthCost(city.pop, cityHas(Farmstead))) {
     city.storedFood -= growthCost(city.pop, cityHas(Farmstead));
     city.pop += 1;
  }
}

4.4 Production Storage & Locked Builds
function applyProduction(city) {
  if (!city.currentBuild) return;
  city.buildProgress += cityYieldPerTurn(city).P;

  if (city.buildProgress >= city.currentBuild.cost) {
     const overflow = city.buildProgress - city.currentBuild.cost;
     completeBuild(city, city.currentBuild);
     city.currentBuild = null;
     city.buildProgress = overflow;        // carries into next chosen build
  }
}

// Locked builds rule:
// city.currentBuild can ONLY be set if null (idle or just finished)

4.5 Science & Locked Research
function totalSciencePerTurn(civ): number {
  let s = civ.cities.length * 1;

  s += sum(cityScienceBuildings(civ));     // Scriptorium +1, Academy +2, Observatory bonus etc.
  s += sum(workedSacredSites(civ));        // +1 each
  s += globalSciencePassives(civ);         // Signal Relay etc.
  s += civTraitScience(civ);              // Scholar Kingdoms etc.

  return s;
}

function applyResearch(civ) {
  civ.currentTech.progress += totalSciencePerTurn(civ);

  if (civ.currentTech.progress >= civ.currentTech.cost) {
     completeTech(civ, civ.currentTech);
     civ.currentTech = null;              // chosen next Planning Phase
  }
}

// Locked research rule:
// civ.currentTech can ONLY be set if null

4.6 Combat (Unit vs Unit)
function attack(attacker, defender) {
  const attackPower = attacker.atk + randomChoice([-1,0,+1]);

  let defensePower = defender.def;
  defensePower += TERRAIN[defender.tile.terrain].defenseMod;

  if (defender.state === Fortified) defensePower += 1;
  defensePower += techAndTraitDefenseBonuses(defender);

  const delta = attackPower - defensePower;
  const rawDamage = 3 + floor(delta / 2);
  const dmg = clamp(rawDamage, 1, 7);

  defender.hp -= dmg;
  if (defender.hp <= 0) destroy(defender);
}

4.7 City Defense & City Attack
function cityDefenseStrength(city): number {
  let d = 5 + floor(city.pop / 2);
  if (cityHas(CityWard)) d += 4;
  return d;
}

function cityAttackPower(city): number {
  let a = 3;
  if (cityHas(CityWard)) a += 1;
  return a;
}

4.8 Attacking Cities

Use same attack() formula, with:

DefenderDefense = cityDefenseStrength(city)

DefenderTerrainMod = none (city uses only its defense formula)

4.9 Capturing Cities
function canCapture(unit): boolean {
  return unit.type in [SpearGuard, Riders, ArmySpearGuard, ArmyRiders];
}

function captureCityIfEligible(unit, city) {
  if (city.hp > 0) return;
  if (!canCapture(unit)) return;
  if (!unit.hasMovementRemainingToEnter(city.tile)) return;

  unit.spendMovementToEnter(city.tile);

  // On capture:
  city.owner = unit.owner;
  city.hp = 10;
  city.pop = Math.max(1, city.pop - 1);

  // buildings remain fully functional
  // current build cancels and stored production for it is lost
  city.currentBuild = null;
  city.buildProgress = 0;

  // attacker chooses Keep vs Raze immediately
}

4.10 Razing
function razeCity(city) {
  removeCity(city);
  revertTileToPreSettlement(city.tile);    // terrain + overlays restored
  removeBorders(city);
}

4.11 Fortify
// If unit did not move or attack on its last Action Phase:
unit.state = Fortified;
// Ends immediately if unit moves or attacks.

4.12 Healing
function applyHealing(unit) {
  if (unit.movedOrAttackedThisTurn) return;
  if (!unit.inFriendlyTerritory) return;

  const heal = unit.onCityTile ? 5 : 3;
  unit.hp = Math.min(unit.maxHp, unit.hp + heal);
}

5. Turn / Round Resolution
5.1 Player Turn
for each PlayerTurn in order:
  Phase StartOfTurn:
    for each city: add yields -> apply growth -> apply production completion
    apply research progress
  Phase Planning:
    choose builds for idle cities
    choose new tech if idle
    optionally reassign worked tiles
  Phase Action:
    for each unit in any order:
      move up to Move
      attack once if eligible
    for each city with garrison:
      perform one ranged attack
  Phase EndOfTurn:
    pass control

5.2 End of Global Round
EndOfGlobalRound:
  checkVictory()
  resolveTies()
  eliminateZeroCityCivs()

6. Diplomacy
function onAttackAttempt(attackerCiv, targetCiv) {
  if (attackerCiv.diplomacy[targetCiv] === Peace) {
     attackerCiv.diplomacy[targetCiv] = War;
     targetCiv.diplomacy[attackerCiv] = War;
  }
  // proceed with attack
}

function proposePeace(civA, civB) {
  // no cooldown, no minimum war duration
}

7. Victory & Elimination
7.1 Conquest Victory
if civ controls all other civ capitals -> Conquest victory

7.2 Progress Victory
if civ completes GrandExperiment and controls ≥1 city -> Progress victory

7.3 Tie Resolution (End of Round)
if Progress and Conquest both triggered in same round:
  Progress resolves first
  Conquest resolves second

if multiple civs share same victory type:
  score = totalPop + numCities + techsResearched
  highest wins
  if still tied -> share victory

7.4 Elimination
if civ.numCities == 0 at end of global round:
  civ.state = Eliminated
  removeAllUnits(civ)

8. Rules Priority (Conflict Resolver)
const RULE_PRIORITY = [
  "Victory rules",
  "Combat rules",
  "City/economy rules",
  "Tech/building/project rules",
  "Terrain/feature rules",
  "Reference appendix + glossary",
];

9. State Indicators (UI/Engine)
UnitState:
  Fortified,
  Garrisoned,
  PendingSpawn

CityState:
  CapturableCity (hp <= 0)

CivState:
  MilestoneComplete(ProjectId),
  Eliminated

10. AI / Engine Hooks (Minimum Viable)
10.1 City Site Scoring
score(tile) =
  centerYieldValue(tile)
  + best3NearbyTilesValue(tile)
  + (riverCity? +1 : 0)
  + overlaysNearby(tile) * 1

// yield weights:
Food=1, Production=1, Science=1

10.2 Tile Working Priority
if civ.goal == Progress:
  prefer S > P > F
else if civ.goal == Conquest:
  prefer P > F > S
else if city.pop behind curve:
  prefer F

10.3 War / Peace Heuristic
declareWar if:
  enemyCityWithinDistance(8)
  && aiMilitaryPower >= defenderPower

acceptPeace if:
  losingWar || progressRaceRiskHigh

10.4 Victory Pursuit Switch
if hasMilestone(Observatory) && capitalsNotFallingQuickly:
  goal = Progress

if enemyCapitalInStrikeRange && hasArmies:
  goal = Conquest