import CombatSimulator from './data/combatSimulator.js';

class QueueSimulation {
    constructor() {
        this.queue = [];
        this.results = [];
        this.isRunning = false;
        this.currentIndex = 0;
        this.totalSimulations = 0;
        
        // Initialize UI references
        this.queueCurrentSetupButton = document.getElementById('queueCurrentSetupButton');
        this.clearQueueButton = document.getElementById('clearQueueButton');
        this.startQueueButton = document.getElementById('startQueueButton');
        this.stopQueueButton = document.getElementById('stopQueueButton');
        this.queueStatusText = document.getElementById('queueStatusText');
        this.queueProgressBar = document.getElementById('queueProgressBar');
        this.queueResultsTableBody = document.getElementById('queueResultsTableBody');
        
        // Attach event listeners
        this.attachEventListeners();
        this.logAvailableAbilities(); // REMEBER TO REMOVE THIS LINE
    }

    logAvailableAbilities() {
        console.log("Available abilities:");
        for (let i = 0; i < 8; i++) { // Try more indices to find all ability dropdowns
            const select = document.getElementById(`selectAbility_${i}`);
            if (select) {
                console.log(`Ability slot ${i}:`, {
                    elementFound: true,
                    selectedValue: select.value,
                    selectedText: select.selectedOptions[0]?.text || "None",
                    options: Array.from(select.options).map(opt => ({ value: opt.value, text: opt.text }))
                });
            } else {
                console.log(`Ability slot ${i}: Element not found`);
            }
        }
    }
    
    attachEventListeners() {
        this.queueCurrentSetupButton.addEventListener('click', () => this.addCurrentSetupToQueue());
        this.clearQueueButton.addEventListener('click', () => this.clearQueue());
        this.startQueueButton.addEventListener('click', () => this.startQueue());
        this.stopQueueButton.addEventListener('click', () => this.stopQueue());
    }
    
    // Capture the current setup and add to queue
    addCurrentSetupToQueue() {
        // Capture the current state of all inputs, selects, etc.
        const setup = this.captureCurrentSetup();
        this.queue.push(setup);
        
        // Update UI
        this.updateQueueStatus();
        this.queueStatusText.textContent = `${this.queue.length} simulation${this.queue.length > 1 ? 's' : ''} queued`;
    }
    
    captureCurrentSetup() {
        // Create a debug log for abilities
        console.log("Capturing abilities from:");
        
        // Find all ability selects dynamically instead of assuming indices
        const abilitySelects = document.querySelectorAll('select[id^="selectAbility_"]');
        const abilities = Array.from(abilitySelects).map(select => {
            const id = select.id;
            const index = id.split('_')[1]; // Extract index from selectAbility_X
            const levelInput = document.getElementById(`inputAbilityLevel_${index}`);
            
            console.log(`Found ability select: ${id}`, {
                value: select.value,
                text: select.selectedOptions[0]?.text,
                level: levelInput ? levelInput.value : "not found"
            });
            
            return {
                id: select.value,
                level: levelInput ? parseInt(levelInput.value || "1") : 1
            };
        });
        

        const setup = {
            // Levels
            levels: {
                stamina: parseInt(document.getElementById('inputLevel_stamina').value),
                intelligence: parseInt(document.getElementById('inputLevel_intelligence').value),
                attack: parseInt(document.getElementById('inputLevel_attack').value),
                power: parseInt(document.getElementById('inputLevel_power').value),
                defense: parseInt(document.getElementById('inputLevel_defense').value),
                ranged: parseInt(document.getElementById('inputLevel_ranged').value),
                magic: parseInt(document.getElementById('inputLevel_magic').value)
            },
            // Equipment
            equipment: {
                head: { 
                    id: document.getElementById('selectEquipment_head').value,
                    enhancementLevel: parseInt(document.getElementById('inputEquipmentEnhancementLevel_head').value)
                },
                body: {
                    id: document.getElementById('selectEquipment_body').value,
                    enhancementLevel: parseInt(document.getElementById('inputEquipmentEnhancementLevel_body').value)
                },
                legs: {
                    id: document.getElementById('selectEquipment_legs').value,
                    enhancementLevel: parseInt(document.getElementById('inputEquipmentEnhancementLevel_legs').value)
                },
                feet: {
                    id: document.getElementById('selectEquipment_feet').value,
                    enhancementLevel: parseInt(document.getElementById('inputEquipmentEnhancementLevel_feet').value)
                },
                hands: {
                    id: document.getElementById('selectEquipment_hands').value,
                    enhancementLevel: parseInt(document.getElementById('inputEquipmentEnhancementLevel_hands').value)
                },
                weapon: {
                    id: document.getElementById('selectEquipment_weapon').value,
                    enhancementLevel: parseInt(document.getElementById('inputEquipmentEnhancementLevel_weapon').value)
                },
                off_hand: {
                    id: document.getElementById('selectEquipment_off_hand').value,
                    enhancementLevel: parseInt(document.getElementById('inputEquipmentEnhancementLevel_off_hand').value)
                },
                pouch: {
                    id: document.getElementById('selectEquipment_pouch').value,
                    enhancementLevel: parseInt(document.getElementById('inputEquipmentEnhancementLevel_pouch').value)
                }
            },
            // Food, Drinks
            consumables: {
                food: Array.from({ length: 3 }, (_, i) => {
                    const el = document.getElementById(`selectFood_${i}`);
                    return el ? el.value : "";
                }),
                drinks: Array.from({ length: 3 }, (_, i) => {
                    const el = document.getElementById(`selectDrink_${i}`);
                    return el ? el.value : "";
                })
            },
            abilities: abilities,
            // Zone and Duration
            zone: document.getElementById('selectZone').value,
            duration: parseInt(document.getElementById('inputSimulationTime').value),
            // For display in results table
            description: this.generateSetupDescription()
        };
        
        return setup;
    }
    
