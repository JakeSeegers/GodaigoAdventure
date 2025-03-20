// startMenu.js - Handles the main menu interface for Godaigo

class StartMenu {
    constructor() {
        this.menuContainer = null;
        this.gameContainer = null;
        this.gameSettings = new GameSettings();
        this.mainCanvas = null;
        this.grid = null;
        this.menuVisible = true;
        
        // Initialize when the DOM is loaded
        document.addEventListener('DOMContentLoaded', () => this.initialize());
    }
    
    initialize() {
        // Store references to important DOM elements
        this.gameContainer = document.querySelector('.game-container');
        this.mainCanvas = document.getElementById('hexCanvas');
        
        // Create menu container
        this.createMenuInterface();
        
        // Hide game container initially
        if (this.gameContainer) {
            this.gameContainer.style.display = 'none';
        }
        
        // Listen for game reset events
        document.addEventListener('gameReset', () => this.showMenu());
    }
    
    createMenuInterface() {
        // Remove existing menu if any
        const existingMenu = document.getElementById('start-menu-container');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        // Create the menu container
        this.menuContainer = document.createElement('div');
        this.menuContainer.id = 'start-menu-container';
        
        // Style the menu container
        Object.assign(this.menuContainer.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#111',
            zIndex: '1000',
            color: '#eee',
            fontFamily: '"Courier New", monospace'
        });
        
        // Create game title
        const title = document.createElement('h1');
        title.textContent = 'GODAIGO';
        Object.assign(title.style, {
            fontSize: '4rem',
            color: '#d9b08c',
            textShadow: '0 0 15px #b75000',
            marginBottom: '2rem',
            letterSpacing: '0.5rem'
        });
        
        // Create a subtitle
        const subtitle = document.createElement('div');
        subtitle.textContent = '~ The Elemental Stone Game ~';
        Object.assign(subtitle.style, {
            fontSize: '1.2rem',
            color: '#9458f4',
            marginBottom: '3rem',
            letterSpacing: '0.2rem'
        });
        
