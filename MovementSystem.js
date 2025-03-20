// MovementSystem.js - Handles movement costs and player movement

class MovementSystem {
    constructor(grid) {
        this.grid = grid;
        this.voidAPUsed = 0; // Track how many void AP have been used this turn
    }
    
    // Returns true if the hex is in a wind zone (active wind or water mimicking wind)
    isWindZone(q, r) {
        const hex = this.grid.getHex(q, r);
        if (hex) {
            if (hex.stone === STONE_TYPES.WIND.name && this.isWindActive(hex)) {
                return true;
            }
            if (hex.stone === STONE_TYPES.WATER.name && this.grid.waterMimicry.isWaterChainMimicking(STONE_TYPES.WIND.name, q, r)) {
                return true;
            }
        }
        const neighbors = this.grid.getNeighbors(q, r);
        for (const nb of neighbors) {
            const nbHex = this.grid.getHex(nb.q, nb.r);
            if (nbHex) {
                if (nbHex.stone === STONE_TYPES.WIND.name && this.isWindActive(nbHex)) {
                    return true;
                }
                if (nbHex.stone === STONE_TYPES.WATER.name && this.grid.waterMimicry.isWaterChainMimicking(STONE_TYPES.WIND.name, nb.q, nb.r)) {
                    return true;
                }
            }
        }
        return false;
    }

    // Checks if a wind stone is active (not interfered with by an adjacent void stone)
    isWindActive(hex) {
        const neighbors = this.grid.getNeighbors(hex.q, hex.r);
        for (const nb of neighbors) {
            const nbHex = this.grid.getHex(nb.q, nb.r);
            if (nbHex && nbHex.stone === STONE_TYPES.VOID.name) {
                return false;
            }
        }
        return true;
    }

    // Returns the normal movement cost without wind zone transitions.
    getNormalMovementCost(q, r) {
        const hex = this.grid.getHex(q, r);
        if (!hex || !hex.revealed) return Infinity;
        if (!hex.stone) return 1;
        
        // Special case for water stones
        if (hex.stone === STONE_TYPES.WATER.name) {
            // Check for each adjacent stone type by priority
            
            // Water next to void should still cost 2 to move through
            // Void nullifies water's ability to mimic, not its inherent movement cost
            if (this.grid.waterMimicry.hasAdjacentStoneType(q, r, STONE_TYPES.VOID.name)) {
                return 2; // Water's normal cost
            }
            
            // Check if water is mimicking earth directly or through a chain
            if (this.grid.waterMimicry.hasAdjacentStoneType(q, r, STONE_TYPES.EARTH.name) || 
                this.grid.waterMimicry.isWaterChainMimicking(STONE_TYPES.EARTH.name, q, r)) {
                return Infinity; // Earth cost - impassable
            }
            
            // If adjacent to wind and wind is active, use wind cost
            const adjacentToWind = this.grid.waterMimicry.hasAdjacentStoneType(q, r, STONE_TYPES.WIND.name);
            if (adjacentToWind) {
                // Find an adjacent wind stone
                for (const nb of this.grid.getNeighbors(q, r)) {
                    const nbHex = this.grid.getHex(nb.q, nb.r);
                    if (nbHex && nbHex.stone === STONE_TYPES.WIND.name && this.isWindActive(nbHex)) {
                        return 0; // Wind cost
                    }
                }
            }
            
            // Check for wind mimicry through water chain
            if (this.grid.waterMimicry.isWaterChainMimicking(STONE_TYPES.WIND.name, q, r)) {
                return 0; // Wind cost through water chain
            }
            
            // If adjacent to fire, use fire cost
            if (this.grid.waterMimicry.hasAdjacentStoneType(q, r, STONE_TYPES.FIRE.name) || 
                this.grid.waterMimicry.isWaterChainMimicking(STONE_TYPES.FIRE.name, q, r)) {
                return Infinity; // Fire cost
            }
            
            // Default water cost if not mimicking anything
            return 2;
        }
        
        // Standard costs for other stone types
        const costs = {
            [STONE_TYPES.EARTH.name]: Infinity,
            [STONE_TYPES.WATER.name]: 2,
            [STONE_TYPES.FIRE.name]: Infinity,
            [STONE_TYPES.WIND.name]: 0,
            [STONE_TYPES.VOID.name]: 1
        };
        return costs[hex.stone];
    }

