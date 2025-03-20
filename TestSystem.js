// TestSystem.js - Test suite for stone interactions

class TestSystem {
    constructor(grid) {
        this.grid = grid;
    }
    
    // Enhanced testing function for stone interactions with debug integration
    runInteractionTests() {
        this.grid.updateStatus("Running stone interaction tests...");
        this.grid.debugger.testResults = {}; // Reset test results
        
        // Clear part of the grid for testing
        for (let q = -3; q <= 3; q++) {
            for (let r = -3; r <= 3; r++) {
                const hex = this.grid.getHex(q, r);
                if (hex) hex.stone = null;
            }
        }
        
        // Start Test 1: Fire + Fire - Both should remain
        this.runTest1();
    }
    
    // Test 1: Fire + Fire - Both should remain
    runTest1() {
        this.grid.debugger.logTestStart(1, "Fire + Fire - Both should remain");
        
        this.grid.setStone(0, 0, STONE_TYPES.FIRE.name);
        this.grid.setStone(1, 0, STONE_TYPES.FIRE.name);
        
        // Check if both fire stones still exist after interaction
        setTimeout(() => {
            const fire1 = this.grid.getHex(0, 0).stone === STONE_TYPES.FIRE.name;
            const fire2 = this.grid.getHex(1, 0).stone === STONE_TYPES.FIRE.name;
            
            const passed = fire1 && fire2;
            const message = passed ? 
                "Fire stones do not destroy each other" : 
                "Fire stones should not destroy each other";
                
            this.grid.debugger.logTestEnd(1, passed, message);
            this.grid.updateStatus(`Test 1 ${passed ? 'passed' : 'failed'}: ${message}`);
            
            // Trigger next test after a delay
            setTimeout(() => this.runTest2(), 1500);
        }, 500);
    }
    
    // Test 2: Fire + Water Chain
    runTest2() {
        // Clear test area
        for (let q = -2; q <= 2; q++) {
            for (let r = -2; r <= 2; r++) {
                const hex = this.grid.getHex(q, r);
                if (hex) hex.stone = null;
            }
        }
        
        this.grid.debugger.logTestStart(2, "Fire + Water Chain - All water should be consumed");
        
        this.grid.setStone(0, 0, STONE_TYPES.WATER.name);
        this.grid.setStone(0, 1, STONE_TYPES.WATER.name);
        this.grid.setStone(1, 0, STONE_TYPES.WATER.name);
        
        // Place fire next to one water
        this.grid.setStone(-1, 0, STONE_TYPES.FIRE.name);
        
        // Check if all water stones are consumed
        setTimeout(() => {
            const water1 = this.grid.getHex(0, 0).stone;
            const water2 = this.grid.getHex(0, 1).stone;
            const water3 = this.grid.getHex(1, 0).stone;
            
            const passed = !water1 && !water2 && !water3;
            const message = passed ? 
                "All water stones in chain are consumed" : 
                `Not all water stones consumed (${water1}, ${water2}, ${water3})`;
                
            this.grid.debugger.logTestEnd(2, passed, message);
            this.grid.updateStatus(`Test 2 ${passed ? 'passed' : 'failed'}: ${message}`);
            
            // Run test 3 after a delay
            setTimeout(() => this.runTest3(), 1500);
        }, 1500);
    }
    
    // Test 3: Placing water next to existing fire
    runTest3() {
        // Clear test area
        for (let q = -2; q <= 2; q++) {
            for (let r = -2; r <= 2; r++) {
                const hex = this.grid.getHex(q, r);
                if (hex) hex.stone = null;
            }
        }
        
        this.grid.debugger.logTestStart(3, "Placing water next to existing fire");
        this.grid.updateStatus("Test 3: Placing water next to existing fire");
        
        // Place fire first
        this.grid.setStone(-1, 0, STONE_TYPES.FIRE.name);
        
        // Then place water next to it
        this.grid.setStone(0, 0, STONE_TYPES.WATER.name);
        
        // Check if water is consumed
        setTimeout(() => {
            const fire = this.grid.getHex(-1, 0).stone === STONE_TYPES.FIRE.name;
            const water = this.grid.getHex(0, 0).stone;
            
            const passed = fire && !water;
            const message = passed ? 
                "Water placed next to fire is consumed" : 
                "Water should be consumed when placed next to fire";
                
            this.grid.debugger.logTestEnd(3, passed, message);
            this.grid.updateStatus(`Test 3 ${passed ? 'passed' : 'failed'}: ${message}`);
            
            // Run test 4 - water chain when placing next to fire
            setTimeout(() => this.runTest4(), 1500);
        }, 1500);
    }
    
