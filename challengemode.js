// challengeMode.js - Implements challenge mode functionality

class ChallengeMode {
    constructor(grid) {
        this.grid = grid;
        this.isActive = false;
        this.startPosition = null;
        this.bestScore = this.loadBestScore();
        this.apUsed = 0;
        this.goal = null; // Single goal hex
        
        // Create UI for challenge mode
        this.createUI();
    }
    
    // Create challenge mode UI
    createUI() {
        // Create challenge mode button
        const gameControls = document.querySelector('.action-buttons');
        const challengeBtn = document.createElement('button');
        challengeBtn.id = 'challenge-mode-btn';
        challengeBtn.textContent = 'Challenge Mode';
        challengeBtn.style.backgroundColor = '#3a2a4a';
        challengeBtn.style.color = '#ffce00';
        challengeBtn.style.border = '1px solid #ffce00';
        
        challengeBtn.addEventListener('click', () => this.toggleChallengePanel());
        gameControls.appendChild(challengeBtn);
        
        // Create challenge panel (hidden initially)
        const gameContainer = document.querySelector('.game-container');
        const challengePanel = document.createElement('div');
        challengePanel.id = 'challenge-panel';
        challengePanel.className = 'challenge-panel';
        challengePanel.style.display = 'none';
        challengePanel.style.position = 'absolute';
        challengePanel.style.top = '10px';
        challengePanel.style.left = '10px';
        challengePanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        challengePanel.style.padding = '15px';
        challengePanel.style.borderRadius = '8px';
        challengePanel.style.boxShadow = '0 0 10px rgba(255, 206, 0, 0.5)';
        challengePanel.style.zIndex = '100';
        challengePanel.style.color = 'white';
        
        challengePanel.innerHTML = `
            <h3 style="color: #ffce00; margin-top: 0; border-bottom: 1px solid #444; padding-bottom: 5px;">Challenge Mode</h3>
            <p>Cross the grid using as few Action Points as possible!</p>
            <div id="challenge-stats" style="margin-bottom: 10px; display: none;">
                <div>AP Used: <span id="challenge-ap">0</span></div>
                <div>Current Score: <span id="challenge-score">100</span></div>
                <div style="margin-top: 5px;">Best Score: <span id="challenge-best">0</span></div>
            </div>
            <div>
                <button id="start-challenge">Start Challenge</button>
                <button id="reset-challenge" style="display: none;">Reset Challenge</button>
            </div>
        `;
        
        gameContainer.appendChild(challengePanel);
        
        // Add event listeners for challenge controls
        document.getElementById('start-challenge').addEventListener('click', () => this.startChallenge());
        document.getElementById('reset-challenge').addEventListener('click', () => this.resetChallenge());
        
        // Add keyboard shortcut for challenge mode
        document.addEventListener('keydown', (e) => {
            if (e.key === 'c' || e.key === 'C') {
                this.toggleChallengePanel();
            }
        });
        
        // Add info about challenge mode to the shortcuts section
        const shortcutsInfo = document.querySelector('.shortcuts-info ul');
        if (shortcutsInfo) {
            const challengeShortcut = document.createElement('li');
            challengeShortcut.innerHTML = '<strong>C</strong> - Toggle challenge mode';
            shortcutsInfo.appendChild(challengeShortcut);
        }
    }
    
    // Toggle challenge panel visibility
    toggleChallengePanel() {
        const panel = document.getElementById('challenge-panel');
        const isVisible = panel.style.display !== 'none';
        
        panel.style.display = isVisible ? 'none' : 'block';
        document.getElementById('challenge-mode-btn').classList.toggle('active', !isVisible);
        
        if (!isVisible) {
            // Update best score display
            this.updateBestScoreDisplay();
        }
    }
    
