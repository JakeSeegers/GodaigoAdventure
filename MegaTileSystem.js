// MegaTileSystem.js - Handles mega-tiles with shrines at their centers

class MegaTileSystem {
    constructor(grid) {
        this.grid = grid;
        this.megaTiles = [];
        this.revealedTiles = new Set(); // Track which mega-tiles have been revealed
        this.lastUsedShrine = null; // Track the last shrine used to prevent double-activation in the same turn
        
        // Define elemental tile types
        this.tileTypes = {
            'earth': {
                color: '#69d83a',
                backgroundColor: '#233a23',
                shrineSymbol: '🏔️',
                glowColor: 'rgba(105, 216, 58, 0.5)',
                stoneType: STONE_TYPES.EARTH.name,
                rewardAmount: 5
            },
            'water': {
                color: '#5894f4',
                backgroundColor: '#1e2c4a',
                shrineSymbol: '🌊',
                glowColor: 'rgba(88, 148, 244, 0.5)',
                stoneType: STONE_TYPES.WATER.name,
                rewardAmount: 4
            },
            'fire': {
                color: '#ed1b43',
                backgroundColor: '#3a1a1a',
                shrineSymbol: '🔥',
                glowColor: 'rgba(237, 27, 67, 0.5)',
                stoneType: STONE_TYPES.FIRE.name,
                rewardAmount: 3
            },
            'wind': {
                color: '#ffce00',
                backgroundColor: '#3a3000',
                shrineSymbol: '💨',
                glowColor: 'rgba(255, 206, 0, 0.5)',
                stoneType: STONE_TYPES.WIND.name,
                rewardAmount: 2
            },
            'void': {
                color: '#9458f4',
                backgroundColor: '#2a1e3a',
                shrineSymbol: '✨',
                glowColor: 'rgba(148, 88, 244, 0.5)',
                stoneType: STONE_TYPES.VOID.name,
                rewardAmount: 1
            }
        };
        
        // Size of mega-tiles (radius in hexes from center)
        this.megaTileRadius = 2;
    }
    
    // Initialize the mega-tile grid
    initializeMegaTiles() {
        this.megaTiles = [];
        this.revealedTiles = new Set();
        this.lastUsedShrine = null;
        
        // Determine how many mega-tiles to place based on grid size
        const gridRadius = this.grid.radius;
        const megaTilesPerType = 2; // Number of each elemental tile type
        
        // Calculate potential mega-tile center positions
        const potentialCenters = this.calculateMegaTileCenters(gridRadius);
        
        if (potentialCenters.length === 0) {
            console.error("Not enough space for mega-tiles");
            return;
        }
        
        // Shuffle potential centers
        this.shuffleArray(potentialCenters);
        
        // Place each type of mega-tile
        const tileTypes = Object.keys(this.tileTypes);
        let placedCount = 0;
        
        for (let type of tileTypes) {
            for (let i = 0; i < megaTilesPerType; i++) {
                if (placedCount < potentialCenters.length) {
                    const center = potentialCenters[placedCount];
                    this.createMegaTile(center.q, center.r, type);
                    placedCount++;
                }
            }
        }
        
        console.log(`Created ${this.megaTiles.length} mega-tiles`);
    }
    
    // Calculate potential mega-tile center positions
    calculateMegaTileCenters(gridRadius) {
        const centers = [];
        const spacing = this.megaTileRadius * 2;
        
        // We want to place mega-tiles in a way that they don't overlap
        // For simplicity, we'll place them in a grid pattern with spacing
        for (let q = -gridRadius + spacing; q <= gridRadius - spacing; q += spacing) {
            for (let r = -gridRadius + spacing; r <= gridRadius - spacing; r += spacing) {
                // Skip if q + r is too large (keeps the grid more hexagonal)
                if (Math.abs(q + r) <= gridRadius - spacing) {
                    centers.push({ q, r });
                }
            }
        }
        
        return centers;
    }
    