        // Create the button container
        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            width: '300px'
        });
        
        // Create menu buttons
        const buttons = [
            { id: 'start-game-button', text: 'CHALLENGE MODE', handler: () => this.startChallengeMode() },
            { id: 'adventure-mode-button', text: 'ADVENTURE MODE', handler: () => this.startAdventureMode(), disabled: true },
            { id: 'settings-button', text: 'SETTINGS', handler: () => this.openSettings() },
            { id: 'help-button', text: 'HELP', handler: () => this.openHelp() }
        ];
        
        // Create and add each button
        buttons.forEach(buttonInfo => {
            const button = this.createMenuButton(buttonInfo.id, buttonInfo.text, buttonInfo.handler, buttonInfo.disabled);
            buttonContainer.appendChild(button);
        });
        
        // Add elements to the menu container
        this.menuContainer.appendChild(title);
        this.menuContainer.appendChild(subtitle);
        this.menuContainer.appendChild(buttonContainer);
        
        // Add version info at the bottom
        const versionInfo = document.createElement('div');
        versionInfo.textContent = 'v0.1.0 Alpha';
        Object.assign(versionInfo.style, {
            position: 'absolute',
            bottom: '1rem',
            right: '1rem',
            color: '#555',
            fontSize: '0.8rem'
        });
        this.menuContainer.appendChild(versionInfo);
        
        // Add stone decorations
        this.addStoneDecorations();
        
        // Add to the document
        document.body.appendChild(this.menuContainer);
    }
    
    createMenuButton(id, text, clickHandler, disabled = false) {
        const button = document.createElement('button');
        button.id = id;
        button.textContent = text;
        
        // Set button styles
        Object.assign(button.style, {
            padding: '1rem',
            fontSize: '1.2rem',
            backgroundColor: disabled ? '#333' : '#b75000',
            color: disabled ? '#777' : 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            width: '100%',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
        });
        
        // Add hover effect if not disabled
        if (!disabled) {
            button.addEventListener('mouseover', () => {
                button.style.backgroundColor = '#d9b08c';
                button.style.color = '#333';
                button.style.transform = 'scale(1.05)';
            });
            
            button.addEventListener('mouseout', () => {
                button.style.backgroundColor = '#b75000';
                button.style.color = 'white';
                button.style.transform = 'scale(1)';
            });
            
            // Add ripple effect
            button.addEventListener('click', (e) => {
                const ripple = document.createElement('span');
                Object.assign(ripple.style, {
                    position: 'absolute',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    width: '100px',
                    height: '100px',
                    transform: 'scale(0)',
                    animation: 'ripple 0.6s linear',
                    left: `${e.clientX - button.getBoundingClientRect().left - 50}px`,
                    top: `${e.clientY - button.getBoundingClientRect().top - 50}px`
                });
                
                button.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
                
                // Call the handler
                if (clickHandler) clickHandler();
            });
        }
        
        // Add ripple animation if not already present
        if (!document.getElementById('menu-animations')) {
            const style = document.createElement('style');
            style.id = 'menu-animations';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                
                @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        if (disabled) {
            const comingSoon = document.createElement('span');
            comingSoon.textContent = 'Coming Soon';
            Object.assign(comingSoon.style, {
                position: 'absolute',
                top: '5px',
                right: '10px',
                fontSize: '0.7rem',
                color: '#aaa'
            });
            button.appendChild(comingSoon);
        }
        
        return button;
    }
    
    addStoneDecorations() {
        // Add floating stone decorations around the menu
        const stoneSymbols = [
            { symbol: '▲', color: '#69d83a', size: '3rem', top: '15%', left: '20%', animation: 'float 8s infinite ease-in-out' },
            { symbol: '◯', color: '#5894f4', size: '2.5rem', top: '30%', left: '80%', animation: 'float 7s infinite ease-in-out' },
            { symbol: '♦', color: '#ed1b43', size: '2.8rem', top: '70%', left: '25%', animation: 'float 9s infinite ease-in-out' },
            { symbol: '≋', color: '#ffce00', size: '3.2rem', top: '65%', left: '75%', animation: 'float 6s infinite ease-in-out' },
            { symbol: '✺', color: '#9458f4', size: '2.7rem', top: '85%', left: '50%', animation: 'float 10s infinite ease-in-out' }
        ];
        
        stoneSymbols.forEach((stone, index) => {
            const stoneElement = document.createElement('div');
            stoneElement.textContent = stone.symbol;
            Object.assign(stoneElement.style, {
                position: 'absolute',
                fontSize: stone.size,
                color: stone.color,
                top: stone.top,
                left: stone.left,
                textShadow: `0 0 10px ${stone.color}`,
                animation: stone.animation,
                transformOrigin: 'center',
                zIndex: '1'
            });
            
            // Add rotation to some stones
            if (index % 2 === 0) {
                stoneElement.style.animation += `, rotate ${10 + index * 5}s infinite linear`;
            }
            
            this.menuContainer.appendChild(stoneElement);
        });
    }
    
    startChallengeMode() {
        this.hideMenu();
        
        // Start the game and initialize challenge mode
        if (!this.grid) {
            this.grid = new HexGrid(this.mainCanvas);
        }
        
        // After a small delay, activate challenge mode
        setTimeout(() => {
            this.grid.challengeMode.startChallenge();
        }, 300);
    }
    
    startAdventureMode() {
        // Display "Coming Soon" notification
        this.showNotification('Adventure Mode coming in future update!');
    }
    
    openSettings() {
        // Hide the main menu buttons
        const buttonContainer = this.menuContainer.querySelector('div:not([id])');
        buttonContainer.style.display = 'none';
        
        // Show settings UI
        this.gameSettings.showSettingsUI(this.menuContainer, () => {
            // Callback when settings are closed
            buttonContainer.style.display = 'flex';
        });
    }
    
    openHelp() {
        this.showHelpScreen();
    }
    
    hideMenu() {
        if (this.menuContainer) {
            this.menuContainer.style.opacity = '0';
            this.menuContainer.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                this.menuContainer.style.display = 'none';
                this.menuVisible = false;
                
                // Show game container
                if (this.gameContainer) {
                    this.gameContainer.style.display = 'flex';
                }
                
                // Create back button
                this.createBackToMenuButton();
            }, 500);
        }
    }
    
    showMenu() {
        // Hide back button if it exists
        const backButton = document.getElementById('back-to-menu-button');
        if (backButton) {
            backButton.remove();
        }
        
        // Hide game container
        if (this.gameContainer) {
            this.gameContainer.style.display = 'none';
        }
        
        // Show menu
        if (this.menuContainer) {
            this.menuContainer.style.display = 'flex';
            this.menuContainer.style.opacity = '1';
            this.menuVisible = true;
        }
    }
    
    createBackToMenuButton() {
        const backButton = document.createElement('button');
        backButton.id = 'back-to-menu-button';
        backButton.textContent = 'Back to Menu';
        
        Object.assign(backButton.style, {
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: '100',
            padding: '0.5rem 1rem',
            backgroundColor: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '0.9rem'
        });
        
        backButton.addEventListener('mouseover', () => {
            backButton.style.backgroundColor = '#444';
        });
        
        backButton.addEventListener('mouseout', () => {
            backButton.style.backgroundColor = '#333';
        });
        
        backButton.addEventListener('click', () => {
            // Reset the game
            if (this.grid) {
                // Reset challenge mode if active
                if (this.grid.challengeMode && this.grid.challengeMode.isActive) {
                    this.grid.challengeMode.resetChallenge();
                }
                
                // Turn off debug mode if active
                if (this.grid.debugger && this.grid.debugger.isDebugMode) {
                    this.grid.debugger.toggleDebugMode();
                }
            }
            
            this.showMenu();
        });
        
        document.body.appendChild(backButton);
    }
    
    showNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '1rem 2rem',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '5px',
            zIndex: '2000',
            animation: 'fadeInOut 3s forwards'
        });
        
        // Add animation if not already present
        if (!document.getElementById('notification-animations')) {
            const style = document.createElement('style');
            style.id = 'notification-animations';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -20px); }
                    15% { opacity: 1; transform: translate(-50%, 0); }
                    85% { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, -20px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Remove after duration
        setTimeout(() => {
            notification.remove();
        }, duration);
    }
    
    showHelpScreen() {
        // Hide the main menu buttons
        const buttonContainer = this.menuContainer.querySelector('div:not([id])');
        buttonContainer.style.display = 'none';
        
        // Create help container
        const helpContainer = document.createElement('div');
        helpContainer.id = 'help-container';
        
        Object.assign(helpContainer.style, {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '2rem',
            borderRadius: '8px',
            width: '80%',
            maxWidth: '800px',
            maxHeight: '70vh',
            overflowY: 'auto',
            position: 'relative'
        });
        
        // Add help content
        helpContainer.innerHTML = `
            <h2 style="text-align: center; color: #d9b08c; margin-top: 0;">How to Play Godaigo</h2>
            
            <h3 style="color: #5894f4;">Game Modes</h3>
            <p><strong>Challenge Mode:</strong> Cross the grid using as few Action Points as possible to achieve a high score.</p>
            <p><strong>Debug Mode:</strong> Test and experiment with stone interactions.</p>
            
            <h3 style="color: #5894f4;">Stone Types</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                <div>
                    <p><span style="color: #69d83a; font-weight: bold;">▲ Earth:</span> Creates impassable barriers</p>
                    <p><span style="color: #5894f4; font-weight: bold;">◯ Water:</span> Mimics properties of adjacent stones</p>
                    <p><span style="color: #ed1b43; font-weight: bold;">♦ Fire:</span> Destroys adjacent stones (except Void and Fire)</p>
                </div>
                <div>
                    <p><span style="color: #ffce00; font-weight: bold;">≋ Wind:</span> Creates zones of free movement</p>
                    <p><span style="color: #9458f4; font-weight: bold;">✺ Void:</span> Nullifies the abilities of other stones</p>
                </div>
            </div>
            
            <h3 style="color: #5894f4;">Controls</h3>
            <p><strong>Move Mode:</strong> Click on a highlighted hex to move your character.</p>
            <p><strong>Place Mode:</strong> Select a stone and click on an adjacent hex to place it.</p>
            <p><strong>Break Mode:</strong> Click on an adjacent stone to break it (costs AP).</p>
            
            <h3 style="color: #5894f4;">Keyboard Shortcuts</h3>
            <p><strong>T:</strong> Run interaction tests</p>
            <p><strong>R:</strong> Reset stone counts</p>
            <p><strong>D:</strong> Toggle debug mode</p>
            <p><strong>W:</strong> Debug water mimicry chains</p>
            <p><strong>B:</strong> Toggle break mode</p>
            <p><strong>C:</strong> Toggle challenge mode</p>
            
            <h3 style="color: #5894f4;">Stone Interactions</h3>
            <p>Stones interact in unique ways when placed adjacent to each other:</p>
            <ul style="padding-left: 1.5rem;">
                <li>Fire destroys adjacent non-Fire/non-Void stones</li>
                <li>Water mimics properties of adjacent stones by priority (Earth > Fire > Wind > Void)</li>
                <li>Void nullifies abilities of adjacent stones</li>
                <li>Water forms chains that propagate properties</li>
            </ul>
            
            <div style="text-align: center; margin-top: 2rem;">
                <button id="close-help-button" style="padding: 0.5rem 2rem; background-color: #b75000; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
            </div>
        `;
        
        // Add to menu container
        this.menuContainer.appendChild(helpContainer);
        
        // Add close button functionality
        document.getElementById('close-help-button').addEventListener('click', () => {
            helpContainer.remove();
            buttonContainer.style.display = 'flex';
        });
    }
}

// Create and export the start menu
const startMenu = new StartMenu();