// Magnitude Self-Improvement Agent - v2.6
// Multi-Agent Architecture with Tool Creation, Memory, Debate, and Human Feedback

import { BrowserAgent } from 'magnitude-core';
import { 
    ResearchAgent, 
    VerificationAgent, 
    SynthesisAgent, 
    TaskGenerator,
    MemorySystem,
    DebateAgent
} from './agents/index.js';
import SelfModificationSystem from './lib/self-modify.js';
import ReflectionAgent from './agents/reflection.js';
import HumanFeedbackLoop from './lib/human-feedback.js';
import ToolCreator from './lib/tool-creator.js';

class MagnitudeSelfImprover {
    constructor(options = {}) {
        this.headless = options.headless ?? false;
        this.sessionName = options.sessionName || `session_${Date.now()}`;
        this.tasksPerSession = options.tasksPerSession || 5;
        this.enableSelfModification = options.enableSelfModification ?? true;
        
        // Initialize systems
        this.memory = new MemorySystem(options.memoryPath || './memory');
        
        // Initialize self-modification
        this.selfMod = new SelfModificationSystem({
            projectPath: options.projectPath || './',
            llm: options.llm || null
        });
        
        // Initialize agents
        this.researchAgent = new ResearchAgent(this.memory);
        this.verificationAgent = new VerificationAgent(this.memory);
        this.synthesisAgent = new SynthesisAgent(this.memory);
        this.taskGenerator = new TaskGenerator(this.memory);
        this.reflectionAgent = new ReflectionAgent(this.memory, { llm: options.llm });
        this.debateAgent = new DebateAgent({
            mistralPath: options.mistralPath || '/home/sarah/opencode-bc/models/mistral.py',
            kimiPath: options.kimiPath || '/home/sarah/opencode-bc/models/kimi.py'
        });
        
        // Initialize human feedback loop
        this.feedbackLoop = new HumanFeedbackLoop({
            feedbackPath: options.feedbackPath || './feedback'
        });
        
        // Initialize tool creator
        this.toolCreator = new ToolCreator({
            toolsPath: options.toolsPath || './tools',
            llm: options.llm || null
        });
        
        // Session metrics
        this.sessionMetrics = {
            sessionName: this.sessionName,
            tasksCompleted: 0,
            tasksFailed: 0,
            researchTime: 0,
            verificationsPassed: 0,
            knowledgeGaps: []
        };
    }

    async initialize() {
        console.log("=".repeat(60));
        console.log("🚀 Magnitude Self-Improvement Framework");
        console.log("=".repeat(60));
        console.log(`📅 Session: ${this.sessionName}`);
        
        // Check current stats
        const stats = this.memory.getStats();
        console.log(`📊 Current Stats:`);
        console.log(`   Knowledge entries: ${stats.knowledgeCount}`);
        console.log(`   Sessions completed: ${stats.sessionsCount}`);
        console.log(`   Average quality score: ${stats.averageScore}`);
        
        if (stats.knowledgeGaps.length > 0) {
            console.log(`   Knowledge gaps identified: ${stats.knowledgeGaps.length}`);
        }
        console.log("");
        
        // Initialize browser if available
        try {
            this.browser = await BrowserAgent.create({
                headless: this.headless,
                viewport: { width: 1280, height: 720 }
            });
            console.log("✅ Browser agent initialized\n");
        } catch (e) {
            console.log("⚠️  Browser not available, using simulation mode\n");
            this.browser = null;
        }
    }

    async runSession() {
        const startTime = Date.now();
        
        // Generate tasks dynamically based on knowledge gaps
        let tasks = this.taskGenerator.generateTasks(this.tasksPerSession);
        tasks = this.taskGenerator.prioritizeTasks(tasks);
        
        console.log(`📋 Generated ${tasks.length} tasks for this session\n`);
        
        for (const task of tasks) {
            try {
                await this.executeTask(task);
            } catch (error) {
                console.error(`❌ Task failed: ${error.message}`);
                this.sessionMetrics.tasksFailed++;
            }
        }
        
        // Run synthesis
        await this.runSynthesis();
        
        // Run reflection and self-modification
        await this.runReflection();
        
        // Record session
        const sessionTime = (Date.now() - startTime) / 1000;
        this.sessionMetrics.researchTime = sessionTime;
        
        this.memory.recordSession(this.sessionMetrics);
        
        // Print session summary
        this.printSessionSummary();
        
        // Cleanup
        if (this.browser) {
            await this.browser.close();
        }
    }

