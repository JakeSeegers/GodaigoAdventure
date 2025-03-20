// WaterMimicry.js - Handles water stone mimicry behavior and chain detection - Fixed

class WaterMimicry {
    constructor(grid) {
        this.grid = grid;
    }
    
    // Helper to find the type being mimicked by a water stone
    getWaterMimicType(q, r) {
        // Water shouldn't mimic anything if adjacent to void
        if (this.hasAdjacentStoneType(q, r, STONE_TYPES.VOID.name)) {
            return null; // Void nullifies water's mimicry ability
        }
        
        // Check adjacent stones in priority order (ranked by priority value)
        // Earth (rank 5) > Fire (rank 3) > Wind (rank 2) > Void (rank 1)
        const stoneTypes = Object.values(STONE_TYPES);
        const sortedTypes = stoneTypes.sort((a, b) => b.rank - a.rank);
        
        // Check for direct adjacency in priority order
        for (const stoneType of sortedTypes) {
            if (this.hasAdjacentStoneType(q, r, stoneType.name)) {
                return stoneType.name;
            }
        }
        
        // Check for mimicry through connected water in priority order
        for (const stoneType of sortedTypes) {
            if (stoneType.name !== STONE_TYPES.WATER.name && 
                this.isWaterChainMimicking(stoneType.name, q, r)) {
                return stoneType.name;
            }
        }
        
        return null;
    }
    
    // Check if a water stone (or chain of water stones) is connected to a stone of the given type
    isWaterChainMimicking(type, q, r) {
        const startHex = this.grid.getHex(q, r);
        if (!startHex || startHex.stone !== STONE_TYPES.WATER.name) return false;
        
        // Check if the starting water stone is adjacent to void
        // If it is, it can't mimic anything
        if (this.hasAdjacentStoneType(q, r, STONE_TYPES.VOID.name)) {
            return false;
        }
        
        let visited = new Set();
        let queue = [{ q, r }];
        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.q},${current.r}`;
            if (visited.has(key)) continue;
            visited.add(key);
            const currHex = this.grid.getHex(current.q, current.r);
            if (!currHex || !currHex.revealed) continue;
            const neighbors = this.grid.getNeighbors(current.q, current.r);
            for (const nb of neighbors) {
                const nbHex = this.grid.getHex(nb.q, nb.r);
                if (!nbHex || !nbHex.revealed) continue;
                // If an adjacent hex is of the desired type...
                if (nbHex.stone === type) {
                    // For wind, ensure it's active.
                    if (type === STONE_TYPES.WIND.name) {
                        if (this.grid.movementSystem.isWindActive(nbHex)) return true;
                    } else {
                        return true;
                    }
                }
                // Continue searching through connected water stones.
                if (nbHex.stone === STONE_TYPES.WATER.name && !visited.has(`${nb.q},${nb.r}`)) {
                    // Check if this water stone is adjacent to void
                    // If it is, don't add it to the queue (break the chain)
                    if (!this.hasAdjacentStoneType(nb.q, nb.r, STONE_TYPES.VOID.name)) {
                        queue.push(nb);
                    }
                }
            }
        }
        return false;
    }
    
    // Find all connected water stones starting from a point
    findConnectedWaterStones(startQ, startR) {
        // Find all connected water stones (BFS algorithm)
        const waterHexes = [];
        let queue = [{ q: startQ, r: startR }];
        let visited = new Set();
        
        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.q},${current.r}`;
            if (visited.has(key)) continue;
            visited.add(key);
            
