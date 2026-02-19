// Research Agent - Web Learning using Magnitude Browser
import { BrowserAgent } from '@magnitudedev/browser-agent';
import { z } from 'zod';

class ResearchAgent {
    constructor(memory, options = {}) {
        this.memory = memory;
        this.name = 'ResearchAgent';
        this.browserAgent = null;
        this.headless = options.headless ?? false;
        this.llm = options.llm || 'claude-sonnet-4';
        this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    }

    async initializeBrowser() {
        if (this.browserAgent) return;
        
        try {
            this.browserAgent = new BrowserAgent({
                llm: this.llm,
                apiKey: this.apiKey,
                headless: this.headless,
                viewport: { width: 1280, height: 720 }
            });
            console.log('🔌 Browser agent initialized');
        } catch (error) {
            console.log('⚠️  Browser init failed:', error.message);
            this.browserAgent = null;
        }
    }

    async research(task) {
        console.log(`🔍 [${this.name}] Researching: ${task}`);
        
        const startTime = Date.now();
        
        // Use browser to research
        const findings = await this.performResearch(task);
        
        const researchTime = (Date.now() - startTime) / 1000;
        
        // Store findings in memory
        const knowledgeEntry = this.memory.addKnowledge({
            topic: task,
            content: findings.summary,
            source: findings.sources || [],
            tags: findings.tags || [],
            researchTime,
            researchMethod: 'web_browser'
        });
        
        return {
            agent: this.name,
            task,
            result: knowledgeEntry,
            researchTime,
            findings
        };
    }

    async performResearch(task) {
        // If browser available, use it
        if (this.browserAgent) {
            return this.browserResearch(task);
        }
        
        // Fallback: try webfetch or simulate
        return this.webFetchResearch(task);
    }

    async browserResearch(task) {
        console.log(`   🌐 Using Magnitude browser to research...`);
        
        try {
            // Navigate and search
            const searchQuery = `${task} site: wikipedia.org OR site:github.com OR site:stackoverflow.com`;
            
            await this.browserAgent.act(`Research and learn about: ${task}`);
            
            // Extract key information
            const extracted = await this.browserAgent.extract(
                `Extract key information about ${task}`,
                z.object({
                    mainPoints: z.array(z.string()).describe('Main facts or concepts learned'),
                    definitions: z.array(z.string()).describe('Key definitions'),
                    sources: z.array(z.string()).describe('URLs or sources visited'),
                    relatedTopics: z.array(z.string()).describe('Related topics discovered')
                })
            ).catch(() => null);

            // Get current page content as fallback
            const pageContent = await this.browserAgent.getPageContent?.().catch(() => '');
            
            return {
                summary: extracted?.mainPoints?.join('\n\n') || pageContent?.slice(0, 2000) || `Research completed for: ${task}`,
                sources: extracted?.sources || ['browser'],
                tags: [task.toLowerCase().split(' ')[0], 'web-research'],
                definitions: extracted?.definitions || [],
                relatedTopics: extracted?.relatedTopics || [],
                quality: extracted ? 0.9 : 0.6
            };
            
        } catch (error) {
            console.log(`   ⚠️  Browser research error: ${error.message}`);
            return this.webFetchResearch(task);
        }
    }

    async webFetchResearch(task) {
        // Fallback using webfetch for URLs
        console.log(`   🌐 Using web fetch to research...`);
        
        const searchUrls = [
            `https://en.wikipedia.org/wiki/${encodeURIComponent(task.replace(/ /g, '_'))}`,
            `https://github.com/search?q=${encodeURIComponent(task)}&type=repositories`
        ];

        const findings = [];
        const sources = [];

        for (const url of searchUrls.slice(0, 2)) {
            try {
                const response = await fetch(url, { 
                    signal: AbortSignal.timeout(5000) 
                });
                
                if (response.ok) {
                    const text = await response.text();
                    // Extract some content (simplified)
                    const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
                    const title = titleMatch?.[1] || url;
                    
                    findings.push(title);
                    sources.push(url);
                }
            } catch (e) {
                // Skip failed URLs
            }
        }

        return {
            summary: findings.join('\n\n') || `Research on: ${task}`,
            sources,
            tags: [task.toLowerCase().split(' ')[0], 'web-fetch'],
            quality: findings.length > 0 ? 0.5 : 0.3
        };
    }

    async close() {
        if (this.browserAgent) {
            await this.browserAgent.close();
            this.browserAgent = null;
        }
    }
}

export default ResearchAgent;