    // Start a challenge
    startChallenge() {
        if (this.isActive) return;
        
        // Reset challenge state
        this.isActive = true;
        this.apUsed = 0;
        
        // Clear the grid
        this.clearGrid();
        
        // Update UI
        document.getElementById('challenge-stats').style.display = 'block';
        document.getElementById('start-challenge').style.display = 'none';
        document.getElementById('reset-challenge').style.display = 'inline-block';
        
        // Reset stone inventory - player starts with no stones
        this.resetStoneInventory();
        
        // Place player at bottom edge
        this.placePlayerAtStart();
        
        // Place random stones on the grid
        this.placeRandomStones();
        
        // Place goal at a random position
        this.placeGoalRandomly();
        
        // Update AP display
        document.getElementById('ap-count').textContent = '5';
        this.grid.movementSystem.resetVoidAPUsed();
        
        // Update stats
        this.updateStats();
        
        // Render
        this.grid.movementSystem.calculateMovableHexes();
        this.grid.renderSystem.render();
        
        // Update status
        this.grid.updateStatus('Challenge started! Reach the goal hex using as few AP as possible.');
    }
    
    // Place player at the bottom edge
    placePlayerAtStart() {
        // Find a suitable starting position at the bottom edge
        let startPositions = [];
        
        for (let q = -this.grid.radius + 2; q <= this.grid.radius - 2; q++) {
            const r = this.grid.radius - 1;
            const hex = this.grid.getHex(q, r);
            if (hex) {
                startPositions.push({ q, r });
            }
        }
        
        // Choose a random position near the center of the bottom edge
        let startIdx = Math.floor(startPositions.length / 2);
        if (startPositions.length > 0) {
            this.startPosition = startPositions[startIdx];
            this.grid.player.q = this.startPosition.q;
            this.grid.player.r = this.startPosition.r;
            this.grid.markHexDirty(this.grid.player.q, this.grid.player.r);
            
            // Reveal adjacent hexes
            this.grid.movementSystem.revealAdjacentHexes(this.grid.player.q, this.grid.player.r);
        }
    }
    
    // Reset stone inventory - player starts with 0 stones
    resetStoneInventory() {
        stoneCounts[STONE_TYPES.EARTH.name] = 5;  // 5 earth stones
        stoneCounts[STONE_TYPES.WATER.name] = 4;  // 4 water stones
        stoneCounts[STONE_TYPES.FIRE.name] = 3;   // 3 fire stones
        stoneCounts[STONE_TYPES.WIND.name] = 2;   // 2 wind stones
        stoneCounts[STONE_TYPES.VOID.name] = 1;   // 1 void stone
        
        // Update the UI to reflect these changes
        Object.keys(stoneCounts).forEach(type => {
            updateStoneCount(type);
        });
        
        this.grid.movementSystem.updateAPDisplay();
    }
    
    // Restore default stone inventory
    restoreDefaultStoneInventory() {
        Object.keys(stoneCounts).forEach(type => {
            stoneCounts[type] = stoneCapacity[type];
            updateStoneCount(type);
        });
        
        this.grid.movementSystem.updateAPDisplay();
    }
    
    // Roll dice (e.g., 3d4 = roll 3 four-sided dice)
    rollDice(numDice, sides) {
        let total = 0;
        for (let i = 0; i < numDice; i++) {
            total += Math.floor(Math.random() * sides) + 1;
        }
        return total;
    }
    
    // Place random stones on the grid according to distribution rules
    placeRandomStones() {
        // Determine stone counts
        const voidStones = this.rollDice(1, 4);  // 1d4 void stones
        const windStones = this.rollDice(2, 4);  // 2d4 wind stones
        const fireStones = this.rollDice(3, 4);  // 3d4 fire stones
        const waterStones = this.rollDice(4, 4); // 4d4 water stones
        const earthStones = this.rollDice(5, 4); // 5d4 earth stones
        
        console.log(`Placing stones: ${voidStones} void, ${windStones} wind, ${fireStones} fire, ${waterStones} water, ${earthStones} earth`);
        
        // Get all valid placement positions (avoid player and starting area)
        const validPositions = this.getValidPlacementPositions();
        
        if (validPositions.length === 0) {
            console.error("No valid positions found for stone placement");
            return;
        }
        
        // Shuffle the positions
        this.shuffleArray(validPositions);
        
        // Place the stones
        let positionIndex = 0;
        
        // Helper function to place stones
        const placeStones = (stoneType, count) => {
            for (let i = 0; i < count && positionIndex < validPositions.length; i++) {
                const pos = validPositions[positionIndex++];
                this.grid.setStone(pos.q, pos.r, stoneType);
            }
        };
        
        // Place the stones by type - order matters for interaction priority
        placeStones(STONE_TYPES.EARTH.name, earthStones);
        placeStones(STONE_TYPES.WATER.name, waterStones);
        placeStones(STONE_TYPES.FIRE.name, fireStones);
        placeStones(STONE_TYPES.WIND.name, windStones);
        placeStones(STONE_TYPES.VOID.name, voidStones);
        
        // Ensure starting path and goal areas are somewhat clear
        this.ensurePathExists();
    }
    