    async executeTask(task) {
        console.log(`\n${"─".repeat(50)}`);
        console.log(`📌 Task: ${task.task}`);
        console.log(`   Reason: ${task.reason}`);
        
        const taskStart = Date.now();
        
        // Research phase
        const researchResult = await this.researchAgent.research(task.task);
        this.sessionMetrics.tasksCompleted++;
        
        // Verification phase
        const verification = await this.verificationAgent.verify(
            researchResult.result.id
        );
        
        if (verification.passed) {
            this.sessionMetrics.verificationsPassed++;
        }
        
        // Quality evaluation
        const qualityScore = await this.verificationAgent.evaluateTaskQuality(
            task.task,
            researchResult.result
        );
        
        // Auto-queue low confidence items for human review
        if (qualityScore < 0.7) {
            console.log(`   ⚠️  Low confidence - queued for human review`);
            this.feedbackLoop.queueForReview({
                type: 'research',
                content: researchResult.result.content,
                source: 'auto',
                confidence: qualityScore,
                task: task.task,
                verificationResult: verification
            });
        }
        
        console.log(`   ⏱️  Time: ${((Date.now() - taskStart) / 1000).toFixed(1)}s`);
        console.log(`   ✓ Quality score: ${qualityScore.toFixed(2)}`);
        console.log(`   ${verification.passed ? '✅' : '⚠️'} Verification: ${verification.passed ? 'Passed' : 'Needs review'}`);
    }

    async runSynthesis() {
        console.log(`\n${"─".repeat(50)}`);
        console.log("🧠 Running knowledge synthesis...");
        
        // Synthesize on top topics
        const insights = this.synthesisAgent.generateInsights();
        
        if (insights.topTags.length > 0) {
            for (const [topic, count] of insights.topTags.slice(0, 3)) {
                await this.synthesisAgent.synthesize(topic);
            }
        }
        
        console.log("✅ Synthesis complete");
    }

    async runReflection() {
        if (!this.enableSelfModification) return;
        
        console.log(`\n${"─".repeat(50)}`);
        console.log("🔄 Running reflection and self-modification...");
        
        try {
            const reflection = await this.reflectionAgent.reflect(this.sessionMetrics);
            
            if (reflection.codeImprovements?.length > 0) {
                console.log('\n📝 Code improvements suggested:');
                reflection.codeImprovements.forEach(imp => {
                    console.log(`   - [${imp.priority}] ${imp.description}`);
                });
            }
            
            if (this.sessionMetrics.tasksFailed > 0 && this.selfMod) {
                console.log('\n🔧 Attempting self-modification...');
                const failure = {
                    task: 'session_tasks',
                    error: `${this.sessionMetrics.tasksFailed} tasks failed`,
                    sessionMetrics: this.sessionMetrics
                };
                
                await this.selfMod.improve(failure);
            }
            
        } catch (error) {
            console.log(`⚠️  Reflection error: ${error.message}`);
        }
    }

    printSessionSummary() {
        const stats = this.memory.getStats();
        
        console.log(`\n${"=".repeat(60)}`);
        console.log("📈 SESSION SUMMARY");
        console.log("=".repeat(60));
        console.log(`   Session: ${this.sessionName}`);
        console.log(`   Tasks completed: ${this.sessionMetrics.tasksCompleted}`);
        console.log(`   Tasks failed: ${this.sessionMetrics.tasksFailed}`);
        console.log(`   Verifications passed: ${this.sessionMetrics.verificationsPassed}`);
        console.log(`   Session time: ${this.sessionMetrics.researchTime.toFixed(1)}s`);
        console.log(`   Total knowledge: ${stats.knowledgeCount} entries`);
        console.log(`   Average score: ${stats.averageScore}`);
        
        if (stats.knowledgeGaps.length > 0) {
            console.log(`   Remaining gaps: ${stats.knowledgeGaps.slice(0, 3).join(', ')}...`);
        }
        
        console.log("=".repeat(60));
    }