    // Calculates movement cost from the current hex to a destination hex,
    // considering wind zone transitions.
    getMovementCostFrom(fromQ, fromR, toQ, toR) {
        const fromInWind = this.isWindZone(fromQ, fromR);
        const toInWind = this.isWindZone(toQ, toR);
        if (fromInWind && toInWind) return 0;
        if ((!fromInWind && toInWind) || (fromInWind && !toInWind)) return 1;
        return this.getNormalMovementCost(toQ, toR);
    }

    // Get total available AP (regular AP + void stones)
    getTotalAvailableAP() {
        const currentAP = parseInt(document.getElementById('ap-count').textContent);
        const voidCount = stoneCounts[STONE_TYPES.VOID.name];
        const availableVoidAP = Math.max(0, voidCount - this.voidAPUsed);
        return { 
            regularAP: currentAP, 
            voidAP: availableVoidAP, 
            totalAP: currentAP + availableVoidAP 
        };
    }

    // Update the AP display to show both regular and void AP
    updateAPDisplay() {
        const apInfo = this.getTotalAvailableAP();
        const apCountElement = document.getElementById('ap-count');
        
        // Update the display to show both types of AP
        apCountElement.textContent = apInfo.regularAP;
        
        // Create or update the void AP indicator
        let voidAPIndicator = document.getElementById('void-ap-indicator');
        if (!voidAPIndicator) {
            voidAPIndicator = document.createElement('span');
            voidAPIndicator.id = 'void-ap-indicator';
            voidAPIndicator.style.marginLeft = '5px';
            voidAPIndicator.style.color = STONE_TYPES.VOID.color;
            apCountElement.parentNode.appendChild(voidAPIndicator);
        }
        
        if (apInfo.voidAP > 0) {
            voidAPIndicator.textContent = `+ ${apInfo.voidAP} ${STONE_TYPES.VOID.symbol}`;
            voidAPIndicator.style.display = 'inline';
        } else {
            voidAPIndicator.style.display = 'none';
        }
    }

    // Reset void AP used at the start of a turn
    resetVoidAPUsed() {
        this.voidAPUsed = 0;
        this.updateAPDisplay();
    }

    // Calculate movable hexes based on movement costs
    calculateMovableHexes() {
        this.grid.movableHexes = [];
        const neighbors = this.grid.getNeighbors(this.grid.player.q, this.grid.player.r);
        const apInfo = this.getTotalAvailableAP();
        
        for (const nb of neighbors) {
            if (!this.grid.isValidHex(nb.q, nb.r)) continue;
            
            const hex = this.grid.getHex(nb.q, nb.r);
            
            // Special case for fire stones - as long as player has 2 stones, it's movable
            if (hex && hex.stone === STONE_TYPES.FIRE.name) {
                const totalStones = Object.values(stoneCounts).reduce((sum, count) => sum + count, 0);
                if (totalStones >= 2) {
                    this.grid.movableHexes.push({ q: nb.q, r: nb.r, cost: "Sacrifice" });
                    this.grid.markHexDirty(nb.q, nb.r);
                } else {
                    // Still add to movableHexes but with a special type to handle the error message
                    this.grid.movableHexes.push({ q: nb.q, r: nb.r, cost: "NeedsMoreStones" });
                    this.grid.markHexDirty(nb.q, nb.r);
                }
                continue; // Skip normal cost calculation for fire stones
            }
            
            const cost = this.getMovementCostFrom(this.grid.player.q, this.grid.player.r, nb.q, nb.r);
            if (cost !== Infinity && cost <= apInfo.totalAP) {
                this.grid.movableHexes.push({ q: nb.q, r: nb.r, cost: cost });
                // Mark as dirty to ensure visual update
                this.grid.markHexDirty(nb.q, nb.r);
            }
        }
    }

