// HexMath.js - Handles hex coordinate math and transformations

class HexMath {
    constructor(grid) {
        this.grid = grid;
        this.hexCache = new Map(); // Cache for hex coordinates and pixel positions
    }
    
    // Convert axial coords to pixels with caching
    axialToPixel(q, r) {
        const cacheKey = `${q},${r}`;
        if (this.hexCache.has(cacheKey)) {
            return this.hexCache.get(cacheKey);
        }
        
        const x = this.grid.hexSize * (1.5 * q);
        const y = this.grid.hexSize * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
        const result = { x, y };
        
        // Cache the result
        this.hexCache.set(cacheKey, result);
        return result;
    }

    // Convert pixel coords to axial
    pixelToAxial(x, y) {
        x = x - this.grid.canvas.width / 2;
        y = y - this.grid.canvas.height / 2;
        const q = (2 / 3 * x) / this.grid.hexSize;
        const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / this.grid.hexSize;
        return this.cubeToAxial(this.roundCube(this.axialToCube(q, r)));
    }

    // Convert axial to cube coordinates
    axialToCube(q, r) {
        return { x: q, y: -q - r, z: r };
    }

    // Convert cube to axial coordinates
    cubeToAxial(cube) {
        return { q: cube.x, r: cube.z };
    }

    // Round cube coordinates to nearest hex
    roundCube(cube) {
        let rx = Math.round(cube.x);
        let ry = Math.round(cube.y);
        let rz = Math.round(cube.z);
        const xDiff = Math.abs(rx - cube.x);
        const yDiff = Math.abs(ry - cube.y);
        const zDiff = Math.abs(rz - cube.z);
        if (xDiff > yDiff && xDiff > zDiff) {
            rx = -ry - rz;
        } else if (yDiff > zDiff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }
        return { x: rx, y: ry, z: rz };
    }
    
    // Calculate hex distance between two positions
    getDistance(q1, r1, q2, r2) {
        const cube1 = this.axialToCube(q1, r1);
        const cube2 = this.axialToCube(q2, r2);
        return Math.max(
            Math.abs(cube1.x - cube2.x),
            Math.abs(cube1.y - cube2.y),
            Math.abs(cube1.z - cube2.z)
        );
    }
    
    // Get hexes in a certain range from a center point
    getHexesInRange(centerQ, centerR, range) {
        const results = [];
        for (let q = -range; q <= range; q++) {
            for (let r = Math.max(-range, -q-range); r <= Math.min(range, -q+range); r++) {
                results.push({
                    q: centerQ + q,
                    r: centerR + r
                });
            }
        }
        return results;
    }
    
    // Get a ring of hexes at exactly a certain distance from center
    getHexRing(centerQ, centerR, radius) {
        const results = [];
        if (radius <= 0) return results;
        
        // Start at the top-right corner
        let q = centerQ;
        let r = centerR - radius;
        
        // The six directions to move in (clockwise from top-right)
        const directions = [
            {q: 1, r: -1}, // northeast
            {q: 1, r: 0},  // east
            {q: 0, r: 1},  // southeast
            {q: -1, r: 1}, // southwest
            {q: -1, r: 0}, // west
            {q: 0, r: -1}  // northwest
        ];
        
        // For each of the six sides
        for (let i = 0; i < 6; i++) {
            // Move radius steps along this side
            for (let j = 0; j < radius; j++) {
                results.push({q, r});
                q += directions[i].q;
                r += directions[i].r;
            }
        }
        
        return results;
    }
    
    // Clear the coordinate cache
    clearCache() {
        this.hexCache.clear();
    }
}