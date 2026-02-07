// Simple test to check if Magnitude imports work
import { BrowserAgent } from 'magnitude-core';

try {
    console.log("Successfully imported BrowserAgent");
    console.log("BrowserAgent type:", typeof BrowserAgent);
    
    if (BrowserAgent) {
        console.log("BrowserAgent is available for use");
    } else {
        console.log("BrowserAgent is undefined");
    }
} catch (error) {
    console.error("Error with BrowserAgent:", error.message);
    console.error("Stack:", error.stack);
}