    // Test 4: Water chain when placing next to fire
    runTest4() {
        // Clear test area
        for (let q = -2; q <= 2; q++) {
            for (let r = -2; r <= 2; r++) {
                const hex = this.grid.getHex(q, r);
                if (hex) hex.stone = null;
            }
        }
        
        this.grid.debugger.logTestStart(4, "Water chain when placing water next to fire");
        this.grid.updateStatus("Test 4: Water chain when placing water next to fire");
        
        // Place fire first
        this.grid.setStone(-1, 0, STONE_TYPES.FIRE.name);
        
        // Add water chain
        this.grid.setStone(1, 0, STONE_TYPES.WATER.name);
        this.grid.setStone(1, 1, STONE_TYPES.WATER.name);
        
        // Place water next to fire but connected to chain
        this.grid.setStone(0, 0, STONE_TYPES.WATER.name);
        
        // Check if all water stones are consumed
        setTimeout(() => {
            const fire = this.grid.getHex(-1, 0).stone === STONE_TYPES.FIRE.name;
            const water1 = this.grid.getHex(0, 0).stone;
            const water2 = this.grid.getHex(1, 0).stone;
            const water3 = this.grid.getHex(1, 1).stone;
            
            const passed = fire && !water1 && !water2 && !water3;
            const message = passed ? 
                "All water stones in chain are consumed" : 
                "Not all water stones were consumed";
                
            this.grid.debugger.logTestEnd(4, passed, message);
            this.grid.updateStatus(`Test 4 ${passed ? 'passed' : 'failed'}: ${message}`);
            
            // Run test 5 - earth stone destroyed by fire
            setTimeout(() => this.runTest5(), 1500);
        }, 1500);
    }
    
    // Test 5: Earth stone placed next to fire
    runTest5() {
        // Clear test area
        for (let q = -2; q <= 2; q++) {
            for (let r = -2; r <= 2; r++) {
                const hex = this.grid.getHex(q, r);
                if (hex) hex.stone = null;
            }
        }
        
        this.grid.debugger.logTestStart(5, "Earth stone placed next to fire");
        this.grid.updateStatus("Test 5: Earth stone placed next to fire");
        
        // Place fire first
        this.grid.setStone(-1, 0, STONE_TYPES.FIRE.name);
        
        // Place earth next to fire
        this.grid.setStone(0, 0, STONE_TYPES.EARTH.name);
        
        // Check if earth is destroyed
        setTimeout(() => {
            const fire = this.grid.getHex(-1, 0).stone === STONE_TYPES.FIRE.name;
            const earth = this.grid.getHex(0, 0).stone;
            
            const passed = fire && !earth;
            const message = passed ? 
                "Earth stone was destroyed by fire" : 
                "Earth stone should be destroyed by fire";
                
            this.grid.debugger.logTestEnd(5, passed, message);
            this.grid.updateStatus(`Test 5 ${passed ? 'passed' : 'failed'}: ${message}`);
            
            // Run test 6 - void nullifies fire's destruction
            setTimeout(() => this.runTest6(), 1500);
        }, 500);
    }
    