    generateSetupDescription() {
        // Generate a short description of the current setup for the results table
        const weaponName = document.getElementById('selectEquipment_weapon').selectedOptions[0].text;
        const offHandName = document.getElementById('selectEquipment_off_hand').selectedOptions[0].text;
        const zoneName = document.getElementById('selectZone').selectedOptions[0].text;
        
        let equipmentDesc = weaponName !== "Empty" ? weaponName : "No weapon";
        if (offHandName !== "Empty") {
            equipmentDesc += ` + ${offHandName}`;
        }
        
        return {
            equipment: equipmentDesc,
            zone: zoneName
        };
    }
    
    clearQueue() {
        if (!this.isRunning) {
            this.queue = [];
            this.updateQueueStatus();
            this.queueStatusText.textContent = "No simulations queued";
        } else {
            alert("Cannot clear queue while simulations are running");
        }
    }
    
    startQueue() {
        if (this.queue.length === 0) {
            alert("Queue is empty. Add setups before running.");
            return;
        }
        
        if (!this.isRunning) {
            this.isRunning = true;
            this.results = [];
            this.currentIndex = 0;
            this.totalSimulations = this.queue.length;
            
            // Update UI
            this.startQueueButton.disabled = true;
            this.stopQueueButton.disabled = false;
            this.queueCurrentSetupButton.disabled = true;
            this.clearQueueButton.disabled = true;
            
            // Start processing the queue
            this.processNextInQueue();
        }
    }
    
    stopQueue() {
        this.isRunning = false;
        this.startQueueButton.disabled = false;
        this.stopQueueButton.disabled = true;
        this.queueCurrentSetupButton.disabled = false;
        this.clearQueueButton.disabled = false;
        this.queueStatusText.textContent = "Queue stopped";
    }
    
    async processNextInQueue() {
        if (!this.isRunning || this.currentIndex >= this.queue.length) {
            this.completeQueue();
            return;
        }
        
        const setup = this.queue[this.currentIndex];
        this.queueStatusText.textContent = `Running simulation ${this.currentIndex + 1} of ${this.totalSimulations}`;
        this.updateQueueProgress();
        
        // Apply the setup to the UI
        this.applySetupToUI(setup);
        
        // Run the simulation
        try {
            // Simply trigger the start button click as before
            document.getElementById('buttonStartSimulation').click();
            
            // Wait for simulation to complete
            await this.waitForSimulationComplete();
            
            // Capture the results
            const result = this.captureSimulationResults(setup);
            this.results.push(result);
            
            // Add to the results table
            this.addResultToTable(result);
        } catch (error) {
            console.error("Error during simulation:", error);
            this.results.push({
                ...setup,
                error: "Simulation failed"
            });
        }
        
        // Move to the next simulation
        this.currentIndex++;
        setTimeout(() => this.processNextInQueue(), 500);
    }
    
    applySetupToUI(setup) {
        // Levels
        for (const [key, value] of Object.entries(setup.levels)) {
            const el = document.getElementById(`inputLevel_${key}`);
            if (el) el.value = value;
        }
        
        // Equipment
        for (const [slot, item] of Object.entries(setup.equipment)) {
            const selectEl = document.getElementById(`selectEquipment_${slot}`);
            const levelEl = document.getElementById(`inputEquipmentEnhancementLevel_${slot}`);
            
            if (selectEl) selectEl.value = item.id;
            if (levelEl) levelEl.value = item.enhancementLevel;
        }
        
        // Food and drinks
        for (let i = 0; i < 3; i++) {
            const foodEl = document.getElementById(`selectFood_${i}`);
            const drinkEl = document.getElementById(`selectDrink_${i}`);
            
            if (foodEl && setup.consumables.food[i]) foodEl.value = setup.consumables.food[i];
            if (drinkEl && setup.consumables.drinks[i]) drinkEl.value = setup.consumables.drinks[i];
        }
        
        // Apply abilities using selection index from their ID
        setup.abilities.forEach((ability, i) => {
            if (!ability.id) return;
            
            // Find the correct ability select by index
            const selectEl = document.getElementById(`selectAbility_${i}`);
            const levelEl = document.getElementById(`inputAbilityLevel_${i}`);
            
            if (selectEl) selectEl.value = ability.id;
            if (levelEl) levelEl.value = ability.level;
            
            console.log(`Applied ability ${ability.id} to slot ${i}:`, {
                selectFound: !!selectEl,
                levelFound: !!levelEl,
                value: ability.id,
                level: ability.level
            });
        });
        
        // Zone and Duration
        const zoneEl = document.getElementById('selectZone');
        const durationEl = document.getElementById('inputSimulationTime');
        
        if (zoneEl) zoneEl.value = setup.zone;
        if (durationEl) durationEl.value = setup.duration;
    }
    
