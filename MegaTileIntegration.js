// MegaTileIntegration.js - Direct constructor patching approach

// Wait for the HexGrid class to be defined
(function() {
    console.log("MegaTileIntegration waiting for HexGrid to be defined...");
    
    // Store the original HexGrid class
    let originalHexGrid = window.HexGrid;
    
    // Define a patching function that runs after HexGrid is defined
    function patchHexGrid() {
        // Check if HexGrid is defined now
        if (typeof window.HexGrid === 'function' && window.HexGrid !== patchedHexGrid) {
            console.log("HexGrid found, applying patch...");
            
            // Store the original constructor
            originalHexGrid = window.HexGrid;
            
            // Create a patched version
            function patchedHexGrid(canvas, radius = 12) {
                console.log("Creating HexGrid with MegaTile support");
                
                // Call the original constructor
                const grid = new originalHexGrid(canvas, radius);
                
                // Add the MegaTile system if not already present
                if (!grid.megaTileSystem) {
                    console.log("Adding MegaTileSystem to grid");
                    grid.megaTileSystem = new MegaTileSystem(grid);
                    grid.megaTileSystem.initializeMegaTiles();
                    
                    // Patch the render methods
                    patchRenderMethods(grid);
                    
                    // Patch player movement to discover tiles
                    patchPlayerMovement(grid);
                }
                
                return grid;
            }
            
            // Replace the global HexGrid with our patched version
            window.HexGrid = patchedHexGrid;
            console.log("HexGrid successfully patched!");
            
            // Stop checking
            clearInterval(checkInterval);
            
            // Also patch the end turn button
            setTimeout(patchEndTurnButton, 2000);
        }
    }
    
    // Start checking for HexGrid to be defined
    const checkInterval = setInterval(patchHexGrid, 500);
    
    // Patch render methods to draw mega-tiles
    function patchRenderMethods(grid) {
        const renderSystem = grid.renderSystem;
        if (!renderSystem) {
            console.error("Render system not found on grid");
            return;
        }
        
        // Store original render functions
        const originalRender = renderSystem.render;
        const originalRenderOptimized = renderSystem.renderOptimized;
        
        // Patch render function
        renderSystem.render = function() {
            // Call original first
            originalRender.call(this);
            
            // Then draw mega-tiles
            if (grid.megaTileSystem) {
                const centerX = grid.canvas.width / 2;
                const centerY = grid.canvas.height / 2;
                grid.megaTileSystem.drawMegaTiles(this.ctx, centerX, centerY);
            }
        };
        
        // Patch optimized render function
        renderSystem.renderOptimized = function() {
            // Call original first
            originalRenderOptimized.call(this);
            
            // Then draw mega-tiles
            if (grid.megaTileSystem) {
                const centerX = grid.canvas.width / 2;
                const centerY = grid.canvas.height / 2;
                grid.megaTileSystem.drawMegaTiles(this.ctx, centerX, centerY);
            }
        };
        
        console.log("Render methods patched");
    }
    
    // Patch handleClick to allow player movement to discover tiles
    function patchPlayerMovement(grid) {
        // Store the original handlePlayerMovement method
        const originalHandlePlayerMovement = grid.handlePlayerMovement;
        
        // Override with our version
        grid.handlePlayerMovement = function(q, r) {
            // Call original method
            const result = originalHandlePlayerMovement.call(this, q, r);
            
            // Check for mega-tile discovery
            if (this.megaTileSystem) {
                this.megaTileSystem.handlePlayerMovement(q, r);
            }
            
            return result;
        };
        
        console.log("Player movement patched to discover tiles");
    }
    
    // Patch end turn button to check for shrine activation
    function patchEndTurnButton() {
        console.log("Looking for End Turn button...");
        
        const endTurnButton = document.getElementById('end-turn');
        if (!endTurnButton) {
            console.log("End Turn button not found, will try again later");
            setTimeout(patchEndTurnButton, 1000);
            return;
        }
        
        // Store original handler
        const originalOnClick = endTurnButton.onclick;
        
        // Add our handler
        endTurnButton.onclick = function(event) {
            console.log("End turn clicked, checking for shrine activation");
            
            // Find all active grids
            const canvas = document.getElementById('hexCanvas');
            if (canvas && canvas._hexGrid && canvas._hexGrid.megaTileSystem) {
                canvas._hexGrid.megaTileSystem.checkForShrineActivation();
            }
            
            // Call original handler
            if (typeof originalOnClick === 'function') {
                return originalOnClick.call(this, event);
            }
        };
        
        console.log("End Turn button patched successfully");
    }
    
    // Initialize the integration
    function initializeIntegration() {
        console.log("Initializing MegaTile integration...");
        
        // Add event listeners for canvas
        const canvas = document.getElementById('hexCanvas');
        if (canvas) {
            canvas.addEventListener('mousedown', handleMouseDown);
            canvas.addEventListener('mousemove', handleMouseMove);
            canvas.addEventListener('mouseup', handleMouseUp);
            canvas.addEventListener('mouseleave', handleMouseUp);
        }
        
        console.log("MegaTile integration initialized");
    }
    
    // Start the integration when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeIntegration);
    } else {
        initializeIntegration();
    }
})();