    // Test 6: Void nullifies fire's destruction
    runTest6() {
        // Clear test area
        for (let q = -2; q <= 2; q++) {
            for (let r = -2; r <= 2; r++) {
                const hex = this.grid.getHex(q, r);
                if (hex) hex.stone = null;
            }
        }
        
        this.grid.debugger.logTestStart(6, "Void nullifies fire's destruction ability");
        this.grid.updateStatus("Test 6: Void nullifies fire's destruction ability");
        
        // Place fire and void stones
        this.grid.setStone(-1, 0, STONE_TYPES.FIRE.name);
        this.grid.setStone(-2, 0, STONE_TYPES.VOID.name); // Void adjacent to fire
        
        // Place earth next to fire
        this.grid.setStone(0, 0, STONE_TYPES.EARTH.name);
        
        // Check if earth survives due to void nullifying fire
        setTimeout(() => {
            const fire = this.grid.getHex(-1, 0).stone === STONE_TYPES.FIRE.name;
            const void1 = this.grid.getHex(-2, 0).stone === STONE_TYPES.VOID.name;
            const earth = this.grid.getHex(0, 0).stone === STONE_TYPES.EARTH.name;
            
            const passed = fire && void1 && earth;
            const message = passed ? 
                "Void stone nullified fire's destruction ability" : 
                "Earth should survive when void nullifies fire";
                
            this.grid.debugger.logTestEnd(6, passed, message);
            this.grid.updateStatus(`Test 6 ${passed ? 'passed' : 'failed'}: ${message}`);
            
            // Test 7: Water Chain Mimicry
            setTimeout(() => this.runTest7(), 1500);
        }, 500);
    }
    
    // Test 7: Water chain mimicking wind
    runTest7() {
        // Clear test area
        for (let q = -2; q <= 2; q++) {
            for (let r = -2; r <= 2; r++) {
                const hex = this.grid.getHex(q, r);
                if (hex) hex.stone = null;
            }
        }
        
        this.grid.debugger.logTestStart(7, "Water chain mimicking wind");
        this.grid.updateStatus("Test 7: Water chain mimicking wind");
        
        // Create a water chain
        this.grid.setStone(0, 0, STONE_TYPES.WATER.name);
        this.grid.setStone(1, 0, STONE_TYPES.WATER.name);
        this.grid.setStone(1, 1, STONE_TYPES.WATER.name);
        
        // Place wind next to one water
        this.grid.setStone(2, 1, STONE_TYPES.WIND.name);
        
        // Check mimicry
        setTimeout(() => {
            // Move player near the water chain
            this.grid.player.q = -1;
            this.grid.player.r = 0;
            this.grid.movementSystem.calculateMovableHexes();
            
            // Check if movement cost to the first water is 0 (wind mimicry)
            const moveCost = this.grid.movementSystem.getMovementCostFrom(this.grid.player.q, this.grid.player.r, 0, 0);
            
            const passed = moveCost === 0;
            const message = passed ? 
                "Water chain mimicking wind for movement" : 
                `Water should mimic wind (cost: ${moveCost})`;
                
            this.grid.debugger.logTestEnd(7, passed, message);
            this.grid.updateStatus(`Test 7 ${passed ? 'passed' : 'failed'}: ${message}`);
            
            // Test 8: Water mimicking earth should be impassable
            setTimeout(() => this.runTest8(), 1500);
        }, 500);
    }
    
    // Test 8: Water chain mimicking earth's impassable property
    runTest8() {
        // Clear test area
        for (let q = -2; q <= 2; q++) {
            for (let r = -2; r <= 2; r++) {
                const hex = this.grid.getHex(q, r);
                if (hex) hex.stone = null;
            }
        }
        
        this.grid.debugger.logTestStart(8, "Water chain mimicking earth's impassable property");
        this.grid.updateStatus("Test 8: Water chain mimicking earth's impassable property");
        
        // Create a water chain
        this.grid.setStone(0, 0, STONE_TYPES.WATER.name);
        this.grid.setStone(1, 0, STONE_TYPES.WATER.name);
        this.grid.setStone(1, 1, STONE_TYPES.WATER.name);
        
        // Place earth next to one water
        this.grid.setStone(2, 1, STONE_TYPES.EARTH.name);
        
        // Check earth mimicry
        setTimeout(() => {
            // Move player near the water chain
            this.grid.player.q = -1;
            this.grid.player.r = 0;
            this.grid.movementSystem.calculateMovableHexes();
            
            // Check if movement cost to the first water is Infinity (earth mimicry)
            const moveCost = this.grid.movementSystem.getMovementCostFrom(this.grid.player.q, this.grid.player.r, 0, 0);
            
            const passed = moveCost === Infinity;
            const message = passed ? 
                "Water chain mimicking earth is impassable" : 
                `Water should mimic earth's impassable property (cost: ${moveCost})`;
                
            this.grid.debugger.logTestEnd(8, passed, message);
            this.grid.updateStatus(`Test 8 ${passed ? 'passed' : 'failed'}: ${message}`);
            
            this.grid.renderSystem.render();
            
            // Continue to next test
            setTimeout(() => this.runTest9(), 1500);
        }, 500);
    }
    
