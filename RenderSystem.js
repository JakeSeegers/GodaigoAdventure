// RenderSystem.js - Handles all rendering and drawing operations

class RenderSystem {
    constructor(grid) {
        this.grid = grid;
        this.ctx = grid.ctx;
        this.dirtyHexes = new Set(); // Track only hexes that need redrawing
        this.lastRenderTime = 0; // For frame rate throttling
        this.targetFPS = 60; // Target frame rate
        this.lastAnimationCount = 0; // Track if animations have changed
        
        // Challenge mode properties
        this.showGoalIndicator = false;
        this.goalSide = 'right'; // 'left', 'right', 'top', 'bottom'
        this.goalColor = 'rgba(255, 215, 0, 0.6)'; // Gold color for goal
    }
    
    // Original render method for full renders
    render() {
        // Mark all hexes as dirty to force a full redraw
        for (const [key, hex] of this.grid.hexes) {
            if (hex.revealed) {
                this.dirtyHexes.add(key);
            }
        }
        this.renderOptimized();
    }
    
    // Optimized render method
    renderOptimized() {
        const now = performance.now();
        const elapsed = now - this.lastRenderTime;
        const frameTime = 1000 / this.targetFPS;
        
        // Skip render if too soon and no urgent changes
        if (elapsed < frameTime && 
            this.grid.animationManager.animations.length === this.lastAnimationCount && 
            this.dirtyHexes.size < 5) {
            return;
        }
        
        this.lastRenderTime = now;
        this.lastAnimationCount = this.grid.animationManager.animations.length;
        
        // Clear previous canvas to prevent artifacts
        this.ctx.clearRect(0, 0, this.grid.canvas.width, this.grid.canvas.height);
        
        // Redraw all revealed hexes - more reliable than partial updates for this game
        const centerX = this.grid.canvas.width / 2;
        const centerY = this.grid.canvas.height / 2;
        
        for (const [key, hex] of this.grid.hexes) {
            if (hex.revealed) {
                const pix = this.grid.hexMath.axialToPixel(hex.q, hex.r);
                const x = centerX + pix.x;
                const y = centerY + pix.y;
                this.renderSingleHex(hex, x, y);
            }
        }
        
        // Draw water connections
        this.drawWaterConnections();
        
        // Draw goal indicator for challenge mode
        this.drawGoalIndicator(centerX, centerY);
        
        // Draw debug markers if debug mode is active
        this.grid.debugger.drawDebugMarkers(this.ctx, centerX, centerY);
        
        this.dirtyHexes.clear();
    }
    