    // Get all valid hex positions for stone placement
    getValidPlacementPositions() {
        const validPositions = [];
        const safeRadius = 1; // Keep this area around player clear
        
        for (const [key, hex] of this.grid.hexes) {
            // Skip hexes near the player
            if (this.grid.player && this.grid.hexMath.getDistance(hex.q, hex.r, this.grid.player.q, this.grid.player.r) <= safeRadius) {
                continue;
            }
            
            // Skip hexes at the goal edge and starting edge
            if (hex.r <= -this.grid.radius + 2 || hex.r >= this.grid.radius - 2) {
                continue;
            }
            
            // Skip hexes that are not revealed
            if (!hex.revealed) {
                // This is a challenge, so reveal all hexes
                hex.revealed = true;
                this.grid.markHexDirty(hex.q, hex.r);
            }
            
            validPositions.push({ q: hex.q, r: hex.r });
        }
        
        return validPositions;
    }
    
    // Ensure there's at least a possible path from start to goal
    ensurePathExists() {
        // For now, just make sure the goal edge has at least a few clear spots
        for (let q = -3; q <= 3; q++) {
            const r = -this.grid.radius + 1;
            const hex = this.grid.getHex(q, r);
            if (hex && hex.stone) {
                // Randomly decide whether to clear this hex
                if (Math.random() < 0.7) {
                    hex.stone = null;
                    this.grid.markHexDirty(q, r);
                }
            }
        }
    }
    
    // Shuffle array in place
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    // Place goal at a random position
    placeGoalRandomly() {
        // Get all valid positions (avoid player and edges)
        const validPositions = [];
        for (const [key, hex] of this.grid.hexes) {
            // Skip hexes near the player
            if (this.grid.player && this.grid.hexMath.getDistance(hex.q, hex.r, this.grid.player.q, this.grid.player.r) <= 2) {
                continue;
            }
            
            // Skip hexes at the edges
            if (hex.q <= -this.grid.radius + 1 || hex.q >= this.grid.radius - 1 ||
                hex.r <= -this.grid.radius + 1 || hex.r >= this.grid.radius - 1) {
                continue;
            }
            
            validPositions.push({ q: hex.q, r: hex.r });
        }
        
        // Choose a random position
        if (validPositions.length > 0) {
            const randomIndex = Math.floor(Math.random() * validPositions.length);
            this.goal = validPositions[randomIndex];
        } else {
            // Fallback to center if no valid positions
            this.goal = { q: 0, r: 0 };
        }
    }
    
    // Check if player has reached the goal
    checkGoalReached() {
        if (!this.isActive) return false;
        
        const { q, r } = this.grid.player;
        
        // Check if player is on the goal hex
        const reached = q === this.goal.q && r === this.goal.r;
        
        if (reached) {
            this.completeChallenge();
        }
        
        return reached;
    }
    
    // Complete the challenge
    completeChallenge() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Calculate score (100 - AP used, minimum score is 0)
        const score = Math.max(0, 100 - this.apUsed);
        
        // Update best score if better
        if (score > this.bestScore) {
            this.bestScore = score;
            this.saveBestScore(score);
            this.updateBestScoreDisplay();
        }
        
        // Play celebration effect
        this.playCelebrationEffect(score);
        
        // Update UI
        document.getElementById('start-challenge').style.display = 'inline-block';
        document.getElementById('reset-challenge').style.display = 'none';
        
