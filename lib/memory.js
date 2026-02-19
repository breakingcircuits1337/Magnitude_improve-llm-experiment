// Memory System - Persistent Knowledge Storage
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MemorySystem {
    constructor(storagePath = './memory') {
        this.storagePath = storagePath;
        this.knowledgeFile = path.join(storagePath, 'knowledge.json');
        this.metricsFile = path.join(storagePath, 'metrics.json');
        this.evaluationFile = path.join(storagePath, 'evaluation.json');
        
        this.ensureStorageExists();
    }

    ensureStorageExists() {
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
        
        if (!fs.existsSync(this.knowledgeFile)) {
            this.saveJson(this.knowledgeFile, { entries: [], lastUpdated: null });
        }
        if (!fs.existsSync(this.metricsFile)) {
            this.saveJson(this.metricsFile, { sessions: [], totalTasks: 0, totalResearchTime: 0 });
        }
        if (!fs.existsSync(this.evaluationFile)) {
            this.saveJson(this.evaluationFile, { evaluations: [], scores: [] });
        }
    }

    saveJson(file, data) {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    }

    loadJson(file) {
        try {
            return JSON.parse(fs.readFileSync(file, 'utf-8'));
        } catch {
            return null;
        }
    }

    // Store new knowledge
    addKnowledge(entry) {
        const data = this.loadJson(this.knowledgeFile);
        const knowledgeEntry = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            ...entry,
            timestamp: new Date().toISOString(),
            verified: false
        };
        
        data.entries.push(knowledgeEntry);
        data.lastUpdated = new Date().toISOString();
        this.saveJson(this.knowledgeFile, data);
        
        console.log(`📚 Added knowledge: ${entry.topic}`);
        return knowledgeEntry;
    }

    // Retrieve knowledge by topic
    searchKnowledge(query) {
        const data = this.loadJson(this.knowledgeFile);
        const q = query.toLowerCase();
        
        return data.entries.filter(entry => 
            entry.topic?.toLowerCase().includes(q) ||
            entry.content?.toLowerCase().includes(q) ||
            entry.tags?.some(tag => tag.toLowerCase().includes(q))
        );
    }

    // Get all knowledge
    getAllKnowledge() {
        return this.loadJson(this.knowledgeFile);
    }

    // Identify knowledge gaps
    identifyGaps() {
        const data = this.loadJson(this.knowledgeFile);
        const topics = data.entries.map(e => e.topic?.toLowerCase()).filter(Boolean);
        
        const potentialGaps = [
            "AI safety practices",
            "cybersecurity", 
            "web application security",
            "ethical hacking",
            "LLM prompt engineering",
            "agent architectures",
            "vector databases",
            "RAG systems"
        ];
        
        return potentialGaps.filter(gap => 
            !topics.some(t => t?.includes(gap.toLowerCase()))
        );
    }

    // Update metrics
    recordSession(sessionData) {
        const data = this.loadJson(this.metricsFile);
        
        data.sessions.push({
            ...sessionData,
            timestamp: new Date().toISOString()
        });
        data.totalTasks += sessionData.tasksCompleted || 0;
        data.totalResearchTime += sessionData.researchTime || 0;
        
        this.saveJson(this.metricsFile, data);
        return data;
    }

    // Record evaluation
    evaluate(evaluation) {
        const data = this.loadJson(this.evaluationFile);
        
        const evalEntry = {
            id: Date.now().toString(36),
            ...evaluation,
            timestamp: new Date().toISOString()
        };
        
        data.evaluations.push(evalEntry);
        
        if (evaluation.score !== undefined) {
            data.scores.push(evaluation.score);
        }
        
        this.saveJson(this.evaluationFile, data);
        return evalEntry;
    }

    // Get average score
    getAverageScore() {
        const data = this.loadJson(this.evaluationFile);
        if (data.scores.length === 0) return 0;
        return data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    }

    // Get statistics
    getStats() {
        const knowledge = this.loadJson(this.knowledgeFile);
        const metrics = this.loadJson(this.metricsFile);
        const evaluation = this.loadJson(this.evaluationFile);
        
        return {
            knowledgeCount: knowledge.entries.length,
            sessionsCount: metrics.sessions.length,
            totalTasks: metrics.totalTasks,
            totalResearchTime: `${(metrics.totalResearchTime / 60).toFixed(1)} min`,
            averageScore: this.getAverageScore().toFixed(2),
            knowledgeGaps: this.identifyGaps()
        };
    }

    // Verify knowledge (mark as verified)
    verifyKnowledge(id) {
        const data = this.loadJson(this.knowledgeFile);
        const entry = data.entries.find(e => e.id === id);
        if (entry) {
            entry.verified = true;
            entry.verifiedAt = new Date().toISOString();
            this.saveJson(this.knowledgeFile, data);
        }
        return entry;
    }

    // Export knowledge for external use
    exportKnowledge() {
        const data = this.loadJson(this.knowledgeFile);
        return data.entries;
    }

    // Clear all memory (for testing)
    clear() {
        this.saveJson(this.knowledgeFile, { entries: [], lastUpdated: null });
        this.saveJson(this.metricsFile, { sessions: [], totalTasks: 0, totalResearchTime: 0 });
        this.saveJson(this.evaluationFile, { evaluations: [], scores: [] });
        console.log("🧠 Memory cleared");
    }
}

export default MemorySystem;