    // Helper to render a single hex
    renderSingleHex(hex, x, y) {
        // First draw the hex background
        let fillColor = '#2a2a2a';
        const isMovable = (this.grid.mode === 'move' && this.grid.movableHexes.some(h => h.q === hex.q && h.r === hex.r));
        if (isMovable) {
            const moveCost = this.grid.movementSystem.getMovementCostFrom(this.grid.player.q, this.grid.player.r, hex.q, hex.r);
            fillColor = (moveCost === 0) ? '#1a3a2a' : '#1a2a3a';
        } else if (this.grid.mode === 'place' &&
                   this.grid.getNeighbors(this.grid.player.q, this.grid.player.r).some(n => n.q === hex.q && n.r === hex.r) &&
                   !hex.stone) {
            fillColor = '#3a2a3a';
        }
        const hasWindNeighbor = this.grid.waterMimicry.hasAdjacentStoneType(hex.q, hex.r, STONE_TYPES.WIND.name);
        if (hasWindNeighbor) {
            fillColor = this.blendColors(fillColor, STONE_TYPES.WIND.color, 0.2);
        }
        
        // Draw the base hex with filled background
        this.drawHex(x, y, this.grid.hexSize, fillColor);
        
        // Draw movable hex outline and cost ONLY if it's really movable
        if (isMovable) {
            // Find the stored movable hex info which has the correct cost
            const movableHexInfo = this.grid.movableHexes.find(h => h.q === hex.q && h.r === hex.r);
            let costDisplay;
            let outlineColor;
            
            // Use the cost from movableHexes which includes special cases like "Sacrifice"
            if (movableHexInfo) {
                if (movableHexInfo.cost === "Sacrifice") {
                    // Special case for fire stones
                    costDisplay = "Sacrifice";
                    outlineColor = STONE_TYPES.FIRE.color; // Use fire color for outline
                } else if (movableHexInfo.cost === "NeedsMoreStones") {
                    // Case where player doesn't have enough stones
                    costDisplay = "Need 2+";
                    outlineColor = "#777"; // Gray outline
                } else if (movableHexInfo.cost === 0) {
                    // Free movement (e.g., wind)
                    costDisplay = "0";
                    outlineColor = STONE_TYPES.WIND.color;
                } else {
                    // Normal AP cost
                    costDisplay = movableHexInfo.cost.toString();
                    outlineColor = '#58a4f4'; // Blue outline
                }
            } else {
                // Fallback to normal calculation (shouldn't happen)
                const moveCost = this.grid.movementSystem.getMovementCostFrom(this.grid.player.q, this.grid.player.r, hex.q, hex.r);
                costDisplay = moveCost.toString();
                outlineColor = (moveCost === 0) ? STONE_TYPES.WIND.color : '#58a4f4';
            }
            
            // Draw the outline with a thicker stroke
            this.drawHex(x, y, this.grid.hexSize, null, outlineColor, 2);
            
            // Draw the movement cost with better positioning
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Position the cost at the bottom of the hex for better visibility
            // For longer text like "Sacrifice", use a smaller font
            if (costDisplay.length > 2) {
                this.ctx.font = '9px Arial';
            }
            
            this.ctx.fillText(costDisplay, x, y + this.grid.hexSize * 0.6);
        }
        
        // Draw stone if exists
        if (hex.stone) {
            const stoneInfo = Object.values(STONE_TYPES).find(s => s.name === hex.stone);
            if (stoneInfo) {
                let fillStyle = stoneInfo.color;
                
                // Handle fire-water chain animation
                if (this.grid.fireWaterAnimation &&
                    hex.stone === STONE_TYPES.WATER.name &&
                    this.grid.fireWaterAnimation.hexes.includes(`${hex.q},${hex.r}`)) {
                    if (this.grid.fireWaterAnimation.flickerState) {
                        // Use the intensity parameter for a more dramatic effect
                        fillStyle = this.blendColors(STONE_TYPES.WATER.color, STONE_TYPES.FIRE.color, this.grid.fireWaterAnimation.intensity || 0.7);
                    }
                }
                
                // Handle fire destruction animation
                if (this.grid.fireAnimation) {
                    // If this hex is the target being destroyed
                    if (`${hex.q},${hex.r}` === this.grid.fireAnimation.targetPos) {
                        // Flickering effect
                        if (this.grid.fireAnimation.flickerState) {
                            fillStyle = this.blendColors(fillStyle, STONE_TYPES.FIRE.color, this.grid.fireAnimation.intensity || 0.7);
                            
                            // Add glowing outline for dramatic effect
                            this.drawHex(x, y, this.grid.hexSize * 0.8, null, STONE_TYPES.FIRE.color, 2);
                        }
                        
                        // Add burning particles
                        if (Math.random() > 0.5) {
                            this.drawParticles(x, y, STONE_TYPES.FIRE.color, 3);
                        }
                    }
                    
                    // If this hex is the fire causing the destruction
                    if (`${hex.q},${hex.r}` === this.grid.fireAnimation.firePos) {
                        // Pulsating effect
                        const pulseSize = 1 + 0.2 * Math.sin(Date.now() / 50);
                        this.drawHex(x, y, this.grid.hexSize * 0.8 * pulseSize, null, STONE_TYPES.FIRE.color, 2);
                    }
                }
                
                // Draw the stone symbol
                this.ctx.fillStyle = fillStyle;
                this.ctx.font = '16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(stoneInfo.symbol, x, y);
                
                // Draw water mimicry indicator
                if (hex.stone === STONE_TYPES.WATER.name) {
                    this.drawWaterMimicryIndicator(hex, x, y);
                }
                
                // Draw wind outline
                if (hex.stone === STONE_TYPES.WIND.name) {
                    this.drawHex(x, y, this.grid.hexSize * 0.8, null, STONE_TYPES.WIND.color, 1);
                }
            }
        }
        
        // Draw player if on this hex
        if (hex.q === this.grid.player.q && hex.r === this.grid.player.r) {
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.grid.hexSize / 2, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }

    // Draw water connections
    drawWaterConnections() {
        const connections = this.grid.waterMimicry.findWaterConnections();
        const centerX = this.grid.canvas.width / 2;
        const centerY = this.grid.canvas.height / 2;
        
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
    }

    // Draw water stone mimicry indicator
    drawWaterMimicryIndicator(hex, x, y) {
        let mimicked = this.grid.waterMimicry.getWaterMimicType(hex.q, hex.r);
        
        if (mimicked) {
            const stoneInfo = Object.values(STONE_TYPES).find(s => s.name === mimicked);
            this.ctx.globalAlpha = 0.5;
            this.drawHex(x, y, this.grid.hexSize / 3, stoneInfo.color);
            this.ctx.globalAlpha = 1.0;
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = stoneInfo.color;
            this.ctx.fillText(stoneInfo.symbol, x, y);
        }
    }
    
    // Draw the goal indicator for challenge mode
    drawGoalIndicator(centerX, centerY) {
        if (!this.showGoalIndicator) return;
        
        const ctx = this.ctx;
        ctx.save();
        
        // Set drawing styles
        ctx.fillStyle = this.goalColor;
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 2;
        
        // Choose which coordinates to use based on goal side
        let goalCoords = [];
        
        switch (this.goalSide) {
            case 'left':
                // Left edge
                for (let r = -this.grid.radius + 1; r <= this.grid.radius - 1; r++) {
                    const q = -this.grid.radius + 1;
                    const hex = this.grid.getHex(q, r);
                    if (hex) {
                        goalCoords.push({ q, r });
                    }
                }
                break;
            case 'right':
                // Right edge
                for (let r = -this.grid.radius + 1; r <= this.grid.radius - 1; r++) {
                    const q = this.grid.radius - 1;
                    const hex = this.grid.getHex(q, r);
                    if (hex) {
                        goalCoords.push({ q, r });
                    }
                }
                break;
            case 'top':
                // Top edge
                for (let q = -this.grid.radius + 1; q <= this.grid.radius - 1; q++) {
                    const r = -this.grid.radius + 1;
                    const hex = this.grid.getHex(q, r);
                    if (hex) {
                        goalCoords.push({ q, r });
                    }
                }
                break;
            case 'bottom':
                // Bottom edge
                for (let q = -this.grid.radius + 1; q <= this.grid.radius - 1; q++) {
                    const r = this.grid.radius - 1;
                    const hex = this.grid.getHex(q, r);
                    if (hex) {
                        goalCoords.push({ q, r });
                    }
                }
                break;
        }
        
        // Draw goal indicators
        for (const coord of goalCoords) {
            const pix = this.grid.hexMath.axialToPixel(coord.q, coord.r);
            const x = centerX + pix.x;
            const y = centerY + pix.y;
            
            // Draw a highlighted hexagon
            this.drawHex(x, y, this.grid.hexSize + 2, this.goalColor, 'rgba(255, 215, 0, 0.8)', 2);
            
            // Add a small star or flag in the center
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', x, y); // Star symbol
        }
        
        // Add a glowing effect that pulses
        const pulseSize = 1 + 0.1 * Math.sin(Date.now() / 200);
        
        // Add a "GOAL" label in the center of the goal area
        ctx.font = `bold ${Math.floor(16 * pulseSize)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
        
        // Position the label based on goal side
        let labelX = centerX;
        let labelY = centerY;
        
        switch (this.goalSide) {
            case 'left':
                labelX = centerX - (this.grid.radius * this.grid.hexSize * 1.5);
                break;
            case 'right':
                labelX = centerX + (this.grid.radius * this.grid.hexSize * 1.5);
                break;
            case 'top':
                labelY = centerY - (this.grid.radius * this.grid.hexSize * 1.5);
                break;
            case 'bottom':
                labelY = centerY + (this.grid.radius * this.grid.hexSize * 1.5);
                break;
        }
        
        // Draw glowing text
        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
        ctx.shadowBlur = 10 * pulseSize;
        ctx.fillText('GOAL', labelX, labelY);
        
        ctx.restore();
    }
    
    // Draw a hexagon
    drawHex(x, y, size, color, strokeColor = '#444', lineWidth = 1) {
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (2 * Math.PI / 6) * i;
            const xPos = x + size * Math.cos(angle);
            const yPos = y + size * Math.sin(angle);
            if (i === 0) {
                this.ctx.moveTo(xPos, yPos);
            } else {
                this.ctx.lineTo(xPos, yPos);
            }
        }
        this.ctx.closePath();
        if (color) {
            this.ctx.fillStyle = color;
            this.ctx.fill();
        }
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.stroke();
    }
    
    // Helper method to draw particle effects
    drawParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.grid.hexSize * 0.8;
            const size = 1 + Math.random() * 2;
            
            const px = x + Math.cos(angle) * distance;
            const py = y + Math.sin(angle) * distance;
            
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(px, py, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    // Blend two colors with a weight parameter
    blendColors(color1, color2, weight) {
        const parseColor = (color) => {
            if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                return [r, g, b];
            } else {
                const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                if (match) {
                    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
                }
                return [0, 0, 0];
            }
        };
        const [r1, g1, b1] = parseColor(color1);
        const [r2, g2, b2] = parseColor(color2);
        const r = Math.round(r1 * (1 - weight) + r2 * weight);
        const g = Math.round(g1 * (1 - weight) + g2 * weight);
        const b = Math.round(b1 * (1 - weight) + b2 * weight);
        return `rgb(${r}, ${g}, ${b})`;
    }
}