    // Create a mega-tile centered at (q,r) with the given type
    createMegaTile(centerQ, centerR, type) {
        const hexes = this.getHexesInMegaTile(centerQ, centerR);
        
        const megaTile = {
            center: { q: centerQ, r: centerR },
            type: type,
            hexes: hexes,
            revealed: false,
            lastActivatedTurn: -1 // Track when this shrine was last activated
        };
        
        this.megaTiles.push(megaTile);
        
        // Mark all hexes as being part of this mega-tile
        for (const hex of hexes) {
            const hexObj = this.grid.getHex(hex.q, hex.r);
            if (hexObj) {
                hexObj.megaTileIndex = this.megaTiles.length - 1;
            }
        }
    }
    
    // Get all hexes that form a mega-tile centered at (q,r)
    getHexesInMegaTile(centerQ, centerR) {
        return this.grid.hexMath.getHexesInRange(centerQ, centerR, this.megaTileRadius);
    }
    
    // Check if a hex is part of a mega-tile
    isHexInMegaTile(q, r) {
        const hex = this.grid.getHex(q, r);
        return hex && hex.megaTileIndex !== undefined;
    }
    
    // Check if a hex is specifically a shrine (center of a mega-tile)
    isShrine(q, r) {
        for (const megaTile of this.megaTiles) {
            if (megaTile.center.q === q && megaTile.center.r === r) {
                return true;
            }
        }
        return false;
    }
    
    // Get the mega-tile that a hex belongs to
    getMegaTileForHex(q, r) {
        const hex = this.grid.getHex(q, r);
        if (hex && hex.megaTileIndex !== undefined) {
            return this.megaTiles[hex.megaTileIndex];
        }
        return null;
    }
    
    // Reveal a mega-tile when a player steps on any of its hexes
    revealMegaTile(q, r) {
        const megaTile = this.getMegaTileForHex(q, r);
        if (!megaTile || megaTile.revealed) return false;
        
        megaTile.revealed = true;
        this.revealedTiles.add(this.megaTiles.indexOf(megaTile));
        
        // Mark all hexes in this mega-tile as dirty for rendering
        for (const hex of megaTile.hexes) {
            this.grid.markHexDirty(hex.q, hex.r);
        }
        
        // Play reveal animation
        this.playMegaTileRevealAnimation(megaTile);
        
        // Update status with information about the discovered tile
        const tileInfo = this.tileTypes[megaTile.type];
        this.grid.updateStatus(`Discovered ${megaTile.type.charAt(0).toUpperCase() + megaTile.type.slice(1)} Tile with a ${tileInfo.shrineSymbol} Shrine in its center!`);
        
        return true;
    }
    
    // Check if a mega-tile is revealed
    isMegaTileRevealed(megaTile) {
        if (!megaTile) return false;
        return megaTile.revealed;
    }
    
    // Check if the player is on a shrine hex
    isPlayerOnShrine() {
        const { q, r } = this.grid.player;
        
        // Check if the player is at the center of a revealed mega-tile
        for (const megaTile of this.megaTiles) {
            if (megaTile.revealed && 
                megaTile.center.q === q && 
                megaTile.center.r === r) {
                return megaTile;
            }
        }
        
        return null;
    }
    
    // Handle player movement to check for mega-tile discovery
    handlePlayerMovement(q, r) {
        // Check if player moved onto a mega-tile hex
        this.revealMegaTile(q, r);
    }
    
    // Get the current game turn count (approximate based on AP and actions)
    getCurrentTurn() {
        // This is a simplification - in a real game you might track turn number directly
        return Date.now(); // Using timestamp as a unique identifier for turn
    }
    
    // Handle activation of a shrine when the player ends turn on it
    activateShrine(megaTile) {
        if (!megaTile || !megaTile.revealed) return false;
        
        // Get current turn
        const currentTurn = this.getCurrentTurn();
        
        // If this is the same shrine the player just activated, don't activate again
        // But make the window much smaller to prevent accidental double-activation
        if (this.lastUsedShrine === megaTile && 
            currentTurn - megaTile.lastActivatedTurn < 100) { // reduced from 1000ms to 100ms
            console.log("Shrine already activated recently");
            return false;
        }
        
        // Update the last activated turn and last used shrine
        megaTile.lastActivatedTurn = currentTurn;
        this.lastUsedShrine = megaTile;
        
        // Give player the stones for this tile type
        const tileInfo = this.tileTypes[megaTile.type];
        const stonesGained = this.givePlayerStones(tileInfo.stoneType, tileInfo.rewardAmount);
        
        // Only play activation effect if stones were gained
        if (stonesGained > 0) {
            // Play activation effect with the actual number of stones gained
            this.playShrineActivationEffect(megaTile, stonesGained);
        }
        
        return stonesGained > 0;
    }
    
