// MonsterSystem.js - Handles monster behavior and interactions

class MonsterSystem {
    constructor(grid) {
        this.grid = grid;
        this.monsters = new Map(); // Store monsters with their positions
        this.monsterTypes = {
            CHASER: {
                name: 'Chaser',
                color: '#ff4444',
                speed: 1,
                description: 'A relentless monster that chases the player'
            }
        };
        this.movesPerAP = 1; // One move per AP used
        this.movesRemaining = 0; // Moves remaining for current AP
        this.detectedMonsters = new Set(); // Track which monsters have detected the player
        this.initialized = false; // Track if monsters have been scattered
        this.maxChaseSteps = 3; // Maximum number of steps a monster will chase
    }

    // Initialize monsters by scattering them around the board
    initializeMonsters(count = 5) {
        if (this.initialized) return;
        
        // Get all valid positions (excluding player's starting position)
        const validPositions = [];
        for (let q = 0; q < this.grid.width; q++) {
            for (let r = 0; r < this.grid.height; r++) {
                if (this.grid.getHex(q, r) && !this.grid.getHex(q, r).stone) {
                    validPositions.push({ q, r });
                }
            }
        }
        
        // Shuffle valid positions
        for (let i = validPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
        }
        
        // Place monsters
        for (let i = 0; i < count && i < validPositions.length; i++) {
            const pos = validPositions[i];
            this.addMonster(pos.q, pos.r);
        }
        
        this.initialized = true;
    }

    // Check if a position is a shrine
    isShrine(q, r) {
        return this.grid.megaTileSystem && this.grid.megaTileSystem.isShrine(q, r);
    }

    // Add a monster to the grid
    addMonster(q, r, type = 'CHASER') {
        // Check if this position is a shrine
        if (!this.isShrine(q, r)) {
            console.log("Cannot add monster: Position is not a shrine");
            return null;
        }

        // Check if there's already a monster at this position
        if (this.monsters.has(`${q},${r}`)) {
            console.log("Cannot add monster: Position already has a monster");
            return null;
        }

        const monster = {
            q, r,
            type: this.monsterTypes[type],
            lastMoveTime: 0,
            hasDetectedPlayer: false,
            isVisible: false,
            chaseSteps: 0 // Track number of steps while chasing
        };
        this.monsters.set(`${q},${r}`, monster);
        this.grid.markHexDirty(q, r);
        return monster;
    }

    // Called when player uses AP (movement, breaking stones, etc.)
    onAPUsed(apAmount) {
        this.movesRemaining = this.movesPerAP * apAmount; // One move per AP used
        this.updateMonsters();
    }

    // Called when player ends their turn
    onTurnEnd() {
        this.movesRemaining = 3; // Three moves when turn ends
        this.updateMonsters();
        // Clear detected monsters set at end of turn
        this.detectedMonsters.clear();
    }

    // Move monsters towards the player
    updateMonsters() {
        const monsterArray = Array.from(this.monsters.values());
        let movesLeft = this.movesRemaining;
        
        while (movesLeft > 0) {
            // Each iteration represents one AP worth of movement
            // All monsters should move once per AP
            for (const monster of monsterArray) {
                this.moveMonsterTowardsPlayer(monster);
            }
            movesLeft--;
        }
        
        this.movesRemaining = 0; // Reset moves remaining after all moves are used
    }

    // Move a single monster towards the player
    moveMonsterTowardsPlayer(monster) {
        // Check if player is within detection radius (3 hexes)
        const distance = this.heuristic(
            { q: monster.q, r: monster.r },
            { q: this.grid.player.q, r: this.grid.player.r }
        );
        
        // If monster has already detected player and hasn't exceeded step limit
        if (monster.hasDetectedPlayer && monster.chaseSteps < this.maxChaseSteps) {
            monster.isVisible = true;
            const path = this.findPathToPlayer(monster.q, monster.r);
            if (path && path.length > 1) {
                const nextPos = path[1];
                this.moveMonster(monster, nextPos.q, nextPos.r);
                monster.chaseSteps++; // Increment chase steps
            }
        }
        // If monster has exceeded step limit, stop chasing but stay visible and move randomly
        else if (monster.hasDetectedPlayer && monster.chaseSteps >= this.maxChaseSteps) {
            monster.hasDetectedPlayer = false;
            monster.chaseSteps = 0;
            this.moveMonsterRandomly(monster);
        }
        // If monster hasn't detected player yet, check if player is in range
        else if (distance <= 3) {
            monster.hasDetectedPlayer = true;
            monster.isVisible = true;
            monster.chaseSteps = 0; // Reset chase steps when detecting player
            this.detectedMonsters.add(`${monster.q},${monster.r}`);
        }
        // If monster is visible but not chasing, move randomly
        else if (monster.isVisible) {
            this.moveMonsterRandomly(monster);
        }
    }