    // Test 9: Water mimicking fire's destruction ability before being consumed
    runTest9() {
        // Clear test area
        for (let q = -3; q <= 3; q++) {
            for (let r = -3; r <= 3; r++) {
                const hex = this.grid.getHex(q, r);
                if (hex) hex.stone = null;
            }
        }
        
        this.grid.debugger.logTestStart(9, "Water mimicking fire's destruction ability before being consumed");
        this.grid.updateStatus("Test 9: Water mimicking fire's destruction ability before being consumed");
        
        // Set up scenario: Earth stone that will be destroyed by water mimicking fire
        this.grid.setStone(-1, 1, STONE_TYPES.EARTH.name);
        
        // Create a water chain
        this.grid.setStone(0, 0, STONE_TYPES.WATER.name);
        this.grid.setStone(1, 0, STONE_TYPES.WATER.name);
        
        // Earth stone adjacent to second water
        this.grid.setStone(2, 0, STONE_TYPES.EARTH.name);
        
        // Finally place fire - which should cause water to mimic fire's ability
        // and destroy the earth stone before water is consumed
        this.grid.setStone(-1, 0, STONE_TYPES.FIRE.name);
        
        setTimeout(() => {
            const fire = this.grid.getHex(-1, 0).stone === STONE_TYPES.FIRE.name;
            const water1 = this.grid.getHex(0, 0).stone;
            const water2 = this.grid.getHex(1, 0).stone;
            const earth1 = this.grid.getHex(-1, 1).stone;
            const earth2 = this.grid.getHex(2, 0).stone;
            
            const passed = fire && !water1 && !water2 && !earth1 && !earth2;
            const message = passed ? 
                "Water mimicked fire's destruction ability before being consumed" : 
                `Earth stones should be destroyed by water mimicking fire (earth1=${earth1}, earth2=${earth2})`;
            
            this.grid.debugger.logTestEnd(9, passed, message);
            this.grid.updateStatus(`Test 9 ${passed ? 'passed' : 'failed'}: ${message}`);
            
            // Continue to next test
            setTimeout(() => this.runTest10(), 1500);
        }, 1000);
    }

    // Test 10: Fire destroying wind
    runTest10() {
        // Clear test area
        for (let q = -3; q <= 3; q++) {
            for (let r = -3; r <= 3; r++) {
                const hex = this.grid.getHex(q, r);
                if (hex) hex.stone = null;
            }
        }
        
        this.grid.debugger.logTestStart(10, "Fire destroying wind");
        this.grid.updateStatus("Test 10: Fire destroying wind");
        
        // Place wind stone
        this.grid.setStone(0, 0, STONE_TYPES.WIND.name);
        
        // Place fire next to wind
        this.grid.setStone(1, 0, STONE_TYPES.FIRE.name);
        
        setTimeout(() => {
            const fire = this.grid.getHex(1, 0).stone === STONE_TYPES.FIRE.name;
            const wind = this.grid.getHex(0, 0).stone;
            
            const passed = fire && !wind;
            const message = passed ? 
                "Fire destroyed wind stone" : 
                "Wind stone should be destroyed by fire";
            
            this.grid.debugger.logTestEnd(10, passed, message);
            this.grid.updateStatus(`Test 10 ${passed ? 'passed' : 'failed'}: ${message}`);
            
            // Continue to next test
            setTimeout(() => this.runTest11(), 1500);
        }, 500);
    }