    // Movement handler using movement cost calculation
    handlePlayerMovement(q, r) {
        // First check if it's in our movable hexes at all
        const movableHex = this.grid.movableHexes.find(h => h.q === q && h.r === r);
        if (!movableHex) {
            this.grid.updateStatus("Cannot move there.");
            return;
        }
        
        const targetHex = this.grid.getHex(q, r);
        
        // Special case for fire stones
        if (targetHex && targetHex.stone === STONE_TYPES.FIRE.name) {
            // Check if player has at least 2 stones total to sacrifice
            const totalStones = Object.values(stoneCounts).reduce((sum, count) => sum + count, 0);
            if (totalStones < 2) {
                this.grid.updateStatus(`Cannot move to fire stone. Need 2 stones to sacrifice, but only have ${totalStones}.`);
                return;
            }
            
            // Show stone sacrifice selection dialog
            this.showStoneSacrificeDialog(q, r);
            return;
        }
        
        // Check if the movableHex has a special cost indicator
        if (movableHex.cost === "Sacrifice") {
            // This is a fire stone that should be handled by the special case above
            // If we get here, something went wrong with the detection
            this.showStoneSacrificeDialog(q, r);
            return;
        } else if (movableHex.cost === "NeedsMoreStones") {
            // This is a fire stone but the player doesn't have enough stones
            const totalStones = Object.values(stoneCounts).reduce((sum, count) => sum + count, 0);
            this.grid.updateStatus(`Cannot move to fire stone. Need 2 stones to sacrifice, but only have ${totalStones}.`);
            return;
        }
        
        // Normal movement for non-fire hexes
        const cost = this.getMovementCostFrom(this.grid.player.q, this.grid.player.r, q, r);
        if (cost === Infinity) {
            this.grid.updateStatus("Hex is impassable.");
            return;
        }
        
        const apInfo = this.getTotalAvailableAP();
        if (apInfo.totalAP < cost) {
            this.grid.updateStatus(`Not enough AP (need ${cost}, have ${apInfo.totalAP} total).`);
            return;
        }
        
        // Handle AP spending
        let costRemaining = cost;
        let newRegularAP = apInfo.regularAP;
        let newVoidAPUsed = this.voidAPUsed;
        
        // First use regular AP
        if (newRegularAP >= costRemaining) {
            newRegularAP -= costRemaining;
            costRemaining = 0;
        } else {
            costRemaining -= newRegularAP;
            newRegularAP = 0;
        }
        
        // Then use void AP if needed
        if (costRemaining > 0) {
            newVoidAPUsed += costRemaining;
            costRemaining = 0;
        }
        
        // Update AP display
        document.getElementById('ap-count').textContent = newRegularAP;
        this.voidAPUsed = newVoidAPUsed;
        this.updateAPDisplay();
        
        // Track AP usage for challenge mode
        if (this.grid.challengeMode && this.grid.challengeMode.isActive) {
            let apUsed = cost;
            this.grid.challengeMode.trackAPUsage(apUsed);
        }
        
        // Mark old and new positions as dirty
        this.grid.markHexDirty(this.grid.player.q, this.grid.player.r);
        this.grid.markHexDirty(q, r);
        
        // Update player position
        this.grid.player.q = q;
        this.grid.player.r = r;
        
        // Check for mega-tile discovery if the system exists
        let tileRevealed = false;
        if (this.grid.megaTileSystem) {
            tileRevealed = this.grid.megaTileSystem.revealMegaTile(q, r);
        }
        
        // Reveal adjacent hexes
        this.revealAdjacentHexes(q, r);
        
        // Check if goal reached for challenge mode
        if (this.grid.challengeMode && this.grid.challengeMode.isActive) {
            this.grid.challengeMode.checkGoalReached();
        }
        
        // Create a message about AP usage if no tile was revealed
        if (!tileRevealed) {
            let apMessage = `Moved to (${q},${r}), cost: ${cost}`;
            if (this.voidAPUsed > 0) {
                apMessage += ` (using ${apInfo.regularAP - newRegularAP} regular AP and ${newVoidAPUsed - (this.voidAPUsed - costRemaining)} void AP)`;
            } else {
                apMessage += ` (using ${cost} regular AP)`;
            }
            
            this.grid.updateStatus(apMessage);
        }
        
        this.calculateMovableHexes();
        this.grid.renderSystem.renderOptimized();
    }