    // Check if the player is ending their turn on a shrine
    checkForShrineActivation() {
        const shrineUnderPlayer = this.isPlayerOnShrine();
        if (shrineUnderPlayer) {
            return this.activateShrine(shrineUnderPlayer);
        }
        return false;
    }
    
    // Give the player stones, respecting the maximum capacity
    givePlayerStones(stoneType, amount) {
        const currentCount = stoneCounts[stoneType];
        const capacity = stoneCapacity[stoneType];
        
        // Calculate how many stones can be added without exceeding capacity
        const actualAmount = Math.min(amount, capacity - currentCount);
        
        if (actualAmount <= 0) {
            this.grid.updateStatus(`Shrine activated, but your ${stoneType} stone capacity is full!`);
            return 0;
        }
        
        // Add stones
        stoneCounts[stoneType] += actualAmount;
        
        // Update the UI
        updateStoneCount(stoneType);
        
        // Update void AP display if void stones were given
        if (stoneType === STONE_TYPES.VOID.name) {
            this.grid.movementSystem.updateAPDisplay();
        }
        
        this.grid.updateStatus(`Shrine activated! Gained ${actualAmount} ${stoneType} stone${actualAmount !== 1 ? 's' : ''}.`);
        
        return actualAmount;
    }
    
    // Play animation for mega-tile reveal
    playMegaTileRevealAnimation(megaTile) {
        // Create visual indicator
        const tileInfo = this.tileTypes[megaTile.type];
        
        // Get the center position for the animation
        const pix = this.grid.hexMath.axialToPixel(megaTile.center.q, megaTile.center.r);
        const centerX = this.grid.canvas.width / 2 + pix.x;
        const centerY = this.grid.canvas.height / 2 + pix.y;
        
        // Create a ripple effect
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const ripple = document.createElement('div');
                ripple.style.position = 'absolute';
                ripple.style.left = `${centerX}px`;
                ripple.style.top = `${centerY}px`;
                ripple.style.width = `${this.grid.hexSize * this.megaTileRadius * 3}px`;
                ripple.style.height = `${this.grid.hexSize * this.megaTileRadius * 3}px`;
                ripple.style.borderRadius = '50%';
                ripple.style.backgroundColor = 'transparent';
                ripple.style.border = `3px solid ${tileInfo.color}`;
                ripple.style.transform = 'translate(-50%, -50%)';
                ripple.style.animation = `megatile-reveal 1.5s ease-out ${i * 0.2}s`;
                ripple.style.boxShadow = `0 0 15px ${tileInfo.glowColor}`;
                ripple.style.zIndex = '950';
                ripple.style.pointerEvents = 'none';
                
                document.querySelector('.game-container').appendChild(ripple);
                
                // Remove ripple after animation
                setTimeout(() => {
                    ripple.remove();
                }, 1500 + i * 200);
            }, i * 200);
        }
        
        // Add animation if not already present
        if (!document.getElementById('megatile-animations')) {
            const animStyle = document.createElement('style');
            animStyle.id = 'megatile-animations';
            animStyle.textContent = `
                @keyframes megatile-reveal {
                    0% { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
                }
                
                @keyframes shrine-activate {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.7; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
                }
            `;
            document.head.appendChild(animStyle);
        }
    }
    
    // Play animation for shrine activation
    playShrineActivationEffect(megaTile, actualGainedAmount) {
        // Get the shrine info
        const tileInfo = this.tileTypes[megaTile.type];
        
        // Use the actual gained amount that was passed in
        
        // Create a notification at screen center
        const notification = document.createElement('div');
        notification.textContent = `${tileInfo.shrineSymbol} ${megaTile.type.charAt(0).toUpperCase() + megaTile.type.slice(1)} Shrine Activated! +${actualGainedAmount} stone${actualGainedAmount !== 1 ? 's' : ''} ${tileInfo.shrineSymbol}`;
        notification.style.position = 'fixed';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        notification.style.color = tileInfo.color;
        notification.style.padding = '1rem 2rem';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '2000';
        notification.style.fontSize = '24px';
        notification.style.fontWeight = 'bold';
        notification.style.textShadow = `0 0 10px ${tileInfo.glowColor}`;
        notification.style.animation = 'shrine-activation 2s forwards';
        
        // Add animation if not already present
        if (!document.getElementById('shrine-animations')) {
            const animStyle = document.createElement('style');
            animStyle.id = 'shrine-animations';
            animStyle.textContent = `
                @keyframes shrine-activation {
                    0% { opacity: 0; transform: translate(-50%, -70%); }
                    20% { opacity: 1; transform: translate(-50%, -50%); }
                    80% { opacity: 1; transform: translate(-50%, -50%); }
                    100% { opacity: 0; transform: translate(-50%, -30%); }
                }
            `;
            document.head.appendChild(animStyle);
        }
        
        document.body.appendChild(notification);
        
        // Remove notification after animation
        setTimeout(() => {
            notification.remove();
        }, 2000);
        
        // Get the center position for the animation
        const pix = this.grid.hexMath.axialToPixel(megaTile.center.q, megaTile.center.r);
        const centerX = this.grid.canvas.width / 2 + pix.x;
        const centerY = this.grid.canvas.height / 2 + pix.y;
        
        // Create a shrine activation effect
        const glow = document.createElement('div');
        glow.style.position = 'absolute';
        glow.style.left = `${centerX}px`;
        glow.style.top = `${centerY}px`;
        glow.style.width = `${this.grid.hexSize * 3}px`;
        glow.style.height = `${this.grid.hexSize * 3}px`;
        glow.style.borderRadius = '50%';
        glow.style.backgroundColor = tileInfo.glowColor;
        glow.style.transform = 'translate(-50%, -50%)';
        glow.style.animation = 'shrine-activate 1.5s ease-out';
        glow.style.boxShadow = `0 0 20px ${tileInfo.color}`;
        glow.style.zIndex = '950';
        glow.style.pointerEvents = 'none';
        
        document.querySelector('.game-container').appendChild(glow);
        
        // Remove glow after animation
        setTimeout(() => {
            glow.remove();
        }, 1500);
    }
    
    // Draw mega-tiles and shrines on the canvas - called by render system
    drawMegaTiles(ctx, centerX, centerY) {
        // First draw all non-shrine mega-tile hexes
        for (const megaTile of this.megaTiles) {
            const tileInfo = this.tileTypes[megaTile.type];
            
            // Draw the background color for all non-center hexes
            for (const hex of megaTile.hexes) {
                // Skip the center (shrine) hex - we'll draw it later
                if (hex.q === megaTile.center.q && hex.r === megaTile.center.r) continue;
                
                const pix = this.grid.hexMath.axialToPixel(hex.q, hex.r);
                const x = centerX + pix.x;
                const y = centerY + pix.y;
                
                // Draw the mega-tile background (respecting any stones that might be placed)
                const gridHex = this.grid.getHex(hex.q, hex.r);
                if (gridHex) {
                    // Use light brown for unrevealed tiles, glow color for revealed tiles
                    const color = megaTile.revealed ? tileInfo.glowColor : '#D2B48C';
                    this.drawMegaTileHex(ctx, x, y, color, gridHex.stone === null);
                }
            }
        }
        
        // Then draw the shrine hexes on top
        for (const megaTile of this.megaTiles) {
            if (!megaTile.revealed) continue;
            
            const tileInfo = this.tileTypes[megaTile.type];
            const center = megaTile.center;
            const pix = this.grid.hexMath.axialToPixel(center.q, center.r);
            const x = centerX + pix.x;
            const y = centerY + pix.y;
            
            // Draw the shrine (always active status - no longer tracking permanent activation)
            const isActive = this.grid.player.q === center.q && this.grid.player.r === center.r;
            this.drawShrineHex(ctx, x, y, megaTile, tileInfo, isActive);
        }
    }
    
    // Draw a single mega-tile hex
    drawMegaTileHex(ctx, x, y, fillColor, fullHex = true) {
        ctx.save();
        
        // If fullHex is true, draw a filled hex, otherwise just an outline
        if (fullHex) {
            // Draw a subtle hex background
            const size = this.grid.hexSize * 0.9; // Slightly smaller than normal hex
            
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (2 * Math.PI / 6) * i;
                const xPos = x + size * Math.cos(angle);
                const yPos = y + size * Math.sin(angle);
                if (i === 0) {
                    ctx.moveTo(xPos, yPos);
                } else {
                    ctx.lineTo(xPos, yPos);
                }
            }
            ctx.closePath();
            
            // Fill with semi-transparent color
            ctx.fillStyle = fillColor;
            ctx.fill();
        } else {
            // Just draw a subtle outline to indicate it's part of a mega-tile
            ctx.beginPath();
            const size = this.grid.hexSize * 0.95;
            for (let i = 0; i < 6; i++) {
                const angle = (2 * Math.PI / 6) * i;
                const xPos = x + size * Math.cos(angle);
                const yPos = y + size * Math.sin(angle);
                if (i === 0) {
                    ctx.moveTo(xPos, yPos);
                } else {
                    ctx.lineTo(xPos, yPos);
                }
            }
            ctx.closePath();
            
            // Just stroke with a dashed line
            ctx.strokeStyle = fillColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        ctx.restore();
    }
    
    // Draw a shrine hex (center of a mega-tile)
    drawShrineHex(ctx, x, y, megaTile, tileInfo, isPlayerOnShrine = false) {
        ctx.save();
        
        // Draw background hex with pulsing effect
        const pulseSize = isPlayerOnShrine ? 
            0.95 + 0.1 * Math.sin(Date.now() / 100) : // Faster pulse when player is on it
            0.9 + 0.1 * Math.sin(Date.now() / 200);   // Normal pulse
            
        const size = this.grid.hexSize * pulseSize;
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (2 * Math.PI / 6) * i;
            const xPos = x + size * Math.cos(angle);
            const yPos = y + size * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(xPos, yPos);
            } else {
                ctx.lineTo(xPos, yPos);
            }
        }
        ctx.closePath();
        
        // Create gradient fill
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        if (isPlayerOnShrine) {
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            gradient.addColorStop(0.5, tileInfo.glowColor);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        } else {
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(0.6, tileInfo.glowColor);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
        }
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = tileInfo.color;
        ctx.lineWidth = isPlayerOnShrine ? 2 : 1;
        ctx.stroke();
        
        // Draw shrine symbol
        ctx.fillStyle = tileInfo.color;
        ctx.font = `${isPlayerOnShrine ? 'bold ' : ''}16px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tileInfo.shrineSymbol, x, y);
        
        // Add glow effect when player is on shrine
        if (isPlayerOnShrine) {
            ctx.shadowColor = tileInfo.color;
            ctx.shadowBlur = 10;
            ctx.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now() / 200); // Pulsing opacity
            ctx.fillText(tileInfo.shrineSymbol, x, y);
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
        }
        
        ctx.restore();
    }
    
    // Reset all mega-tiles (for new game)
    resetMegaTiles() {
        for (const megaTile of this.megaTiles) {
            megaTile.revealed = false;
            megaTile.lastActivatedTurn = -1;
        }
        this.revealedTiles.clear();
        this.lastUsedShrine = null;
    }
    
    // Shuffle array helper
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    // Reveal all mega-tiles (debug feature)
    revealAllMegaTiles() {
        for (const megaTile of this.megaTiles) {
            megaTile.revealed = true;
            
            // Mark all hexes in this mega-tile as dirty for rendering
            for (const hex of megaTile.hexes) {
                this.grid.markHexDirty(hex.q, hex.r);
            }
        }
        return this.megaTiles.length;
    }
}