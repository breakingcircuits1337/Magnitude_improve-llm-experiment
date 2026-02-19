// Reflection Agent - Analyzes performance and suggests improvements

class ReflectionAgent {
    constructor(memory, options = {}) {
        this.memory = memory;
        this.llm = options.llm || null;
        this.sessionHistory = [];
    }

    // Analyze session performance
    async analyzeSession(sessionMetrics) {
        console.log('🔍 [Reflection] Analyzing session performance...');
        
        const insights = {
            successRate: sessionMetrics.tasksCompleted / 
                (sessionMetrics.tasksCompleted + sessionMetrics.tasksFailed),
            avgTaskTime: sessionMetrics.researchTime / sessionMetrics.tasksCompleted,
            verificationRate: sessionMetrics.verificationsPassed / sessionMetrics.tasksCompleted
        };
        
        const reflection = {
            whatWorked: [],
            whatFailed: [],
            improvements: [],
            newStrategies: []
        };
        
        // Analyze what worked
        if (insights.successRate > 0.8) {
            reflection.whatWorked.push('High task completion rate');
        }
        if (insights.verificationRate > 0.7) {
            reflection.whatWorked.push('Good research quality');
        }
        
        // Analyze failures
        if (insights.successRate < 0.6) {
            reflection.whatFailed.push('Low task completion rate');
            reflection.improvements.push('Simplify task execution');
            reflection.improvements.push('Add more error handling');
        }
        
        if (insights.verificationRate < 0.5) {
            reflection.whatFailed.push('Low verification rate');
            reflection.improvements.push('Improve research depth');
            reflection.improvements.push('Use more reliable sources');
        }
        
        // Use LLM for deeper analysis if available
        if (this.llm) {
            const prompt = `
Analyze this session metrics and provide insights:
${JSON.stringify(sessionMetrics, null, 2)}

Provide:
1. What worked well (2-3 items)
2. What failed (2-3 items)  
3. Suggested improvements (3-5 items)
4. New strategies to try (2-3 items)

Respond in JSON format with keys: whatWorked, whatFailed, improvements, newStrategies
`;
            try {
                const llmResponse = await this.llm(prompt);
                const parsed = JSON.parse(llmResponse);
                Object.assign(reflection, parsed);
            } catch (e) {
                console.log('⚠️  LLM reflection failed');
            }
        }
        
        // Store reflection
        this.memory.addKnowledge({
            topic: 'Session Reflection',
            content: JSON.stringify(reflection),
            tags: ['reflection', 'session', sessionMetrics.sessionName]
        });
        
        return reflection;
    }

    // Identify patterns across sessions
    async identifyPatterns() {
        const metrics = this.memory.loadJson(
            path.join(this.memory.storagePath, 'metrics.json')
        );
        
        if (!metrics?.sessions?.length) {
            return { patterns: [], recommendation: 'Not enough data' };
        }
        
        const patterns = {
            commonFailures: [],
            timePatterns: [],
            successFactors: []
        };
        
        // Analyze failure types
        const failures = metrics.sessions
            .filter(s => s.tasksFailed > s.tasksCompleted * 0.3)
            .flatMap(s => s.failedTasks || []);
        
        // Count common issues
        const issueCounts = {};
        failures.forEach(f => {
            issueCounts[f.type] = (issueCounts[f.type] || 0) + 1;
        });
        
        patterns.commonFailures = Object.entries(issueCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([issue, count]) => ({ issue, count }));
        
        // Time analysis
        const avgTime = metrics.sessions.reduce((a, s) => a + s.researchTime, 0) 
            / metrics.sessions.length;
        
        patterns.timePatterns = {
            averageSessionTime: avgTime,
            trend: avgTime > (metrics.sessions[0]?.researchTime || 0) ? 'increasing' : 'decreasing'
        };
        
        // Generate recommendation
        let recommendation = '';
        if (patterns.commonFailures.length > 0) {
            recommendation = `Focus on fixing: ${patterns.commonFailures[0].issue}`;
        } else if (patterns.timePatterns.trend === 'increasing') {
            recommendation = 'Consider optimizing task execution';
        } else {
            recommendation = 'System performing well';
        }
        
        return { patterns, recommendation };
    }

    // Generate code improvements based on reflection
    async generateCodeImprovements() {
        const recentReflections = this.memory.searchKnowledge('Session Reflection');
        const gaps = this.memory.identifyGaps();
        
        const improvements = [];
        
        // Based on gaps
        if (gaps.includes('vector databases') || gaps.includes('RAG')) {
            improvements.push({
                type: 'feature',
                description: 'Add vector database for semantic search',
                priority: 'high'
            });
        }
        
        // Based on reflections
        if (recentReflections.some(r => r.content?.includes('timeout'))) {
            improvements.push({
                type: 'fix',
                description: 'Add exponential backoff for API calls',
                priority: 'medium'
            });
        }
        
        if (recentReflections.some(r => r.content?.includes('verification'))) {
            improvements.push({
                type: 'improvement',
                description: 'Enhance verification with LLM evaluation',
                priority: 'medium'
            });
        }
        
        // General improvements
        improvements.push({
            type: 'optimization',
            description: 'Add caching for repeated queries',
            priority: 'low'
        });
        
        return improvements;
    }

    // Full reflection cycle
    async reflect(sessionMetrics) {
        const sessionAnalysis = await this.analyzeSession(sessionMetrics);
        const patterns = await this.identifyPatterns();
        const codeImprovements = await this.generateCodeImprovements();
        
        const fullReflection = {
            sessionAnalysis,
            patterns,
            codeImprovements,
            timestamp: new Date().toISOString()
        };
        
        console.log('\n📊 Reflection Summary:');
        console.log(`   What worked: ${sessionAnalysis.whatWorked.join(', ')}`);
        console.log(`   What failed: ${sessionAnalysis.whatFailed.join(', ')}`);
        console.log(`   Recommendations: ${patterns.recommendation}`);
        console.log(`   Code improvements: ${codeImprovements.length}`);
        
        return fullReflection;
    }
}

export default ReflectionAgent;
