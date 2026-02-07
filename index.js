// Magnitude Self-Improvement Agent
import { BrowserAgent } from 'magnitude-core';

// Configuration for self-improvement tasks
const SELF_IMPROVEMENT_TASKS = [
    "Research latest AI safety practices",
    "Find cybersecurity learning resources",
    "Explore web application security trends",
    "Study ethical hacking methodologies",
    "Learn about responsible AI development"
];

async function runSelfImprovementSession() {
    console.log("Starting Magnitude-powered self-improvement session...");
    
    // Create browser agent
    const agent = await BrowserAgent.create({
        headless: false,  // Set to true for headless operation
        viewport: { width: 1280, height: 720 }
    });
    
    // Execute each self-improvement task
    for (const task of SELF_IMPROVEMENT_TASKS) {
        console.log(`Executing task: ${task}`);
        try {
            await agent.act(task);
            console.log(`Completed task: ${task}`);
            
            // Wait a bit between tasks
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
            console.error(`Error with task "${task}":`, error.message);
        }
    }
    
    console.log("Self-improvement session completed!");
    
    // Close the browser
    await agent.close();
}

// Run the session
runSelfImprovementSession().catch(console.error);
