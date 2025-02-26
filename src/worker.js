import CombatSimulator from "./combatsimulator/combatSimulator";
import Player from "./combatsimulator/player";
import Zone from "./combatsimulator/zone";
import itemDetailMap from "./combatsimulator/data/itemDetailMap.json";
import Consumable from "./combatsimulator/consumable";
import abilityDetailMap from "./combatsimulator/data/abilityDetailMap.json";
import Ability from "./combatsimulator/ability";

const checkTime = 10;
async function simWithDrink(playerD, zoneHrid, simulationTimeLimit, restartInterval, drinks) {
    let drinkResults = [];
    for (let i = 0; i < checkTime; i++) {
        let player = Player.createFromDTO(playerD);
        let zone = new Zone(zoneHrid);
        player.zoneBuffs = zone.buffs;
        player.drinks = [];
        if (drinks.length) {
            for (let i = 0; i < drinks.length; i++) {
                player.drinks.push(new Consumable(drinks[i]));
            }
        }
        
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

    console.log(drinks, average, max, min);

    return { drinks: drinks, average: average, max: max, min: min };
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
                const drinkCombinations = [];

                let maxDrinks = 3;

                let currentCombination = event.data.player.drinks.filter(drink => drink !== null).map(drink => itemDetailMap[drink.hrid]);
                if (currentCombination.length == 3) {
                    maxDrinks = 1;
                    currentCombination = [];
                }
                
                function generateCombinations(currentCombination, startIndex) {
                    if (maxDrinks === 1 ||  currentCombination.length === maxDrinks || drinkCombinations.length === 0) {
                        drinkCombinations.push(currentCombination.map(drink => drink["hrid"]));
                    }
                    if (currentCombination.length === maxDrinks) {
                        return;
                    }
                    for (let i = startIndex; i < allDrinks.length; i++) {
                        const drink = allDrinks[i];
                        const drinkSuffixParts = drink["hrid"].split("_");
                        const drinkSuffix = drinkSuffixParts[drinkSuffixParts.length - 1] === "coffee" ? drinkSuffixParts[drinkSuffixParts.length - 2] : drinkSuffixParts[drinkSuffixParts.length - 1];
                        if (currentCombination.some(d => {
                            const dSuffixParts = d["hrid"].split("_");
                            const dSuffix = dSuffixParts[dSuffixParts.length - 1] === "coffee" ? dSuffixParts[dSuffixParts.length - 2] : dSuffixParts[dSuffixParts.length - 1];
                            return dSuffix === drinkSuffix;
                        })) {
                            continue;
                        }
                        currentCombination.push(drink);
                        generateCombinations(currentCombination, i + 1);
                        currentCombination.pop();
                    }
                }
                generateCombinations(currentCombination, 0);

                let results = [];
                // simulate with all drinks
                for (let i = 0; i < drinkCombinations.length; i++) {
                    const drinks = drinkCombinations[i];
                    let drinkResults = await simWithDrink(event.data.player, event.data.zoneHrid, simulationTimeLimit, restartInterval, drinks);
                    const drinkNames = drinks.map(drink => itemDetailMap[drink]["name"]).join(" + ");
                    results.push({ drink: drinkNames.length?drinkNames:"None", result: drinkResults });
                    drinkResults.increaseRatio = ((drinkResults.average - results[0].result.average) / results[0].result.average) * 100;
                    this.postMessage({ type: "simulation_progress", progress: (results.length ) / (drinkCombinations.length ) });
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