    // Create and show the stone sacrifice dialog when moving to a fire stone
    showStoneSacrificeDialog(destinationQ, destinationR) {
        // Double-check we have enough stones
        const totalStones = Object.values(stoneCounts).reduce((sum, count) => sum + count, 0);
        if (totalStones < 2) {
            this.grid.updateStatus(`Cannot move to fire stone. Need 2 stones to sacrifice, but only have ${totalStones}.`);
            return;
        }
        
        // Remove any existing dialog
        const existingDialog = document.getElementById('sacrifice-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }
        
        // Create dialog container
        const dialog = document.createElement('div');
        dialog.id = 'sacrifice-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.zIndex = '1000';
        dialog.style.backgroundColor = '#222';
        dialog.style.padding = '20px';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 0 20px rgba(237, 27, 67, 0.7)';
        dialog.style.border = '2px solid #ed1b43';
        dialog.style.width = '300px';
        
        // Add title and description
        const title = document.createElement('h3');
        title.textContent = 'Sacrifice Stones to Move';
        title.style.color = STONE_TYPES.FIRE.color;
        title.style.textAlign = 'center';
        title.style.marginTop = '0';
        dialog.appendChild(title);
        
        const description = document.createElement('p');
        description.textContent = 'Fire stones require the sacrifice of two elemental stones. Select the stones you wish to offer:';
        description.style.marginBottom = '15px';
        description.style.textAlign = 'center';
        dialog.appendChild(description);
        
        // Create selection container
        const selectionContainer = document.createElement('div');
        selectionContainer.style.display = 'flex';
        selectionContainer.style.flexDirection = 'column';
        selectionContainer.style.gap = '10px';
        dialog.appendChild(selectionContainer);
        
        // Create two selection rows
        const stoneTypes = Object.values(STONE_TYPES);
        const selections = [];
        
        for (let i = 0; i < 2; i++) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.marginBottom = '10px';
            
            const label = document.createElement('div');
            label.textContent = `Stone ${i + 1}:`;
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            row.appendChild(label);
            
            const stoneSelector = document.createElement('div');
            stoneSelector.style.display = 'flex';
            stoneSelector.style.gap = '5px';
            
            // Create stone selection buttons
            stoneTypes.forEach(stoneType => {
                if (stoneCounts[stoneType.name] > 0) {
                    // For the second stone, if the same type was selected first and only 1 remains, don't show
                    if (i === 1 && selections[0] === stoneType.name && stoneCounts[stoneType.name] <= 1) {
                        return;
                    }
                    
                    const stoneBtn = document.createElement('div');
                    stoneBtn.className = `stone-button stone-${stoneType.name}`;
                    stoneBtn.textContent = stoneType.symbol;
                    stoneBtn.dataset.stoneType = stoneType.name;
                    stoneBtn.dataset.selectionIndex = i;
                    
                    // Size match with game UI
                    stoneBtn.style.width = '30px';
                    stoneBtn.style.height = '30px';
                    stoneBtn.style.fontSize = '16px';
                    
                    // Event handler for selection
                    stoneBtn.addEventListener('click', () => {
                        // Deselect all other buttons in this row
                        row.querySelectorAll('.stone-button').forEach(btn => {
                            btn.classList.remove('selected');
                        });
                        
                        // Select this button
                        stoneBtn.classList.add('selected');
                        selections[i] = stoneType.name;
                        
                        // If this is the first selection, we need to update the second row
                        // to reflect availability
                        if (i === 0) {
                            const secondRow = selectionContainer.children[1];
                            const secondStoneType = selections[0];
                            const remainingCount = stoneCounts[secondStoneType] - 1;
                            
                            // Update the second row based on the first selection
                            secondRow.querySelectorAll('.stone-button').forEach(btn => {
                                if (btn.dataset.stoneType === secondStoneType && remainingCount === 0) {
                                    btn.style.opacity = '0.3';
                                    btn.style.cursor = 'not-allowed';
                                    btn.classList.remove('selected');
                                    
                                    // If this was previously selected, clear selection
                                    if (selections[1] === secondStoneType) {
                                        selections[1] = null;
                                    }
                                } else {
                                    btn.style.opacity = '1';
                                    btn.style.cursor = 'pointer';
                                }
                            });
                        }
                        
                        // Enable/disable confirm button
                        confirmBtn.disabled = !(selections[0] && selections[1]);
                    });
                    
                    stoneSelector.appendChild(stoneBtn);
                }
            });
            
            row.appendChild(stoneSelector);
            selectionContainer.appendChild(row);
        }
        
        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';
        buttonContainer.style.marginTop = '20px';
        dialog.appendChild(buttonContainer);
        
        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.backgroundColor = '#444';
        cancelBtn.addEventListener('click', () => {
            dialog.remove();
            const overlay = document.querySelector('.sacrifice-overlay');
            if (overlay) overlay.remove();
            this.grid.updateStatus('Movement canceled. No stones sacrificed.');
        });
        buttonContainer.appendChild(cancelBtn);
        
        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirm Sacrifice';
        confirmBtn.style.backgroundColor = STONE_TYPES.FIRE.color;
        confirmBtn.disabled = true; // Initially disabled until selections are made
        confirmBtn.addEventListener('click', () => {
            // Check if both selections are made
            if (selections[0] && selections[1]) {
                // Remove the dialog
                dialog.remove();
                const overlay = document.querySelector('.sacrifice-overlay');
                if (overlay) overlay.remove();
                
                // Decrement the stone counts
                stoneCounts[selections[0]]--;
                updateStoneCount(selections[0]);
                stoneCounts[selections[1]]--;
                updateStoneCount(selections[1]);
                
                // Update the status
                this.grid.updateStatus(`Sacrificed ${selections[0]} and ${selections[1]} stones to move onto fire.`);
                
                // Complete the movement
                this.completeFireStoneMovement(destinationQ, destinationR);
            }
        });
        buttonContainer.appendChild(confirmBtn);
        
        // Add background overlay
        const overlay = document.createElement('div');
        overlay.className = 'sacrifice-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.zIndex = '999';
        
        // Add to document
        document.body.appendChild(overlay);
        document.body.appendChild(dialog);
    }
    
