import CombatSimulator from "./combatsimulator/combatSimulator";
import Player from "./combatsimulator/player";
import Zone from "./combatsimulator/zone";
import itemDetailMap from "./combatsimulator/data/itemDetailMap.json";
import Consumable from "./combatsimulator/consumable";
import abilityDetailMap from "./combatsimulator/data/abilityDetailMap.json";
import Ability from "./combatsimulator/ability";

const checkTime = 10;
async function simWithDrink(playerD, zoneHrid, simulationTimeLimit, restartInterval, drink) {
    let drinkResults = [];
    for (let i = 0; i < checkTime; i++) {
        let player = Player.createFromDTO(playerD);
        let zone = new Zone(zoneHrid);
        player.zoneBuffs = zone.buffs;
        player.drinks = [];
        if (drink) player.drinks.push(new Consumable(drink["hrid"]));

        let combatSimulator = new CombatSimulator(player, zone);
        try {
            let simResult = await combatSimulator.simulate(simulationTimeLimit, restartInterval);

            let totalDamageDone = 0;
            for (const [target, abilities] of Object.entries(simResult.attacks["player"])) {
                for (const [ability, abilityCasts] of Object.entries(abilities)) {
                    let damage = Object.entries(abilityCasts)
                        .filter((entry) => entry[0] != "miss")
                        .reduce((prev, cur) => prev + Number(cur[0]) * cur[1], 0);
                    totalDamageDone += damage;
                }
            }
            drinkResults.push(totalDamageDone);
        } catch (e) {
            console.log(e);
        }
    }

    // calculate average max min
    let total = drinkResults.reduce((sum, value) => sum + value, 0);
    let average = total / drinkResults.length;
    let max = Math.max(...drinkResults);
    let min = Math.min(...drinkResults);

    console.log(drink?.["hrid"], average, max, min);

    return { drink: drink?.["hrid"], average: average, max: max, min: min };
}

async function simWithSpecialAbility(playerD, zoneHrid, simulationTimeLimit, restartInterval, specialAbility) {
    let testResults = [];
    for (let i = 0; i < checkTime; i++) {
        let player = Player.createFromDTO(playerD);
        let zone = new Zone(zoneHrid);
        player.zoneBuffs = zone.buffs;

        let specialAbilityLevel = player.abilities[0]?player.abilities[0].level:11; //default lvl 11 equal xp 964

        player.abilities[0] = null;
        if (specialAbility)
            player.abilities[0] = new Ability(specialAbility["hrid"], specialAbilityLevel);

        let combatSimulator = new CombatSimulator(player, zone);
        try {
            let simResult = await combatSimulator.simulate(simulationTimeLimit, restartInterval);

            let totalDamageDone = 0;
            for (const [target, abilities] of Object.entries(simResult.attacks["player"])) {
                for (const [ability, abilityCasts] of Object.entries(abilities)) {
                    let damage = Object.entries(abilityCasts)
                        .filter((entry) => entry[0] != "miss")
                        .reduce((prev, cur) => prev + Number(cur[0]) * cur[1], 0);
                    totalDamageDone += damage;
                }
            }
            testResults.push(totalDamageDone);
        } catch (e) {
            console.log(e);
        }
    }

    // calculate average max min
    let total = testResults.reduce((sum, value) => sum + value, 0);
    let average = total / testResults.length;
    let max = Math.max(...testResults);
    let min = Math.min(...testResults);

    console.log(specialAbility?.["hrid"], average, max, min);

    return { specialAbility: specialAbility?.["hrid"], average: average, max: max, min: min };
}

