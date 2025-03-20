// HexGrid.js - Core grid functionality with MegaTile system integrated

class HexGrid {
    constructor(canvas, radius = 12) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.radius = radius;
        this.hexSize = 24;
        this.hexes = new Map();
        this.player = { q: 0, r: 0 };
        this.selectedStone = null;
        this.challengeMode = new ChallengeMode(this);
        this.mode = 'move';
        this.breakMode = false; // Track if we're in break mode
        this.movableHexes = [];
        this.isGameOver = false; // Add game over state
        
        // Animation state properties (linked from renderSystem)
        this.fireWaterAnimation = null;
        this.fireAnimation = null;
        
        // Initialize subsystems in the correct order (dependencies first)
        this.hexMath = new HexMath(this);
        this.animationManager = new AnimationManager();
        this.debugger = new InteractionDebugger(this);
        this.renderSystem = new RenderSystem(this);
        this.waterMimicry = new WaterMimicry(this);
        this.movementSystem = new MovementSystem(this);
        this.testSystem = new TestSystem(this);
        this.interactionSystem = new StoneInteractionSystem(this);
        this.megaTileSystem = new MegaTileSystem(this); // Add MegaTile system
        this.panningSystem = new PanningSystem(this); // Initialize panning system
        this.monsterSystem = new MonsterSystem(this); // Initialize monster system
        
        // Initialize the grid
        this.createGrid();
        
        // Initialize mega-tiles
        this.megaTileSystem.initializeMegaTiles();
        
        // Add some initial monsters - moved to after mega-tile initialization
        setTimeout(() => {
            this.addInitialMonsters();
        }, 0);
        
        // Set up event listeners
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        
        // The keydown listener is now handled in main.js to avoid multiple listeners
        
        // Initial setup
        this.movementSystem.calculateMovableHexes();
        this.renderSystem.render();
        
        // Store grid reference on canvas for debugging
        canvas._hexGrid = this;
        
        // Set up event handlers in main.js (new for start menu integration)
        if (typeof window.setupGameEventHandlers === 'function') {
            window.setupGameEventHandlers(this);
        }
        
        // Add mega-tile 'M' key shortcut for debugging
        this.addMegaTileDebugShortcut();
        
        // Patch render methods to draw mega-tiles
        this.patchRenderMethods();
        