    // Complete movement after stone sacrifice
    completeFireStoneMovement(q, r) {
        // Mark old and new positions as dirty
        this.grid.markHexDirty(this.grid.player.q, this.grid.player.r);
        this.grid.markHexDirty(q, r);
        
        // Move player
        this.grid.player.q = q;
        this.grid.player.r = r;
        this.revealAdjacentHexes(q, r);
        
        // Check for mega-tile discovery if the system exists
        if (this.grid.megaTileSystem) {
            this.grid.megaTileSystem.revealMegaTile(q, r);
        }
        
        // Recalculate movable hexes
        this.calculateMovableHexes();
        
        // Render changes
        this.grid.renderSystem.renderOptimized();
    }

    // Reveal hexes adjacent to the player's position
    revealAdjacentHexes(q, r) {
        const neighbors = this.grid.getNeighbors(q, r);
        for (const nb of neighbors) {
            const hex = this.grid.getHex(nb.q, nb.r);
            if (hex && !hex.revealed) {
                hex.revealed = true;
                this.grid.markHexDirty(nb.q, nb.r);
            }
        }
    }

    // Stone placement handler
    handleStonePlacement(q, r) {
        const neighbors = this.grid.getNeighbors(this.grid.player.q, this.grid.player.r);
        const isAdjacent = neighbors.some(n => n.q === q && n.r === r);
        if (isAdjacent) {
            const target = this.grid.getHex(q, r);
            if (!target.stone) {
                if (this.grid.setStone(q, r, this.grid.selectedStone.name)) {
                    decrementStoneCount(this.grid.selectedStone.name);
                    this.grid.updateStatus(`Placed ${this.grid.selectedStone.name} stone at (${q},${r})`);
                    
                    // Update AP display in case void stones were changed
                    this.updateAPDisplay();
                    
                    this.calculateMovableHexes();
                    this.grid.renderSystem.renderOptimized();
                }
            } else {
                this.grid.updateStatus(`Cannot place stone on an occupied hex.`);
            }
        } else {
            this.grid.updateStatus(`Cannot place stone on a hex that is not adjacent to you.`);
        }
    }

    // Get the AP cost to break a stone based on type
    getBreakStoneCost(stoneType) {
        const breakCosts = {
            [STONE_TYPES.VOID.name]: 1,
            [STONE_TYPES.WIND.name]: 2,
            [STONE_TYPES.FIRE.name]: 3,
            [STONE_TYPES.WATER.name]: 4,
            [STONE_TYPES.EARTH.name]: 5
        };
        return breakCosts[stoneType] || 0;
    }