    // Test 11: Water mimicry priority when adjacent to multiple stone types
    runTest11() {
        // Clear test area
        for (let q = -3; q <= 3; q++) {
            for (let r = -3; r <= 3; r++) {
                const hex = this.grid.getHex(q, r);
                if (hex) hex.stone = null;
            }
        }
        
        this.grid.debugger.logTestStart(11, "Water mimicry priority when adjacent to multiple stone types");
        this.grid.updateStatus("Test 11: Water mimicry priority when adjacent to multiple stone types");
        
        // Place water stone
        this.grid.setStone(0, 0, STONE_TYPES.WATER.name);
        
        // Place earth (highest priority), wind (lower priority), fire (middle priority) around water
        this.grid.setStone(1, 0, STONE_TYPES.EARTH.name);
        this.grid.setStone(0, 1, STONE_TYPES.WIND.name);
        this.grid.setStone(-1, 0, STONE_TYPES.FIRE.name);
        
        setTimeout(() => {
            // Move player near the water to test movement cost
            this.grid.player.q = 0;
            this.grid.player.r = -1;
            this.grid.movementSystem.calculateMovableHexes();
            
            // If water mimics earth, movement cost should be Infinity
            const moveCost = this.grid.movementSystem.getMovementCostFrom(this.grid.player.q, this.grid.player.r, 0, 0);
            const mimicType = this.grid.waterMimicry.getWaterMimicType(0, 0);
            
            const passed = moveCost === Infinity && mimicType === STONE_TYPES.EARTH.name;
            const message = passed ? 
                "Water correctly mimicked Earth (highest priority)" : 
                `Water should mimic Earth, not ${mimicType} (cost: ${moveCost})`;
            
            this.grid.debugger.logTestEnd(11, passed, message);
            this.grid.updateStatus(`Test 11 ${passed ? 'passed' : 'failed'}: ${message}`);
            
            // Continue to next test
            setTimeout(() => this.runTest12(), 1500);
        }, 500);
    }

    // Test 12: Void breaking a water chain
    runTest12() {
        // Clear test area
        for (let q = -3; q <= 3; q++) {
            for (let r = -3; r <= 3; r++) {
                const hex = this.grid.getHex(q, r);
                if (hex) hex.stone = null;
            }
        }
        
        this.grid.debugger.logTestStart(12, "Void breaking a water chain");
        this.grid.updateStatus("Test 12: Void breaking a water chain");
        
        // Create a water chain with void in the middle
        this.grid.setStone(-2, 0, STONE_TYPES.WATER.name);
        this.grid.setStone(-1, 0, STONE_TYPES.WATER.name);
        this.grid.setStone(0, 0, STONE_TYPES.VOID.name);  // Void breaks the chain
        this.grid.setStone(1, 0, STONE_TYPES.WATER.name);
        this.grid.setStone(2, 0, STONE_TYPES.WATER.name);
        
        // Place wind at one end
        this.grid.setStone(3, 0, STONE_TYPES.WIND.name);
        
        setTimeout(() => {
            // Check if water stones on wind side mimic wind
            const waterNearWind1 = this.grid.movementSystem.getMovementCostFrom(1, -1, 1, 0);
            const waterNearWind2 = this.grid.movementSystem.getMovementCostFrom(2, -1, 2, 0);
            
            // Check if water stones on other side don't mimic wind
            const waterFarFromWind1 = this.grid.movementSystem.getMovementCostFrom(-3, 0, -2, 0);
            const waterFarFromWind2 = this.grid.movementSystem.getMovementCostFrom(-2, -1, -1, 0);
            
            const passed = waterNearWind1 === 0 && waterNearWind2 === 0 && 
                           waterFarFromWind1 === 2 && waterFarFromWind2 === 2;
            const message = passed ? 
                "Void correctly broke the water chain" : 
                "Void should break water chain mimicry";
            
            this.grid.debugger.logTestEnd(12, passed, message);
            this.grid.updateStatus(`Test 12 ${passed ? 'passed' : 'failed'}: ${message}`);
            
            // Continue to next test
            setTimeout(() => this.runTest13(), 1500);
        }, 500);
    }

