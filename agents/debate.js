// Multi-Agent Debate System
// Uses Mistral 3 Large and Kimi K2 Thinking for opposing viewpoints

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DebateAgent {
    constructor(options = {}) {
        this.mistralPath = options.mistralPath || '/home/sarah/opencode-bc/models/mistral.py';
        this.kimiPath = options.kimiPath || '/home/sarah/opencode-bc/models/kimi.py';
        this.maxRounds = options.maxRounds || 3;
        this.debateHistory = [];
    }

    // Call Mistral via Python script
    async callMistral(prompt) {
        return new Promise((resolve, reject) => {
            const proc = spawn('python3', [this.mistralPath, prompt]);
            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => stdout += data);
            proc.stderr.on('data', (data) => stderr += data);

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout.trim());
                } else {
                    reject(new Error(stderr || 'Mistral call failed'));
                }
            });
        });
    }

    // Call Kimi via Python script
    async callKimi(prompt) {
        return new Promise((resolve, reject) => {
            const proc = spawn('python3', [this.kimiPath, prompt]);
            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => stdout += data);
            proc.stderr.on('data', (data) => stderr += data);

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout.trim());
                } else {
                    reject(new Error(stderr || 'Kimi call failed'));
                }
            });
        });
    }

    // Generate system prompts for each side
    getSystemPrompts(topic) {
        return {
            mistral: {
                role: 'Proponent',
                perspective: `You are a strong proponent of: "${topic}". 
Argue IN FAVOR of this position. Present strong arguments, evidence, and counterarguments to objections.
Be persuasive and thorough.`,
                style: 'Direct, confident, evidence-based'
            },
            kimi: {
                role: 'Opponent', 
                perspective: `You are a strong critic of: "${topic}".
Argue AGAINST this position. Present counterarguments, identify flaws, and challenge assumptions.
Be skeptical and analytical.`,
                style: 'Critical, questioning, thorough'
            }
        };
    }

    // Run a single debate round
    async runRound(roundNum, topic, previousArguments = []) {
        console.log(`\n🔄 Round ${roundNum}/${this.maxRounds}`);

        const prompts = this.getSystemPrompts(topic);
        
        // Build context from previous rounds
        const context = previousArguments.length > 0 
            ? `\n\nPrevious arguments in this debate:\n${previousArguments.join('\n\n')}`
            : '';

        // Mistral (Proponent) argues FOR
        const mistralPrompt = `
${prompts.mistral.perspective}

${context}

Present your argument for this round. Be specific and address potential counterarguments.`;

        // Kimi (Opponent) argues AGAINST
        const kimiPrompt = `
${prompts.kimi.perspective}

${context}

Present your counterargument this round. Challenge the opposing view and identify weaknesses.`;

        // Run both in parallel
        const [mistralArg, kimiArg] = await Promise.all([
            this.callMistral(mistralPrompt).catch(e => `Error: ${e.message}`),
            this.callKimi(kimiPrompt).catch(e => `Error: ${e.message}`)
        ]);

        const round = {
            round: roundNum,
            proponent: { model: 'Mistral 3 Large', argument: mistralArg },
            opponent: { model: 'Kimi K2 Thinking', argument: kimiArg },
            timestamp: new Date().toISOString()
        };

        this.debateHistory.push(round);

        console.log(`   Proponent (Mistral): ${mistralArg.slice(0, 100)}...`);
        console.log(`   Opponent (Kimi): ${kimiArg.slice(0, 100)}...`);

        return round;
    }

    // Synthesize the debate
    async synthesizeDebate(topic) {
        console.log('\n🧠 Synthesizing debate...');

        const summary = this.debateHistory.map(r => 
            `Round ${r.round}:\nPRO: ${r.proponent.argument}\nCON: ${r.opponent.argument}`
        ).join('\n\n');

        const synthesisPrompt = `
You are synthesizing a debate on: "${topic}"

Below is the full debate transcript:

${summary}

Provide:
1. A balanced summary of both sides (2-3 sentences each)
2. Key points of agreement (if any)
3. Key points of disagreement
4. A nuanced conclusion that acknowledges complexity

Format as JSON:
{
  "proponent_summary": "...",
  "opponent_summary": "...",
  "key_agreements": [...],
  "key_disagreements": [...],
  "conclusion": "..."
}`;

        // Use Kimi for synthesis (good at thinking)
        const synthesis = await this.callKimi(synthesisPrompt);
        
        try {
            return JSON.parse(synthesis);
        } catch {
            return { raw_synthesis: synthesis };
        }
    }

    // Run full debate
    async debate(topic) {
        console.log('='.repeat(60));
        console.log('⚖️  MULTI-AGENT DEBATE');
        console.log('='.repeat(60));
        console.log(`Topic: ${topic}`);
        console.log(`Models: Mistral 3 Large (Pro) vs Kimi K2 Thinking (Con)`);
        console.log(`Rounds: ${this.maxRounds}\n`);

        const previousArguments = [];

        for (let round = 1; round <= this.maxRounds; round++) {
            const roundResult = await this.runRound(round, topic, previousArguments);
            previousArguments.push(
                `Round ${round} - Proponent: ${roundResult.proponent.argument}`,
                `Round ${round} - Opponent: ${roundResult.opponent.argument}`
            );
        }

        const synthesis = await this.synthesizeDebate(topic);

        return {
            topic,
            rounds: this.debateHistory,
            synthesis,
            timestamp: new Date().toISOString()
        };
    }

    // Get debate history
    getHistory() {
        return this.debateHistory;
    }

    // Clear history
    clear() {
        this.debateHistory = [];
    }
}

// CLI
async function main() {
    const args = process.argv.slice(2);
    const topic = args.join(' ');
    
    if (!topic) {
        console.log('Usage: node debate.js "<topic>" [--rounds=3]');
        console.log('\nExample:');
        console.log('  node debate.js "Is AI dangerous?"');
        process.exit(1);
    }

    const rounds = parseInt(args.find(a => a.startsWith('--rounds='))?.split('=')[1]) || 3;

    const debate = new DebateAgent({ maxRounds: rounds });
    
    try {
        const result = await debate.debate(topic);
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 DEBATE SYNTHESIS');
        console.log('='.repeat(60));
        
        if (result.synthesis.proponent_summary) {
            console.log(`\n📗 Proponent View:`);
            console.log(`   ${result.synthesis.proponent_summary}`);
        }
        
        if (result.synthesis.opponent_summary) {
            console.log(`\n📕 Opponent View:`);
            console.log(`   ${result.synthesis.opponent_summary}`);
        }
        
        if (result.synthesis.key_disagreements) {
            console.log(`\n⚡ Key Disagreements:`);
            result.synthesis.key_disagreements.forEach(d => console.log(`   - ${d}`));
        }
        
        if (result.synthesis.conclusion) {
            console.log(`\n💡 Conclusion:`);
            console.log(`   ${result.synthesis.conclusion}`);
        }
        
        console.log('\n✅ Debate complete!');
        
    } catch (error) {
        console.error('❌ Debate error:', error.message);
        process.exit(1);
    }
}

export default DebateAgent;

// Run if called directly
main();