    // Move a monster in a random direction
    moveMonsterRandomly(monster) {
        const neighbors = this.grid.getNeighbors(monster.q, monster.r);
        if (neighbors.length > 0) {
            // Filter out positions with stones
            const validNeighbors = neighbors.filter(nb => {
                const hex = this.grid.getHex(nb.q, nb.r);
                return hex && !hex.stone;
            });
            
            if (validNeighbors.length > 0) {
                // Pick a random valid neighbor
                const randomIndex = Math.floor(Math.random() * validNeighbors.length);
                const nextPos = validNeighbors[randomIndex];
                this.moveMonster(monster, nextPos.q, nextPos.r);
            }
        }
    }

    // Find path to player using A* pathfinding
    findPathToPlayer(startQ, startR) {
        const start = { q: startQ, r: startR };
        const goal = { q: this.grid.player.q, r: this.grid.player.r };
        
        const openSet = new Set([`${start.q},${start.r}`]);
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        gScore.set(`${start.q},${start.r}`, 0);
        fScore.set(`${start.q},${start.r}`, this.heuristic(start, goal));
        
        while (openSet.size > 0) {
            let current = null;
            let lowestF = Infinity;
            
            // Find node with lowest fScore in openSet
            for (const pos of openSet) {
                const f = fScore.get(pos);
                if (f < lowestF) {
                    lowestF = f;
                    current = pos;
                }
            }
            
            if (current === `${goal.q},${goal.r}`) {
                return this.reconstructPath(cameFrom, current);
            }
            
            openSet.delete(current);
            closedSet.add(current);
            
            const [currentQ, currentR] = current.split(',').map(Number);
            const neighbors = this.grid.getNeighbors(currentQ, currentR);
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.q},${neighbor.r}`;
                if (closedSet.has(neighborKey)) continue;
                
                const tentativeGScore = gScore.get(current) + 1;
                
                if (!openSet.has(neighborKey)) {
                    openSet.add(neighborKey);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));
                    cameFrom.set(neighborKey, current);
                } else if (tentativeGScore < gScore.get(neighborKey)) {
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));
                    cameFrom.set(neighborKey, current);
                }
            }
        }
        
        return null; // No path found
    }

    // Heuristic function for A* (Manhattan distance)
    heuristic(a, b) {
        return Math.abs(a.q - b.q) + Math.abs(a.r - b.r);
    }

    // Reconstruct path from A* results
    reconstructPath(cameFrom, current) {
        const path = [current];
        while (cameFrom.has(current)) {
            current = cameFrom.get(current);
            path.unshift(current);
        }
        return path.map(pos => {
            const [q, r] = pos.split(',').map(Number);
            return { q, r };
        });
    }

    // Move a monster to a new position
    moveMonster(monster, newQ, newR) {
        // Remove from old position
        this.monsters.delete(`${monster.q},${monster.r}`);
        this.grid.markHexDirty(monster.q, monster.r);
        
        // Update position
        monster.q = newQ;
        monster.r = newR;
        
        // Add to new position
        this.monsters.set(`${newQ},${newR}`, monster);
        this.grid.markHexDirty(newQ, newR);
        
        // Check if monster caught the player
        if (newQ === this.grid.player.q && newR === this.grid.player.r) {
            this.handlePlayerCaught();
        }
    }

    // Handle when a monster catches the player
    handlePlayerCaught() {
        this.grid.gameOver("A monster caught you!");
        this.movesRemaining = 0; // Stop monster movement
    }

    // Draw monsters on the canvas
    drawMonsters(ctx, centerX, centerY) {
        for (const monster of this.monsters.values()) {
            // Only draw visible monsters
            if (!monster.isVisible) continue;

            const pix = this.grid.hexMath.axialToPixel(monster.q, monster.r);
            const x = centerX + pix.x;
            const y = centerY + pix.y;
            
            // Draw monster
            ctx.beginPath();
            ctx.moveTo(x, y);
            for (let i = 1; i <= 6; i++) {
                const angle = (i * Math.PI) / 3;
                const px = x + this.grid.hexSize * Math.cos(angle);
                const py = y + this.grid.hexSize * Math.sin(angle);
                ctx.lineTo(px, py);
            }
            ctx.closePath();
            
            // Fill with monster color
            ctx.fillStyle = monster.type.color;
            ctx.fill();
            
            // Add border
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw exclamation mark if monster has detected player but hasn't moved yet
            if (monster.hasDetectedPlayer && !this.detectedMonsters.has(`${monster.q},${monster.r}`)) {
                ctx.fillStyle = '#000';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('!', x, y - 5);
            }

            // Draw remaining chase steps only if monster is actively chasing
            if (monster.hasDetectedPlayer) {
                ctx.fillStyle = '#000';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${this.maxChaseSteps - monster.chaseSteps}`, x, y + 15);
            }
        }
    }
} 