    // CLI commands
    async command(args) {
        const cmd = args[0];
        
        switch (cmd) {
            case 'stats':
                console.log(this.memory.getStats());
                break;
                
            case 'search':
                const results = this.memory.searchKnowledge(args.slice(1).join(' '));
                console.log(`Found ${results.length} results:`);
                results.forEach(r => console.log(`  - ${r.topic}: ${r.content?.slice(0, 100)}...`));
                break;
                
            case 'gaps':
                console.log("Knowledge gaps:");
                this.memory.identifyGaps().forEach(g => console.log(`  - ${g}`));
                break;
                
            case 'debate':
                const debateTopic = args.slice(1).join(' ');
                if (!debateTopic) {
                    console.log('Usage: debate "<topic>"');
                    break;
                }
                const debateRounds = parseInt(args.find(a => a.startsWith('--rounds='))?.split('=')[1]) || 3;
                this.debateAgent.maxRounds = debateRounds;
                const result = await this.debateAgent.debate(debateTopic);
                console.log('\n✅ Debate complete!');
                console.log(JSON.stringify(result.synthesis, null, 2));
                break;
                
            case 'export':
                console.log(JSON.stringify(this.memory.exportKnowledge(), null, 2));
                break;
                
            case 'improve':
                if (!this.selfMod) {
                    console.log('Self-modification not enabled');
                    break;
                }
                const failure = {
                    task: args.slice(1).join(' ') || 'manual',
                    error: 'Simulated failure for improvement',
                };
                await this.selfMod.improve(failure);
                break;
                
            case 'history':
                if (!this.selfMod) break;
                console.log('Modification history:');
                this.selfMod.getHistory().forEach(h => {
                    console.log(`  - ${h.timestamp}: ${h.change || h.file}`);
                });
                break;
                
            case 'revert':
                if (!this.selfMod) break;
                const backup = args[1];
                if (backup) {
                    this.selfMod.revertToBackup(backup);
                } else {
                    console.log('Usage: magnitude improve --revert <backup-name>');
                }
                break;
                
            case 'feedback':
            case 'review':
                const fbCmd = args[1];
                switch (fbCmd) {
                    case 'pending':
                        console.log('📝 Pending Reviews:');
                        this.feedbackLoop.getPending().forEach(p => {
                            console.log(`  [${p.id.slice(0,8)}] ${p.type}: ${p.content?.slice(0,50)}...`);
                        });
                        break;
                    case 'approve':
                        await this.feedbackLoop.approve(args[2], args.slice(3).join(' '));
                        break;
                    case 'reject':
                        await this.feedbackLoop.reject(args[2], args.slice(3).join(' '));
                        break;
                    case 'queue':
                        this.feedbackLoop.queueForReview({
                            type: args[2] || 'general',
                            content: args.slice(3).join(' ')
                        });
                        break;
                    case 'report':
                        console.log(JSON.stringify(this.feedbackLoop.generateReport(), null, 2));
                        break;
                    default:
                        console.log('Usage: feedback <pending|approve|reject|queue|report>');
                        console.log('  feedback pending          - List pending items');
                        console.log('  feedback approve <id>    - Approve item');
                        console.log('  feedback reject <id>     - Reject item');
                        console.log('  feedback queue <type> <content> - Queue new item');
                        console.log('  feedback report          - Generate report');
                }
                break;
                
            case 'learn':
                console.log('📚 Learning from feedback...');
                const { insights } = this.feedbackLoop.learnFromApproved();
                console.log(`   Approved: ${insights.approvedCount}`);
                console.log(`   Approval rate: ${(insights.approvalRate * 100).toFixed(1)}%`);
                console.log(`   Avg rating: ${insights.avgRating?.toFixed(2)}`);
                break;
                
            case 'tool':
            case 'tools':
                const toolCmd = args[1];
                switch (toolCmd) {
                    case 'list':
                        console.log('🔧 Available Tools:');
                        this.toolCreator.listTools().forEach(t => {
                            console.log(`  ${t.name} (${t.type}): ${t.description}`);
                            console.log(`    Used: ${t.usageCount} times`);
                        });
                        break;
                    case 'create':
                        if (!args[2]) {
                            console.log('Usage: tool create <description>');
                            break;
                        }
                        const createResult = await this.toolCreator.createFromNeed({
                            description: args.slice(2).join(' ')
                        });
                        console.log(JSON.stringify(createResult, null, 2));
                        break;
                    case 'use':
                        if (!args[2]) {
                            console.log('Usage: tool use <name> [param=value...]');
                            break;
                        }
                        const params = {};
                        args.slice(3).forEach(p => {
                            const [k, v] = p.split('=');
                            params[k] = v;
                        });
                        const useResult = await this.toolCreator.useTool(args[2], params);
                        console.log(JSON.stringify(useResult, null, 2));
                        break;
                    case 'discover':
                        console.log('🔍 Discovering tool needs...');
                        // Get recent research
                        const recent = this.memory.searchKnowledge('research');
                        const needs = await this.toolCreator.discoverNeedsFromResearch(recent.slice(0, 20));
                        console.log(`Found ${needs.length} potential tools:`);
                        needs.forEach(n => console.log(`  - ${n.description} (${n.priority})`));
                        break;
                    default:
                        console.log('Usage: tool <list|create|use|discover>');
                }
                break;
                
            default:
                console.log(`Unknown command: ${cmd}`);
                console.log("Commands: stats, search <query>, gaps, export");
        }
    }
}

// Main entry point
async function main() {
    const args = process.argv.slice(2);
    
    const improver = new MagnitudeSelfImprover({
        headless: args.includes('--headless'),
        tasksPerSession: parseInt(args.find(a => a.startsWith('--tasks='))?.split('=')[1]) || 5,
        sessionName: args.find(a => a.startsWith('--name='))?.split('=')[1]
    });
    
    await improver.initialize();
    
    // Check for CLI commands
    if (args[0]?.startsWith('--')) {
        await improver.command(args);
    } else {
        await improver.runSession();
    }
}

export default MagnitudeSelfImprover;

// Run if executed directly
main().catch(console.error);
