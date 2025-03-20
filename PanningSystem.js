// PanningSystem.js - Handles viewport panning with mouse and touch controls

class PanningSystem {
    constructor(grid) {
        this.grid = grid;
        this.canvas = grid.canvas;
        this.isPanning = false;
        this.lastX = 0;
        this.lastY = 0;
        
        // View offset from center of canvas
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Minimum/maximum offset limits (can be adjusted based on grid size)
        this.maxOffset = this.grid.radius * this.grid.hexSize * 3;
        
        // Initialize mouse event handlers
        this.initializeEventHandlers();
    }
    
    initializeEventHandlers() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        // Prevent context menu on right-click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        // Set cursor style
        this.canvas.style.cursor = 'grab';
    }
    
    // Add touch events (can be called later to enable mobile support)
    enableTouchSupport() {
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
    }
    
    // Mouse event handlers
    handleMouseDown(e) {
        // Only enable panning with right mouse button or when holding shift or ctrl
        if (e.button === 2 || e.shiftKey || e.ctrlKey) {
            this.isPanning = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
            e.preventDefault();
        }
    }
    
    handleMouseMove(e) {
        if (!this.isPanning) return;
        
        const deltaX = e.clientX - this.lastX;
        const deltaY = e.clientY - this.lastY;
        
        this.pan(deltaX, deltaY);
        
        this.lastX = e.clientX;
        this.lastY = e.clientY;
    }
    
    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'grab';
        }
    }
    
    // Touch event handlers
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            this.isPanning = true;
            this.lastX = e.touches[0].clientX;
            this.lastY = e.touches[0].clientY;
            e.preventDefault();
        }
    }
    
    handleTouchMove(e) {
        if (!this.isPanning) return;
        
        if (e.touches.length === 1) {
            const deltaX = e.touches[0].clientX - this.lastX;
            const deltaY = e.touches[0].clientY - this.lastY;
            
            this.pan(deltaX, deltaY);
            
            this.lastX = e.touches[0].clientX;
            this.lastY = e.touches[0].clientY;
            e.preventDefault();
        }
    }
    
    handleTouchEnd(e) {
        this.isPanning = false;
    }
    
    // Core panning function
    pan(deltaX, deltaY) {
        // Update the offsets
        this.offsetX += deltaX;
        this.offsetY += deltaY;
        
        // Enforce limits
        this.offsetX = Math.max(-this.maxOffset, Math.min(this.maxOffset, this.offsetX));
        this.offsetY = Math.max(-this.maxOffset, Math.min(this.maxOffset, this.offsetY));
        
        // Redraw the grid with new offsets
        this.grid.renderSystem.render();
    }
    
    // Get the current view center coordinates
    getViewCenter() {
        return {
            x: this.canvas.width / 2 + this.offsetX,
            y: this.canvas.height / 2 + this.offsetY
        };
    }
    
    // Reset the view to center
    resetView() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.grid.renderSystem.render();
    }
    
    // Convert screen coordinates to grid coordinates considering the pan offset
    screenToGrid(screenX, screenY) {
        // Adjust coordinates for pan offset
        const adjustedX = screenX - this.offsetX;
        const adjustedY = screenY - this.offsetY;
        
        // Use the grid's existing conversion method
        return this.grid.hexMath.pixelToAxial(adjustedX, adjustedY);
    }
}