    waitForSimulationComplete() {
        return new Promise((resolve) => {
            const checkProgress = () => {
                // Check if the simulation progress bar is at 100%
                const progressBar = document.getElementById('simulationProgressBar');
                if (progressBar && progressBar.style.width === '100%') {
                    setTimeout(resolve, 500); // Give a little extra time for results to update
                } else {
                    setTimeout(checkProgress, 100);
                }
            };
            checkProgress();
        });
    }
    
    captureSimulationResults(setup) {
        return {
            setup: setup,
            results: {
                killsPerHour: document.getElementById('simulationResultKills').textContent,
                deathsPerHour: document.getElementById('simulationResultPlayerDeaths').textContent,
                xpPerHour: document.getElementById('simulationResultExperienceGain').textContent,
                totalDamageDone: this.extractTotalDps(),
                totalDamageTaken: this.extractTotalDamageTaken()
            }
        };
    }
    
    extractTotalDps() {
        // Extract the total DPS from the simulation results
        const damageRows = document.querySelectorAll('#simulationResultTotalDamageDone .row');
        let totalDps = 0;
        
        damageRows.forEach(row => {
            const dpsCell = row.querySelector('.col-md-2');
            if (dpsCell) {
                const dpsValue = parseFloat(dpsCell.textContent);
                if (!isNaN(dpsValue)) {
                    totalDps += dpsValue;
                }
            }
        });
        
        return totalDps.toFixed(1);
    }
    
    extractTotalDamageTaken() {
        // Extract the total damage taken from the simulation results
        const damageRows = document.querySelectorAll('#simulationResultTotalDamageTaken .row');
        let totalDamageTaken = 0;
        
        damageRows.forEach(row => {
            const dpsCell = row.querySelector('.col-md-2');
            if (dpsCell) {
                const dpsValue = parseFloat(dpsCell.textContent);
                if (!isNaN(dpsValue)) {
                    totalDamageTaken += dpsValue;
                }
            }
        });
        
        return totalDamageTaken.toFixed(1);
    }
    
    addResultToTable(result) {
        const tbody = this.queueResultsTableBody;
        const rowNum = tbody.children.length + 1;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rowNum}</td>
            <td>${result.setup.description.equipment}</td>
            <td>${this.formatAbilitiesList(result.setup.abilities)}</td>
            <td>${result.setup.description.zone}</td>
            <td>${result.results.killsPerHour}</td>
            <td>${result.results.deathsPerHour}</td>
            <td>${result.results.xpPerHour}</td>
            <td>${result.results.totalDamageDone}</td>
            <td>${result.results.totalDamageTaken}</td>
        `;
        
        tbody.appendChild(row);
    }
    
    formatAbilitiesList(abilities) {
        // Debug ability IDs
        console.log("Formatting abilities:", abilities.map(a => a.id).filter(id => id !== ""));
        
        return abilities
            .filter(ability => ability.id)
            .map(ability => {
                // Try to find the ability name from any ability select element on the page
                // This is more robust than looking for specific indices
                const allSelects = document.querySelectorAll('select[id^="selectAbility_"]');
                let abilityName = ability.id; // Default to ID if name not found
                
                for (const select of allSelects) {
                    const option = Array.from(select.options).find(opt => opt.value === ability.id);
                    if (option) {
                        abilityName = option.text;
                        break;
                    }
                }
                
                return `${abilityName} (${ability.level})`;
            })
            .join(', ');
    }
    
    completeQueue() {
        this.isRunning = false;
        this.startQueueButton.disabled = false;
        this.stopQueueButton.disabled = true;
        this.queueCurrentSetupButton.disabled = false;
        this.clearQueueButton.disabled = false;
        this.queueStatusText.textContent = `Completed ${this.results.length} simulations`;
        this.queueProgressBar.style.width = '100%';
    }
    
    updateQueueStatus() {
        const count = this.queue.length;
        this.startQueueButton.disabled = count === 0;
    }
    
    updateQueueProgress() {
        const progress = (this.currentIndex / this.totalSimulations) * 100;
        this.queueProgressBar.style.width = `${progress}%`;
    }
}

export default function initializeQueueSimulation() {
    // Wait for the DOM to load
    document.addEventListener('DOMContentLoaded', () => {
        const queueSimulation = new QueueSimulation();
        // Make it available globally for debugging
        window.queueSimulation = queueSimulation;
    });
}