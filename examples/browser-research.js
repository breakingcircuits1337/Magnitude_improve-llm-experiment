// Example: Browser Research with Magnitude
// Uses @magnitudedev/browser-agent for autonomous browser control

import { BrowserAgent } from '@magnitudedev/browser-agent';
import { z } from 'zod';

const MAGNITUDE_LLM = process.env.MAGNITUDE_LLM || 'claude-sonnet-4';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AZURE_API_KEY = process.env.AZURE_API_KEY;

class MagnitudeResearcher {
    constructor(options = {}) {
        this.llm = options.llm || MAGNITUDE_LLM;
        this.headless = options.headless ?? false;
        this.agent = null;
    }

    async initialize() {
        console.log('🔌 Initializing Magnitude Browser Agent...');
        
        const config = {
            llm: this.llm,
            headless: this.headless,
            viewport: { width: 1280, height: 720 }
        };
        
        if (this.llm.includes('claude')) {
            config.apiKey = ANTHROPIC_API_KEY;
        }
        
        this.agent = new BrowserAgent(config);
        console.log('✅ Magnitude ready\n');
    }

    async researchTopic(topic) {
        console.log(`🔍 Researching: ${topic}\n`);
        
        try {
            await this.agent.act(topic);
            
            const results = await this.agent.extract(
                `Extract key information about ${topic}`,
                z.object({
                    mainPoints: z.array(z.string()).describe('Main findings'),
                    sources: z.array(z.string()).describe('URLs visited'),
                    summary: z.string().describe('Brief summary')
                })
            );
            
            console.log('📊 Research Results:');
            console.log(`   Summary: ${results.summary}`);
            console.log(`   Main Points: ${results.mainPoints.length}`);
            console.log(`   Sources: ${results.sources.length}\n`);
            
            return results;
        } catch (error) {
            console.error(`❌ Research error: ${error.message}`);
            throw error;
        }
    }

    async researchMultiple(topics) {
        const results = [];
        
        for (const topic of topics) {
            try {
                const result = await this.researchTopic(topic);
                results.push(result);
            } catch (e) {
                console.error(`Failed: ${topic}`);
            }
        }
        
        return results;
    }

    async close() {
        if (this.agent) {
            await this.agent.close();
            console.log('🔒 Browser closed');
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    const topic = args[0] || 'AI safety practices';
    const headless = args.includes('--headless');
    
    const researcher = new MagnitudeResearcher({
        headless,
        llm: args.find(a => a.startsWith('--llm='))?.split('=')[1]
    });
    
    await researcher.initialize();
    
    if (args.includes('--multi')) {
        const topics = [
            'AI safety practices',
            'cybersecurity trends 2026',
            'LLM prompt engineering techniques'
        ];
        await researcher.researchMultiple(topics);
    } else {
        await researcher.researchTopic(topic);
    }
    
    await researcher.close();
}

export default MagnitudeResearcher;

main().catch(console.error);