    // Show confirmation dialog for breaking a stone
    showBreakConfirmDialog(q, r, stoneType, apCost) {
        // Remove any existing dialog
        const existingDialog = document.getElementById('break-confirm-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }
        
        // Create dialog container
        const dialog = document.createElement('div');
        dialog.id = 'break-confirm-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.zIndex = '1000';
        dialog.style.backgroundColor = '#222';
        dialog.style.padding = '20px';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.7)';
        dialog.style.border = '2px solid #555';
        dialog.style.width = '300px';
        
        // Get stone info for styling
        const stoneInfo = Object.values(STONE_TYPES).find(s => s.name === stoneType);
        
        // Add title and description
        const title = document.createElement('h3');
        title.textContent = `Break ${stoneType.charAt(0).toUpperCase() + stoneType.slice(1)} Stone`;
        title.style.color = stoneInfo.color;
        title.style.textAlign = 'center';
        title.style.marginTop = '0';
        dialog.appendChild(title);
        
        // Add stone symbol
        const stoneSymbol = document.createElement('div');
        stoneSymbol.className = `stone-button stone-${stoneType}`;
        stoneSymbol.textContent = stoneInfo.symbol;
        stoneSymbol.style.margin = '10px auto';
        stoneSymbol.style.width = '40px';
        stoneSymbol.style.height = '40px';
        dialog.appendChild(stoneSymbol);
        
        const description = document.createElement('p');
        description.textContent = `Are you sure you want to break this ${stoneType} stone? It will cost ${apCost} AP.`;
        description.style.marginBottom = '15px';
        description.style.textAlign = 'center';
        dialog.appendChild(description);
        
        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';
        buttonContainer.style.marginTop = '20px';
        dialog.appendChild(buttonContainer);
        
        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.backgroundColor = '#444';
        cancelBtn.addEventListener('click', () => {
            dialog.remove();
            const overlay = document.querySelector('.break-overlay');
            if (overlay) overlay.remove();
            this.grid.breakMode = false;
            document.getElementById('break-mode').classList.remove('active');
            this.grid.updateStatus('Break operation canceled.');
        });
        buttonContainer.appendChild(cancelBtn);
        
        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Break Stone';
        confirmBtn.style.backgroundColor = stoneInfo.color;
        confirmBtn.addEventListener('click', () => {
            // Remove the dialog
            dialog.remove();
            const overlay = document.querySelector('.break-overlay');
            if (overlay) overlay.remove();
            
            // Spend AP
            this.spendAPForBreak(apCost);
            
            // Remove the stone
            const hex = this.grid.getHex(q, r);
            hex.stone = null;
            this.grid.markHexDirty(q, r);
            
            // Exit break mode
            this.grid.breakMode = false;
            document.getElementById('break-mode').classList.remove('active');
            
            // Update the status
            this.grid.updateStatus(`Broke the ${stoneType} stone for ${apCost} AP.`);
            
            // Recalculate movable hexes and render
            this.calculateMovableHexes();
            this.grid.renderSystem.renderOptimized();
        });
        buttonContainer.appendChild(confirmBtn);
        
        // Add background overlay
        const overlay = document.createElement('div');
        overlay.className = 'break-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.zIndex = '999';
        
        // Add to document
        document.body.appendChild(overlay);
        document.body.appendChild(dialog);
    }

    // Spend AP to break a stone
    spendAPForBreak(apCost) {
        let costRemaining = apCost;
        let newRegularAP = parseInt(document.getElementById('ap-count').textContent);
        let newVoidAPUsed = this.voidAPUsed;
        
        // First use regular AP
        if (newRegularAP >= costRemaining) {
            newRegularAP -= costRemaining;
            costRemaining = 0;
        } else {
            costRemaining -= newRegularAP;
            newRegularAP = 0;
        }
        
        // Then use void AP if needed
        if (costRemaining > 0) {
            newVoidAPUsed += costRemaining;
            costRemaining = 0;
        }
        
        // Update AP display
        document.getElementById('ap-count').textContent = newRegularAP;
        this.voidAPUsed = newVoidAPUsed;
        this.updateAPDisplay();
        
        // Track AP usage for challenge mode
        if (this.grid.challengeMode && this.grid.challengeMode.isActive) {
            this.grid.challengeMode.trackAPUsage(apCost);
        }
    }
}