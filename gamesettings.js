// gameSettings.js - Handles game settings and preferences

class GameSettings {
    constructor() {
        // Default settings
        this.defaultSettings = {
            musicVolume: 50,
            sfxVolume: 70,
            showHexCoordinates: false,
            hexSize: 18,
            autoEndTurn: false
        };
        
        // Load settings from localStorage or use defaults
        this.settings = this.loadSettings();
    }
    
    // Load settings from localStorage
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('godaigo_settings');
            if (savedSettings) {
                return JSON.parse(savedSettings);
            }
        } catch (error) {
            console.warn('Failed to load settings from localStorage:', error);
        }
        
        // Return default settings if no saved settings found
        return { ...this.defaultSettings };
    }
    
    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem('godaigo_settings', JSON.stringify(this.settings));
            return true;
        } catch (error) {
            console.error('Failed to save settings to localStorage:', error);
            return false;
        }
    }
    
    // Reset settings to defaults
    resetSettings() {
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
        return this.settings;
    }
    
    // Get a specific setting
    getSetting(key) {
        return this.settings[key];
    }
    
    // Update a specific setting
    updateSetting(key, value) {
        if (key in this.settings) {
            this.settings[key] = value;
            this.saveSettings();
            return true;
        }
        return false;
    }
    
    // Create and show settings UI
    showSettingsUI(parentContainer, onClose) {
        // Create settings container
        const settingsContainer = document.createElement('div');
        settingsContainer.id = 'settings-container';
        
        Object.assign(settingsContainer.style, {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '2rem',
            borderRadius: '8px',
            width: '80%',
            maxWidth: '600px',
            maxHeight: '70vh',
            overflowY: 'auto',
            position: 'relative'
        });
        
        // Create settings title
        const settingsTitle = document.createElement('h2');
        settingsTitle.textContent = 'Game Settings';
        settingsTitle.style.textAlign = 'center';
        settingsTitle.style.color = '#d9b08c';
        settingsTitle.style.marginTop = '0';
        
        settingsContainer.appendChild(settingsTitle);
        
        // Create settings form
        const settingsForm = document.createElement('form');
        settingsForm.id = 'settings-form';
        settingsForm.style.display = 'grid';
        settingsForm.style.gap = '1.5rem';
        
        // Audio settings
        const audioSection = this.createSettingsSection('Audio');
        
        audioSection.appendChild(this.createSliderSetting(
            'musicVolume',
            'Music Volume',
            0, 100, 5,
            this.settings.musicVolume
        ));
        
        audioSection.appendChild(this.createSliderSetting(
            'sfxVolume',
            'Sound Effects Volume',
            0, 100, 5,
            this.settings.sfxVolume
        ));
        
        // Visual settings
        const visualSection = this.createSettingsSection('Visual');
        
        visualSection.appendChild(this.createToggleSetting(
            'showHexCoordinates',
            'Show Hex Coordinates',
            this.settings.showHexCoordinates
        ));
        
        visualSection.appendChild(this.createSliderSetting(
            'hexSize',
            'Hex Size',
            12, 24, 1,
            this.settings.hexSize,
            (value) => `${value}px`
        ));
        
        // Gameplay settings
        const gameplaySection = this.createSettingsSection('Gameplay');
        
        gameplaySection.appendChild(this.createToggleSetting(
            'autoEndTurn',
            'Auto-End Turn When No AP Left',
            this.settings.autoEndTurn
        ));
        
        // Add sections to form
        settingsForm.appendChild(audioSection);
        settingsForm.appendChild(visualSection);
        settingsForm.appendChild(gameplaySection);
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';
        buttonContainer.style.marginTop = '2rem';
        
        // Reset button
        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.textContent = 'Reset to Defaults';
        resetButton.className = 'settings-button';
        resetButton.style.backgroundColor = '#555';
        
        resetButton.addEventListener('click', () => {
            if (confirm('Reset all settings to default values?')) {
                this.resetSettings();
                // Reload settings UI
                settingsContainer.remove();
                this.showSettingsUI(parentContainer, onClose);
            }
        });
        
        // Save button
        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.textContent = 'Save Settings';
        saveButton.className = 'settings-button';
        saveButton.style.backgroundColor = '#b75000';
        
        saveButton.addEventListener('click', () => {
            this.saveSettingsFromForm(settingsForm);
            settingsContainer.remove();
            
            if (onClose) onClose();
            
            // Show confirmation message
            const notification = document.createElement('div');
            notification.textContent = 'Settings saved!';
            notification.style.position = 'fixed';
            notification.style.top = '20%';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            notification.style.padding = '1rem 2rem';
            notification.style.borderRadius = '5px';
            notification.style.color = 'white';
            notification.style.zIndex = '1001';
            
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 2000);
        });
        
        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'settings-button';
        cancelButton.style.backgroundColor = '#333';
        
        cancelButton.addEventListener('click', () => {
            settingsContainer.remove();
            if (onClose) onClose();
        });
        
        // Add buttons to container
        buttonContainer.appendChild(resetButton);
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(saveButton);
        
        // Add form and buttons to settings container
        settingsContainer.appendChild(settingsForm);
        settingsContainer.appendChild(buttonContainer);
        
        // Add styles for settings UI
        if (!document.getElementById('settings-styles')) {
            const style = document.createElement('style');
            style.id = 'settings-styles';
            style.textContent = `
                .settings-section {
                    margin-bottom: 1.5rem;
                    border-bottom: 1px solid #333;
                    padding-bottom: 1rem;
                }
                
                .settings-section h3 {
                    color: #5894f4;
                    margin-top: 0;
                    margin-bottom: 1rem;
                }
                
                .setting-item {
                    margin-bottom: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .setting-label {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .setting-value {
                    color: #ffce00;
                    font-weight: bold;
                }
                
                .settings-button {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 5px;
                    color: white;
                    cursor: pointer;
                    font-family: 'Courier New', monospace;
                    font-size: 1rem;
                    transition: all 0.2s ease;
                }
                
                .settings-button:hover {
                    transform: scale(1.05);
                }
                
                /* Toggle switch styles */
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 60px;
                    height: 30px;
                }
                
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #444;
                    transition: .4s;
                    border-radius: 30px;
                }
                
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 22px;
                    width: 22px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                
                input:checked + .toggle-slider {
                    background-color: #b75000;
                }
                
                input:checked + .toggle-slider:before {
                    transform: translateX(30px);
                }
            `;
            document.head.appendChild(style);
        }
        
        // Append settings container to parent
        parentContainer.appendChild(settingsContainer);
    }
    
    // Create a settings section with a title
    createSettingsSection(title) {
        const section = document.createElement('div');
        section.className = 'settings-section';
        
        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = title;
        section.appendChild(sectionTitle);
        
        return section;
    }
    
    // Create a slider setting
    createSliderSetting(key, label, min, max, step, value, valueFormatter = null) {
        const container = document.createElement('div');
        container.className = 'setting-item';
        
        const labelContainer = document.createElement('div');
        labelContainer.className = 'setting-label';
        
        const labelText = document.createElement('label');
        labelText.textContent = label;
        labelText.setAttribute('for', `setting-${key}`);
        
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'setting-value';
        valueDisplay.textContent = valueFormatter ? valueFormatter(value) : value;
        
        labelContainer.appendChild(labelText);
        labelContainer.appendChild(valueDisplay);
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = `setting-${key}`;
        slider.name = key;
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = value;
        
        // Update value display when slider changes
        slider.addEventListener('input', () => {
            valueDisplay.textContent = valueFormatter ? valueFormatter(slider.value) : slider.value;
        });
        
        container.appendChild(labelContainer);
        container.appendChild(slider);
        
        return container;
    }
    
    // Create a toggle setting
    createToggleSetting(key, label, checked) {
        const container = document.createElement('div');
        container.className = 'setting-item';
        
        const labelText = document.createElement('label');
        labelText.textContent = label;
        labelText.style.marginBottom = '0.5rem';
        
        const toggleContainer = document.createElement('label');
        toggleContainer.className = 'toggle-switch';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `setting-${key}`;
        checkbox.name = key;
        checkbox.checked = checked;
        
        const slider = document.createElement('span');
        slider.className = 'toggle-slider';
        
        toggleContainer.appendChild(checkbox);
        toggleContainer.appendChild(slider);
        
        container.appendChild(labelText);
        container.appendChild(toggleContainer);
        
        return container;
    }
    
    // Save settings from form inputs
    saveSettingsFromForm(form) {
        // Get all input elements
        const inputs = form.querySelectorAll('input');
        
        // Process each input
        inputs.forEach(input => {
            const key = input.name;
            let value;
            
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.type === 'range' || input.type === 'number') {
                value = parseFloat(input.value);
            } else {
                value = input.value;
            }
            
            this.updateSetting(key, value);
        });
        
        return this.saveSettings();
    }
    
    // Apply settings to the game
    applySettings(grid) {
        if (!grid) return false;
        
        // Apply hex size
        grid.hexSize = this.settings.hexSize;
        
        // Apply any other settings that affect the game directly
        
        // Re-render the grid
        grid.renderSystem.render();
        
        return true;
    }
}