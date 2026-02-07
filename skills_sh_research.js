// Script to visit skills.sh and perform self-improvement research
import { BrowserAgent } from 'magnitude-core';
import { z } from 'zod';

async function researchSkillsSH() {
    console.log("Starting skills.sh research for self-improvement...");
    
    // Create browser agent
    const agent = await BrowserAgent.create({
        headless: false,  // Set to true for headless operation
        viewport: { width: 1280, height: 720 }
    });
    
    try {
        // Navigate to skills.sh
        console.log("Navigating to https://skills.sh...");
        await agent.act('Go to https://skills.sh');
        
        // Wait a moment for the page to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Explore the site to understand what it offers
        console.log("Exploring skills.sh for self-improvement resources...");
        await agent.act('Explore the page content and identify key sections about skills development');
        
        // Look for specific self-improvement resources
        await agent.act('Find information about learning resources, skill development, or educational content');
        
        // Extract any useful links or information
        const usefulResources = await agent.query(
            "Extract any useful links, resources, or information about skill development from the page", 
            z.object({
                title: z.string().optional(),
                resources: z.array(z.object({
                    link: z.string().optional(),
                    description: z.string().optional(),
                    category: z.string().optional()
                })).optional().default([])
            })
        );
        
        console.log("Extracted resources:", JSON.stringify(usefulResources, null, 2));
        
        // If there are specific sections, explore them
        if (usefulResources.resources && usefulResources.resources.length > 0) {
            for (const resource of usefulResources.resources) {
                if (resource.link) {
                    console.log(`Exploring resource: ${resource.description || resource.link}`);
                    await agent.act(`Click on the link ${resource.link} if available and explore the content`);
                    
                    // Wait for page load
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Extract information from the new page
                    await agent.act('Summarize the key information on this page');
                }
            }
        }
        
        console.log("Skills.sh research completed!");
    } catch (error) {
        console.error("Error during skills.sh research:", error.message);
    } finally {
        // Close the browser
        await agent.close();
    }
}

// Run the research
researchSkillsSH().catch(console.error);