    // Test 13: Wind zone entrance/exit movement costs
    runTest13() {
        // Clear test area
        for (let q = -3; q <= 3; q++) {
            for (let r = -3; r <= 3; r++) {
                const hex = this.grid.getHex(q, r);
                if (hex) hex.stone = null;
            }
        }
        
        this.grid.debugger.logTestStart(13, "Wind zone entrance/exit movement costs");
        this.grid.updateStatus("Test 13: Wind zone entrance/exit movement costs");
        
        // Create wind stone and empty spaces
        this.grid.setStone(0, 0, STONE_TYPES.WIND.name);
        
        // Position player outside wind zone
        this.grid.player.q = -2;
        this.grid.player.r = 0;
        
        setTimeout(() => {
            this.grid.movementSystem.calculateMovableHexes();
            
            // Check costs for entering wind zone
            const enterWindCost = this.grid.movementSystem.getMovementCostFrom(-2, 0, -1, 0);
            
            // Move player to wind zone
            this.grid.player.q = -1;
            this.grid.player.r = 0;
            this.grid.movementSystem.calculateMovableHexes();
            
            // Check costs for moving within wind zone
            const withinWindCost = this.grid.movementSystem.getMovementCostFrom(-1, 0, 0, 0);
            
            // Check costs for exiting wind zone
            const exitWindCost = this.grid.movementSystem.getMovementCostFrom(-1, 0, -2, 0);
            
            const passed = enterWindCost === 1 && withinWindCost === 0 && exitWindCost === 1;
            const message = passed ? 
                "Wind zone movement costs correct" : 
                `Enter: ${enterWindCost} (should be 1), Within: ${withinWindCost} (should be 0), Exit: ${exitWindCost} (should be 1)`;
            
            this.grid.debugger.logTestEnd(13, passed, message);
            this.grid.updateStatus(`Test 13 ${passed ? 'passed' : 'failed'}: ${message}`);
            
            // Continue to next test
            setTimeout(() => this.runTest14(), 1500);
        }, 500);
    }

    // Test 14: Complex multi-stone interaction (Fire + Water + Earth scenario)
    runTest14() {
        // Clear test area
        for (let q = -3; q <= 3; q++) {
            for (let r = -3; r <= 3; r++) {
                const hex = this.grid.getHex(q, r);
                if (hex) hex.stone = null;
            }
        }
        
        this.grid.debugger.logTestStart(14, "Complex multi-stone interaction (Fire + Water + Earth with Void)");
        this.grid.updateStatus("Test 14: Complex multi-stone interaction");
        
        // Create a water chain connected to earth with fire nearby but separated by void
        this.grid.setStone(-2, 0, STONE_TYPES.FIRE.name);
        this.grid.setStone(-1, 0, STONE_TYPES.VOID.name); // Void between fire and water
        this.grid.setStone(0, 0, STONE_TYPES.WATER.name);
        this.grid.setStone(1, 0, STONE_TYPES.WATER.name);
        this.grid.setStone(2, 0, STONE_TYPES.EARTH.name);
        
        setTimeout(() => {
            // Check if water stones mimic earth (should be true due to void protecting from fire)
            const moveCost = this.grid.movementSystem.getMovementCostFrom(0, -1, 0, 0);
            const mimicType = this.grid.waterMimicry.getWaterMimicType(0, 0);
            
            const passed = moveCost === Infinity && mimicType === STONE_TYPES.EARTH.name;
            const message = passed ? 
                "Water mimicked Earth despite nearby Fire (protected by Void)" : 
                `Water should mimic Earth (cost: ${moveCost}, type: ${mimicType})`;
            
            this.grid.debugger.logTestEnd(14, passed, message);
            this.grid.updateStatus(`Test 14 ${passed ? 'passed' : 'failed'}: ${message}`);
            
            // Final message and generate test summary
            setTimeout(() => {
                const summary = this.grid.debugger.getTestSummary();
                this.grid.updateStatus(`All interaction tests completed! Passed: ${summary.passed}/${summary.total}`);
                this.grid.renderSystem.render();
            }, 1500);
        }, 500);
    }
}