onmessage = async function (event) {
    switch (event.data.type) {
        case "start_simulation":
            {
                let player = Player.createFromDTO(event.data.player);
                let zone = new Zone(event.data.zoneHrid);
                player.zoneBuffs = zone.buffs;
                let simulationTimeLimit = event.data.simulationTimeLimit;
                let restartInterval = event.data.restartInterval;

                let combatSimulator = new CombatSimulator(player, zone);
                combatSimulator.addEventListener("progress", (event) => {
                    this.postMessage({ type: "simulation_progress", progress: event.detail });
                });

                try {
                    let simResult = await combatSimulator.simulate(simulationTimeLimit, restartInterval);
                    this.postMessage({ type: "simulation_result", simResult: simResult });
                } catch (e) {
                    console.log(e);
                    this.postMessage({ type: "simulation_error", error: e });
                }
            }
            break;
        case "start_simEph":
            {
                let player = Player.createFromDTO(event.data.player);
                let zone = new Zone(event.data.zoneHrid);
                player.zoneBuffs = zone.buffs;
                let simulationTimeLimit = event.data.simulationTimeLimit;
                let simEph = event.data.simEph;

                let combatSimulator = new CombatSimulator(player, zone);

                try {
                    let simResult = await combatSimulator.simulateWithEPH(simEph, simulationTimeLimit);
                    this.postMessage({ type: "simulation_eph_result", simResult: simResult });
                } catch (e) {
                    console.log(e);
                    this.postMessage({ type: "simulation_error", error: e });
                }
            }
            break;
        case "start_simDrink":
            {
                this.postMessage({ type: "simulation_progress", progress: 0 });
                
                let simulationTimeLimit = event.data.simulationTimeLimit;
                let restartInterval = event.data.restartInterval;

                const allDrinks = Object.values(itemDetailMap).filter((item) => item["categoryHrid"] === "/item_categories/drink" && item["consumableDetail"]?.["usableInActionTypeMap"]?.["/action_types/combat"] === true);

                let results = [];
                // simulate with base
                let baseResults = await simWithDrink(event.data.player, event.data.zoneHrid, simulationTimeLimit, restartInterval, null);

                this.postMessage({ type: "simulation_progress", progress: 1 / (allDrinks.length + 1) });
                // simulate with all drinks
                for (let i = 0; i < allDrinks.length; i++) {
                    const drink = allDrinks[i];
                    let drinkResults = await simWithDrink(event.data.player, event.data.zoneHrid, simulationTimeLimit, restartInterval, drink);
                    drinkResults.increaseRatio = ((drinkResults.average - baseResults.average) / baseResults.average) * 100;
                    results.push({ drink: drink["name"], result: drinkResults });
                    this.postMessage({ type: "simulation_progress", progress: (results.length + 1) / (allDrinks.length + 1) });
                }

                // sort by increase ratio
                results.sort((a, b) => b.result.increaseRatio - a.result.increaseRatio);
                console.log(results);

                this.postMessage({ type: "simulation_drink_results", results: results });

            }
            break;
            case "start_simSpecialAbility":
            {
                this.postMessage({ type: "simulation_progress", progress: 0 });
                
                let simulationTimeLimit = event.data.simulationTimeLimit;
                let restartInterval = event.data.restartInterval;

                const allAbilities = Object.values(abilityDetailMap).filter((ability) => ability["isSpecialAbility"] === true && ability["name"] != "Promote");

                let results = [];
                // simulate with base
                let baseResults = await simWithSpecialAbility(event.data.player, event.data.zoneHrid, simulationTimeLimit, restartInterval, null);
                baseResults.increaseRatio = 0;
                results.push({ ability: "None", result: baseResults });

                this.postMessage({ type: "simulation_progress", progress: 1 / (allAbilities.length + 1) });
                // simulate with all abilities
                for (let i = 0; i < allAbilities.length; i++) {
                    const ability = allAbilities[i];
                    let abilityResults = await simWithSpecialAbility(event.data.player, event.data.zoneHrid, simulationTimeLimit, restartInterval, ability);
                    abilityResults.increaseRatio = ((abilityResults.average - baseResults.average) / baseResults.average) * 100;
                    results.push({ ability: ability["name"], result: abilityResults });
                    this.postMessage({ type: "simulation_progress", progress: (results.length) / (allAbilities.length + 1) });
                }

                // sort by increase ratio
                results.sort((a, b) => b.result.increaseRatio - a.result.increaseRatio);
                console.log(results);

                this.postMessage({ type: "simulation_special_ability_results", results: results });

            }
            break;
    }
};