            const hex = this.grid.getHex(current.q, current.r);
            if (hex && hex.stone === STONE_TYPES.WATER.name) {
                waterHexes.push({ q: current.q, r: current.r });
                
                // Skip further propagation if this water is next to void
                if (this.hasAdjacentStoneType(current.q, current.r, STONE_TYPES.VOID.name)) {
                    continue;
                }
                
                // Add adjacent water stones to queue
                for (const nb of this.grid.getNeighbors(current.q, current.r)) {
                    const nbHex = this.grid.getHex(nb.q, nb.r);
                    if (nbHex && nbHex.stone === STONE_TYPES.WATER.name && !visited.has(`${nb.q},${nb.r}`)) {
                        queue.push(nb);
                    }
                }
            }
        }
        
        return waterHexes;
    }

    // Find and prepare water stone connections for rendering
    findWaterConnections() {
        const connections = [];
        const visited = new Set();
        
        // Look through all hexes to find water stones
        for (const [key, hex] of this.grid.hexes) {
            if (!hex.revealed || hex.stone !== STONE_TYPES.WATER.name || visited.has(key)) continue;
            
            // For each unvisited water stone, find its water neighbors
            for (const nb of this.grid.getNeighbors(hex.q, hex.r)) {
                const nbHex = this.grid.getHex(nb.q, nb.r);
                const nbKey = `${nb.q},${nb.r}`;
                
                if (nbHex && nbHex.revealed && nbHex.stone === STONE_TYPES.WATER.name && !visited.has(nbKey)) {
                    // Check if either water stone is adjacent to void (breaks the chain)
                    if (this.hasAdjacentStoneType(hex.q, hex.r, STONE_TYPES.VOID.name) || 
                        this.hasAdjacentStoneType(nb.q, nb.r, STONE_TYPES.VOID.name)) {
                        continue; // Skip this connection - void breaks the chain
                    }
                    
                    // Add a connection between these two water stones
                    connections.push({
                        from: { q: hex.q, r: hex.r },
                        to: { q: nb.q, r: nb.r },
                        mimicType: this.getWaterMimicType(hex.q, hex.r)
                    });
                }
            }
            
            visited.add(key);
        }
        
        return connections;
    }
    
    // Mark all hexes in potential water chain as dirty for rendering updates
    markWaterChainAreaDirty(startQ, startR) {
        // Simple BFS to find all connected water stones and their neighbors
        let queue = [{ q: startQ, r: startR }];
        let visited = new Set();
        
        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.q},${current.r}`;
            if (visited.has(key)) continue;
            visited.add(key);
            
            const hex = this.grid.getHex(current.q, current.r);
            if (!hex) continue;
            
            // Mark this hex as dirty
            this.grid.markHexDirty(current.q, current.r);
            
            // If this is a water stone, check its neighbors
            if (hex.stone === STONE_TYPES.WATER.name) {
                // Skip further propagation if this water is next to void
                if (this.hasAdjacentStoneType(current.q, current.r, STONE_TYPES.VOID.name)) {
                    continue;
                }
                
                for (const nb of this.grid.getNeighbors(current.q, current.r)) {
                    const nbHex = this.grid.getHex(nb.q, nb.r);
                    if (nbHex && nbHex.stone === STONE_TYPES.WATER.name && !visited.has(`${nb.q},${nb.r}`)) {
                        queue.push(nb);
                    }
                }
            }
        }
    }
    
    // Utility function to check if a hex has an adjacent stone of a specific type
    hasAdjacentStoneType(q, r, stoneType) {
        for (const nb of this.grid.getNeighbors(q, r)) {
            const hex = this.grid.getHex(nb.q, nb.r);
            if (hex && hex.stone === stoneType) {
                return true;
            }
        }
        return false;
    }
    
    // Debug function to visualize water mimicry chains and their movement costs
    debugWaterMimicry() {
        console.group("Water Mimicry Debug");
        
        // Find all water stones
        const waterHexes = [];
        for (const [key, hex] of this.grid.hexes) {
            if (hex.revealed && hex.stone === STONE_TYPES.WATER.name) {
                waterHexes.push(hex);
            }
        }
        
        console.log(`Found ${waterHexes.length} water stones`);
        
        // Analyze each water stone
        for (const hex of waterHexes) {
            const mimicType = this.getWaterMimicType(hex.q, hex.r);
            const moveCost = this.grid.movementSystem.getNormalMovementCost(hex.q, hex.r);
            
            console.log(`Water at (${hex.q},${hex.r}): mimicking ${mimicType || 'nothing'}, movement cost: ${moveCost === Infinity ? 'Infinity' : moveCost}`);
            
            // Check for chain connections
            if (mimicType) {
                const chainedWater = this.findConnectedWaterStones(hex.q, hex.r);
                console.log(`  Part of a chain with ${chainedWater.length} water stones`);
                
                // Test chain connections
                const adjacentToEarth = this.hasAdjacentStoneType(hex.q, hex.r, STONE_TYPES.EARTH.name);
                const chainingEarth = this.isWaterChainMimicking(STONE_TYPES.EARTH.name, hex.q, hex.r);
                
                console.log(`  Adjacent to Earth: ${adjacentToEarth}`);
                console.log(`  Chaining Earth ability: ${chainingEarth}`);
            }
        }
        
        console.groupEnd();
        
        // Visual debugging - add markers to the grid
        this.grid.debugger.visualMarkers = [];
        
        for (const hex of waterHexes) {
            const mimicType = this.getWaterMimicType(hex.q, hex.r);
            const moveCost = this.grid.movementSystem.getNormalMovementCost(hex.q, hex.r);
            
            // Add a debug marker with the mimicked type and cost
            this.grid.debugger.visualMarkers.push({
                q: hex.q,
                r: hex.r,
                color: mimicType ? STONE_TYPES[mimicType.toUpperCase()].color : 'rgba(255, 255, 255, 0.4)',
                label: moveCost === Infinity ? '∞' : moveCost.toString()
            });
        }
        
        // Force a render to show the markers
        this.grid.renderSystem.render();
        
        return "Water mimicry debug complete. Check the console for details.";
    }
}