        // Update status
        this.grid.updateStatus(`Challenge completed! Your score: ${score} (100 - ${this.apUsed} AP used)`);
    }
    
    // Track AP usage
    trackAPUsage(ap) {
        if (!this.isActive) return;
        
        this.apUsed += ap;
        
        // Update stats display
        this.updateStats();
    }
    
    // Update stats display
    updateStats() {
        document.getElementById('challenge-ap').textContent = this.apUsed;
        const currentScore = Math.max(0, 100 - this.apUsed);
        document.getElementById('challenge-score').textContent = currentScore;
        this.updateBestScoreDisplay();
    }
    
    // Load best score from localStorage
    loadBestScore() {
        try {
            const saved = localStorage.getItem('godaigo_challenge_best_score');
            return saved ? parseInt(saved) : 0;
        } catch (e) {
            console.warn('Could not load best score from localStorage', e);
            return 0;
        }
    }
    
    // Save best score to localStorage
    saveBestScore(score) {
        try {
            localStorage.setItem('godaigo_challenge_best_score', score.toString());
        } catch (e) {
            console.warn('Could not save best score to localStorage', e);
        }
    }
    
    // Update best score display
    updateBestScoreDisplay() {
        document.getElementById('challenge-best').textContent = this.bestScore;
    }
    
    // Play celebration effect when goal is reached
    playCelebrationEffect(score) {
        // Create a visual effect for celebration
        const gameContainer = document.querySelector('.game-container');
        const celebration = document.createElement('div');
        celebration.className = 'celebration-effect';
        celebration.style.position = 'absolute';
        celebration.style.top = '0';
        celebration.style.left = '0';
        celebration.style.width = '100%';
        celebration.style.height = '100%';
        celebration.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
        celebration.style.zIndex = '50';
        celebration.style.display = 'flex';
        celebration.style.flexDirection = 'column';
        celebration.style.justifyContent = 'center';
        celebration.style.alignItems = 'center';
        celebration.style.fontSize = '42px';
        celebration.style.fontWeight = 'bold';
        celebration.style.color = 'rgba(255, 215, 0, 0.8)';
        celebration.style.textShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        
        // Show score
        celebration.innerHTML = `
            CHALLENGE COMPLETE!
            <div style="font-size: 24px; margin-top: 20px;">Your score: ${score}</div>
            ${score > this.bestScore ? '<div style="font-size: 24px; color: #ff9; margin-top: 10px;">New Best Score!</div>' : ''}
        `;
        
        // Create particle effects
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'celebration-particle';
            particle.style.position = 'absolute';
            particle.style.width = '10px';
            particle.style.height = '10px';
            particle.style.borderRadius = '50%';
            particle.style.backgroundColor = `hsl(${Math.random() * 60 + 40}, 100%, 50%)`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.transform = 'scale(0)';
            particle.style.animation = `particle-fade 1.5s ease-out ${Math.random() * 0.5}s`;
            celebration.appendChild(particle);
        }
        
        gameContainer.appendChild(celebration);
        
        // Add animation stylesheet if not already present
        if (!document.getElementById('celebration-style')) {
            const style = document.createElement('style');
            style.id = 'celebration-style';
            style.textContent = `
                @keyframes particle-fade {
                    0% { transform: scale(0); opacity: 0; }
                    20% { transform: scale(1.5); opacity: 1; }
                    100% { transform: scale(0); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Auto-remove after animation
        setTimeout(() => {
            celebration.style.opacity = '0';
            celebration.style.transition = 'opacity 1s';
            setTimeout(() => celebration.remove(), 1000);
        }, 3000);
    }
    
    // Reset the current challenge
    resetChallenge() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Update UI
        document.getElementById('start-challenge').style.display = 'inline-block';
        document.getElementById('reset-challenge').style.display = 'none';
        
        // Reset player to center
        this.grid.player.q = 0;
        this.grid.player.r = 0;
        
        // Reset AP
        document.getElementById('ap-count').textContent = '5';
        this.grid.movementSystem.resetVoidAPUsed();
        
        // Clear grid and restore default stones
        this.clearGrid();
        
        // Update the grid
        this.grid.movementSystem.calculateMovableHexes();
        this.grid.renderSystem.render();
        
        // Update status
        this.grid.updateStatus('Challenge reset.');
    }
    
    // Clear all stones from the grid
    clearGrid() {
        for (const [key, hex] of this.grid.hexes) {
            if (hex.stone) {
                hex.stone = null;
                this.grid.markHexDirty(hex.q, hex.r);
            }
        }
    }
}