        // Patch the end turn button for shrine activation
        this.patchEndTurnButton();
    }
    
    // Create the hexagonal grid with the specified radius
    createGrid() {
        for (let q = -this.radius; q <= this.radius; q++) {
            const r1 = Math.max(-this.radius, -q - this.radius);
            const r2 = Math.min(this.radius, -q + this.radius);
            for (let r = r1; r <= r2; r++) {
                const key = `${q},${r}`;
                this.hexes.set(key, {
                    q, r,
                    stone: null,
                    revealed: (Math.abs(q) < 7 && Math.abs(r) < 7) // Increased initial revealed area
                });
            }
        }
    }
    
    // Get a hex at the specified coordinates
    getHex(q, r) {
        return this.hexes.get(`${q},${r}`);
    }
    
    // Check if a hex is valid and revealed
    isValidHex(q, r) {
        const hex = this.hexes.get(`${q},${r}`);
        return hex && hex.revealed;
    }
    
    // Get neighboring hex coordinates
    getNeighbors(q, r) {
        const dirs = [
            { q: 1, r: 0 },
            { q: 1, r: -1 },
            { q: 0, r: -1 },
            { q: -1, r: 0 },
            { q: -1, r: 1 },
            { q: 0, r: 1 }
        ];
        return dirs.map(dir => ({ q: q + dir.q, r: r + dir.r }));
    }
    
    // Place a stone on the grid
    setStone(q, r, stoneType) {
        const hex = this.getHex(q, r);
        if (hex) {
            // Don't prevent placing on mega-tiles - this allows stones on mega-tiles
            const oldStone = hex.stone;
            hex.stone = stoneType;
            
            // Mark this hex and its extended neighborhood as dirty
            this.markHexDirty(q, r);
            
            // Mark potential chain reaction area as dirty for water stones
            if (stoneType === STONE_TYPES.WATER.name || oldStone === STONE_TYPES.WATER.name) {
                this.waterMimicry.markWaterChainAreaDirty(q, r);
            }
            
            this.processStoneInteractions(q, r);
            this.renderSystem.renderOptimized();
            return true;
        }
        return false;
    }
    
    // Process interactions for a stone placement
    processStoneInteractions(q, r) {
        this.interactionSystem.processInteraction(q, r);
    }
    
    // Mark a hex and its neighbors as needing redraw
    markHexDirty(q, r) {
        const key = `${q},${r}`;
        this.renderSystem.dirtyHexes.add(key);
        
        // Also mark neighbors as dirty (for effects that spill over)
        const neighbors = this.getNeighbors(q, r);
        for (const nb of neighbors) {
            const nbKey = `${nb.q},${nb.r}`;
            this.renderSystem.dirtyHexes.add(nbKey);
        }
    }
    
    // Handle mouse clicks on the canvas - updated for panning
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;
        
        // Use panning system to convert screen coordinates to grid coordinates
        const axial = this.panningSystem.screenToGrid(screenX, screenY);
        const q = Math.round(axial.q);
        const r = Math.round(axial.r);
        
        if (!this.isValidHex(q, r)) return;
        
        // Only process click if we're not currently panning
        if (!this.panningSystem.isPanning) {
            if (this.breakMode) {
                this.handleBreakStone(q, r);
            } else if (this.mode === 'place' && this.selectedStone) {
                this.movementSystem.handleStonePlacement(q, r);
            } else if (this.mode === 'move') {
                this.handlePlayerMovement(q, r);
            }
        }
    }
    
    // Handle breaking a stone
    handleBreakStone(q, r) {
        const hex = this.getHex(q, r);
        if (!hex || !hex.stone) {
            this.updateStatus("No stone to break at this location.");
            return;
        }
        
        // Check if the stone is revealed and in range
        if (!hex.revealed) {
            this.updateStatus("Cannot break unrevealed stones.");
            return;
        }
        
        // Check if the stone is adjacent to the player
        const isAdjacent = this.getNeighbors(this.player.q, this.player.r)
            .some(nb => nb.q === q && nb.r === r);
        if (!isAdjacent) {
            this.updateStatus("You can only break adjacent stones.");
            return;
        }
        
        // Get AP cost based on stone type
        const stoneType = hex.stone;
        const apCost = this.movementSystem.getBreakStoneCost(stoneType);
        
        // Check if player has enough AP
        const apInfo = this.movementSystem.getTotalAvailableAP();
        if (apInfo.totalAP < apCost) {
            this.updateStatus(`Not enough AP to break this ${stoneType} stone. Need ${apCost}, have ${apInfo.totalAP}.`);
            return;
        }
        
        // Show confirmation dialog
        this.movementSystem.showBreakConfirmDialog(q, r, stoneType, apCost);
    }
    
    // Enhanced to handle mega-tile discovery and fire stone movement
    handlePlayerMovement(q, r) {
        if (this.isGameOver) {
            this.updateStatus("Game Over! Press F5 to restart.");
            return;
        }
        
        const movableHex = this.movableHexes.find(h => h.q === q && h.r === r);
        if (!movableHex) {
            this.updateStatus("Cannot move there.");
            return;
        }
        
        const targetHex = this.getHex(q, r);
        
        // Special case for fire stones - Delegate to the movementSystem
        if (targetHex && targetHex.stone === STONE_TYPES.FIRE.name) {
            // Check if player has at least 2 stones total to sacrifice
            const totalStones = Object.values(stoneCounts).reduce((sum, count) => sum + count, 0);
            if (totalStones < 2) {
                this.updateStatus(`Cannot move to fire stone. Need 2 stones to sacrifice, but only have ${totalStones}.`);
                return;
            }
            
            // Show stone sacrifice selection dialog from movement system
            this.movementSystem.showStoneSacrificeDialog(q, r);
            return;
        }
        
        // Check if the movableHex has a special cost indicator
        if (movableHex.cost === "Sacrifice") {
            // This is a fire stone that should be handled by the special case above
            this.movementSystem.showStoneSacrificeDialog(q, r);
            return;
        } else if (movableHex.cost === "NeedsMoreStones") {
            // This is a fire stone but the player doesn't have enough stones
            const totalStones = Object.values(stoneCounts).reduce((sum, count) => sum + count, 0);
            this.updateStatus(`Cannot move to fire stone. Need 2 stones to sacrifice, but only have ${totalStones}.`);
            return;
        }
        
        const cost = this.movementSystem.getMovementCostFrom(this.player.q, this.player.r, q, r);
        if (cost === Infinity) {
            this.updateStatus("Hex is impassable.");
            return;
        }
        
        const apInfo = this.movementSystem.getTotalAvailableAP();
        if (apInfo.totalAP < cost) {
            this.updateStatus(`Not enough AP (need ${cost}, have ${apInfo.totalAP} total).`);
            return;
        }
        
        // Spend AP
        let costRemaining = cost;
        let newRegularAP = apInfo.regularAP;
        let newVoidAPUsed = this.movementSystem.voidAPUsed;
        
        if (newRegularAP >= costRemaining) {
            newRegularAP -= costRemaining;
            costRemaining = 0;
        } else {
            costRemaining -= newRegularAP;
            newRegularAP = 0;
        }
        
        if (costRemaining > 0) {
            newVoidAPUsed += costRemaining;
        }
        
        // Update AP display
        document.getElementById('ap-count').textContent = newRegularAP;
        this.movementSystem.voidAPUsed = newVoidAPUsed;
        this.movementSystem.updateAPDisplay();
        
        // Track AP usage for challenge mode
        if (this.challengeMode && this.challengeMode.isActive) {
            let apUsed = cost;
            this.challengeMode.trackAPUsage(apUsed);
        }
        
        // Mark hexes as dirty
        this.markHexDirty(this.player.q, this.player.r);
        this.markHexDirty(q, r);
        
        // Update player position
        this.player.q = q;
        this.player.r = r;
        
        // Check for mega-tile discovery
        let tileRevealed = false;
        if (this.megaTileSystem) {
            tileRevealed = this.megaTileSystem.revealMegaTile(q, r);
        }
        
        // Reveal adjacent hexes
        this.movementSystem.revealAdjacentHexes(q, r);
        
        // Check if goal reached for challenge mode
        if (this.challengeMode && this.challengeMode.isActive) {
            this.challengeMode.checkGoalReached();
        }
        
        // Create movement message if no tile was revealed
        if (!tileRevealed) {
            let apMessage = `Moved to (${q},${r}), cost: ${cost}`;
            if (this.movementSystem.voidAPUsed > 0) {
                apMessage += ` (using ${apInfo.regularAP - newRegularAP} regular AP and ${newVoidAPUsed - (this.movementSystem.voidAPUsed - costRemaining)} void AP)`;
            } else {
                apMessage += ` (using ${cost} regular AP)`;
            }
            this.updateStatus(apMessage);
        }
        
        // Recalculate movable hexes and render
        this.movementSystem.calculateMovableHexes();
        this.renderSystem.renderOptimized();

        // Move monsters after player uses AP
        if (this.monsterSystem) {
            this.monsterSystem.onAPUsed(cost);
        }
    }
    
    // Add methods for panning functionality
    resetView() {
        this.panningSystem.resetView();
        // Recenter on the player if they're outside the view
        this.centerOnPlayer();
    }
    
    centerOnPlayer() {
        if (this.player) {
            this.panningSystem.offsetX = 0;
            this.panningSystem.offsetY = 0;
            this.renderSystem.render();
        }
    }
    
    // Handle keyboard input - now handled in main.js for integration with start menu
    handleKeyDown(e) {
        // Add Home key shortcut for centering on player
        if (e.key === 'Home') {
            this.centerOnPlayer();
        }
    }
    
    // Update the status message
    updateStatus(message) {
        document.getElementById('status').textContent = message;
    }
    
    // Trigger water-fire chain reaction from the core interface
    triggerWaterFireChainReaction(startQ, startR) {
        this.interactionSystem.triggerWaterFireChainReaction(startQ, startR);
    }
    
    // MEGA-TILE INTEGRATION METHODS
    
    // Add keyboard shortcut for revealing mega-tiles
    addMegaTileDebugShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'M' || e.key === 'm') {
                if (this.megaTileSystem) {
                    const count = this.megaTileSystem.revealAllMegaTiles();
                    this.updateStatus(`Revealed all ${count} mega-tiles for debugging.`);
                    this.renderSystem.render();
                }
            }
        });
    }
    
    // Patch render methods to draw mega-tiles and support panning
    patchRenderMethods() {
        // Store original render method
        const originalRender = this.renderSystem.render;
        
        // Replace with enhanced version
        this.renderSystem.render = function() {
            // Clear the entire canvas before drawing
            this.ctx.clearRect(0, 0, this.grid.canvas.width, this.grid.canvas.height);
            
            // Get adjusted center position from panning system
            const viewCenter = this.grid.panningSystem ? {
                x: this.grid.canvas.width / 2 + this.grid.panningSystem.offsetX,
                y: this.grid.canvas.height / 2 + this.grid.panningSystem.offsetY
            } : {
                x: this.grid.canvas.width / 2,
                y: this.grid.canvas.height / 2
            };
            
            // Draw all revealed hexes
            for (const [key, hex] of this.grid.hexes) {
                if (hex.revealed) {
                    const pix = this.grid.hexMath.axialToPixel(hex.q, hex.r);
                    const x = viewCenter.x + pix.x;
                    const y = viewCenter.y + pix.y;
                    
                    // Only render hexes that are visible on screen (optimization)
                    if (x > -this.grid.hexSize * 2 && x < this.grid.canvas.width + this.grid.hexSize * 2 &&
                        y > -this.grid.hexSize * 2 && y < this.grid.canvas.height + this.grid.hexSize * 2) {
                        this.renderSingleHex(hex, x, y);
                    }
                }
            }
            
            // Draw water connections
            this.drawWaterConnections(viewCenter.x, viewCenter.y);
            
            // Draw goal indicator for challenge mode
            this.drawGoalIndicator(viewCenter.x, viewCenter.y);
            
            // Draw debug markers if debug mode is active
            this.grid.debugger.drawDebugMarkers(this.ctx, viewCenter.x, viewCenter.y);
            
            // Draw mega-tiles
            if (this.grid.megaTileSystem) {
                this.grid.megaTileSystem.drawMegaTiles(this.ctx, viewCenter.x, viewCenter.y);
            }

            // Draw monsters
            if (this.grid.monsterSystem) {
                this.grid.monsterSystem.drawMonsters(this.ctx, viewCenter.x, viewCenter.y);
            }
            
            // Clear dirty hexes
            this.dirtyHexes.clear();
        };
        
        // Store original optimized render method
        const originalRenderOptimized = this.renderSystem.renderOptimized;
        
        // Replace with enhanced version
        this.renderSystem.renderOptimized = function() {
            const now = performance.now();
            const elapsed = now - this.lastRenderTime;
            const frameTime = 1000 / this.targetFPS;
            
            // Skip render if too soon and no urgent changes
            if (elapsed < frameTime && 
                this.grid.animationManager.animations.length === this.lastAnimationCount && 
                this.dirtyHexes.size < 5 &&
                !this.grid.panningSystem.isPanning) {  // Force render during panning
                return;
            }
            
            this.lastRenderTime = now;
            this.lastAnimationCount = this.grid.animationManager.animations.length;
            
            // Use the full render method instead of partial updates when panning
            if (this.grid.panningSystem.isPanning || this.dirtyHexes.size > 10) {
                this.render();
                return;
            }
            
            // Get adjusted center position from panning system
            const viewCenter = this.grid.panningSystem ? {
                x: this.grid.canvas.width / 2 + this.grid.panningSystem.offsetX,
                y: this.grid.canvas.height / 2 + this.grid.panningSystem.offsetY
            } : {
                x: this.grid.canvas.width / 2,
                y: this.grid.canvas.height / 2
            };
            
            // Clear previous canvas to prevent artifacts
            this.ctx.clearRect(0, 0, this.grid.canvas.width, this.grid.canvas.height);
            
            // Redraw all revealed hexes - more reliable than partial updates for this game
            for (const [key, hex] of this.grid.hexes) {
                if (hex.revealed) {
                    const pix = this.grid.hexMath.axialToPixel(hex.q, hex.r);
                    const x = viewCenter.x + pix.x;
                    const y = viewCenter.y + pix.y;
                    
                    // Only render hexes that are visible on screen
                    if (x > -this.grid.hexSize * 2 && x < this.grid.canvas.width + this.grid.hexSize * 2 &&
                        y > -this.grid.hexSize * 2 && y < this.grid.canvas.height + this.grid.hexSize * 2) {
                        this.renderSingleHex(hex, x, y);
                    }
                }
            }
            
            // Draw water connections
            this.drawWaterConnections(viewCenter.x, viewCenter.y);
            
            // Draw goal indicator for challenge mode
            this.drawGoalIndicator(viewCenter.x, viewCenter.y);
            
            // Draw debug markers if debug mode is active
            this.grid.debugger.drawDebugMarkers(this.ctx, viewCenter.x, viewCenter.y);
            
            // Draw mega-tiles
            if (this.grid.megaTileSystem) {
                this.grid.megaTileSystem.drawMegaTiles(this.ctx, viewCenter.x, viewCenter.y);
            }

            // Draw monsters
            if (this.grid.monsterSystem) {
                this.grid.monsterSystem.drawMonsters(this.ctx, viewCenter.x, viewCenter.y);
            }
            
            this.dirtyHexes.clear();
        };
        
        // Update the water connections method to account for panning
        this.renderSystem.drawWaterConnections = function(centerX, centerY) {
            const connections = this.grid.waterMimicry.findWaterConnections();
            
            this.ctx.save(); // Save current context state
            
            // Use a wider line to make connections more visible
            this.ctx.lineWidth = 3;
            
            for (const conn of connections) {
                const fromPix = this.grid.hexMath.axialToPixel(conn.from.q, conn.from.r);
                const toPix = this.grid.hexMath.axialToPixel(conn.to.q, conn.to.r);
                
                const x1 = centerX + fromPix.x;
                const y1 = centerY + fromPix.y;
                const x2 = centerX + toPix.x;
                const y2 = centerY + toPix.y;
                
                // Draw connection line
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                
                // Set line style based on mimic type
                if (conn.mimicType) {
                    const stoneInfo = Object.values(STONE_TYPES).find(s => s.name === conn.mimicType);
                    if (stoneInfo) {
                        this.ctx.strokeStyle = stoneInfo.color;
                        this.ctx.setLineDash([5, 3]); // Dashed line for mimicry
                    } else {
                        this.ctx.strokeStyle = STONE_TYPES.WATER.color;
                        this.ctx.setLineDash([]); // Solid line for no mimicry
                    }
                } else {
                    this.ctx.strokeStyle = STONE_TYPES.WATER.color;
                    this.ctx.setLineDash([]); // Solid line for no mimicry
                }
                
                this.ctx.globalAlpha = 0.7; // Make connections slightly more visible
                this.ctx.stroke();
            }
            
            this.ctx.restore(); // Restore context to previous state
        };
    }
    
    // Patch the end turn button to check for shrine activation
    patchEndTurnButton() {
        // Function to actually patch the button once it exists
        const doPatch = () => {
            const endTurnButton = document.getElementById('end-turn');
            if (!endTurnButton) {
                // Button not found yet, try again later
                setTimeout(doPatch, 1000);
                return;
            }
            
            // Store original handler
            const originalOnClick = endTurnButton.onclick;
            
            // Add our handler
            endTurnButton.onclick = (event) => {
                // Check for shrine activation
                if (this.megaTileSystem) {
                    this.megaTileSystem.checkForShrineActivation();
                }
                
                // Call original handler
                if (typeof originalOnClick === 'function') {
                    return originalOnClick.call(endTurnButton, event);
                }
            };
        };
        
        // Start the patching process
        setTimeout(doPatch, 1000);
    }

    // Add initial monsters to the grid
    addInitialMonsters() {
        // Get all shrine positions from megaTileSystem
        if (this.megaTileSystem && this.megaTileSystem.megaTiles) {
            // Add one monster at each shrine
            for (const [key, megaTile] of Object.entries(this.megaTileSystem.megaTiles)) {
                if (megaTile && megaTile.center) {
                    this.monsterSystem.addMonster(megaTile.center.q, megaTile.center.r, 'CHASER');
                }
            }
        }
    }

    // Add game over method
    gameOver(message) {
        this.isGameOver = true;
        this.updateStatus(message);
        
        // Draw game over message in the center of the screen
        const ctx = this.canvas.getContext('2d');
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);
        
        ctx.font = '24px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2 + 30);
        ctx.restore();
    }
}