// Self-Modification System for Magnitude
// Enables the agent to analyze failures and modify its own code

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SelfModificationSystem {
    constructor(options = {}) {
        this.projectPath = options.projectPath || './';
        this.backupPath = options.backupPath || './backups';
        this.maxBackups = options.maxBackups || 5;
        this.llm = options.llm || null; // Function to call LLM
        this.modificationLog = [];
        
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.backupPath)) {
            fs.mkdirSync(this.backupPath, { recursive: true });
        }
    }

    // Analyze a failure and determine if modification is needed
    async analyzeFailure(failure) {
        console.log(`🔧 [Self-Mod] Analyzing failure: ${failure.task}`);
        
        const analysis = {
            failureType: this.categorizeFailure(failure),
            rootCause: await this.determineRootCause(failure),
            canSelfModify: this.canSelfModify(failure),
            suggestedChanges: []
        };

        if (analysis.canSelfModify) {
            analysis.suggestedChanges = await this.generateModifications(failure, analysis);
        }

        return analysis;
    }

    categorizeFailure(failure) {
        const error = failure.error?.toLowerCase() || '';
        
        if (error.includes('timeout')) return 'timeout';
        if (error.includes('syntax')) return 'syntax_error';
        if (error.includes('import')) return 'import_error';
        if (error.includes('api') || error.includes('key')) return 'api_error';
        if (error.includes('memory')) return 'resource_error';
        if (error.includes('browser')) return 'browser_error';
        
        return 'unknown';
    }

    canSelfModify(failure) {
        const fixable = ['timeout', 'syntax_error', 'import_error', 'browser_error'];
        return fixable.includes(this.categorizeFailure(failure));
    }

    async determineRootCause(failure) {
        // Use LLM if available, otherwise use heuristics
        if (this.llm) {
            const prompt = `
Analyze this failure and determine the root cause:
Task: ${failure.task}
Error: ${failure.error}
Stack: ${failure.stack || 'N/A'}

Provide a brief root cause analysis (1-2 sentences).
`;
            try {
                return await this.llm(prompt);
            } catch {
                return 'LLM analysis failed, using heuristic';
            }
        }
        
        // Heuristic fallback
        return `Error during "${failure.task}": ${failure.error}`;
    }

    async generateModifications(failure, analysis) {
        const modifications = [];
        
        if (this.llm) {
            const prompt = `
You are helping an AI agent modify its own code to fix failures.

Current failure:
- Task: ${failure.task}
- Error: ${failure.error}
- Failure Type: ${analysis.failureType}
- Root Cause: ${analysis.rootCause}

The agent's codebase is in: ${this.projectPath}

Analyze the code and suggest specific modifications to fix this failure.
For each modification provide:
1. File path (relative to project root)
2. Specific change needed
3. Reason for the change

Respond in JSON format:
[
  {
    "file": "path/to/file.js",
    "change": "description of change",
    "reason": "why this fixes the issue"
  }
]

If no code changes are needed, respond with: []
`;
            try {
                const response = await this.llm(prompt);
                const parsed = JSON.parse(response);
                return parsed;
            } catch (e) {
                console.log('⚠️  LLM modification generation failed');
            }
        }
        
        return modifications;
    }

    // Create a backup before modifications
    createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.backupPath, `backup_${timestamp}`);
        
        fs.mkdirSync(backupDir, { recursive: true });
        
        // Copy key files
        const filesToBackup = ['index.js', 'package.json', 'agents/index.js', 'lib/memory.js'];
        
        for (const file of filesToBackup) {
            const src = path.join(this.projectPath, file);
            if (fs.existsSync(src)) {
                const dest = path.join(backupDir, file);
                fs.copyFileSync(src, dest);
            }
        }
        
        this.cleanOldBackups();
        
        console.log(`💾 Backup created: ${backupDir}`);
        return backupDir;
    }

    cleanOldBackups() {
        const dirs = fs.readdirSync(this.backupPath)
            .filter(f => fs.statSync(path.join(this.backupPath, f)).isDirectory())
            .sort()
            .reverse();
        
        if (dirs.length > this.maxBackups) {
            for (const dir of dirs.slice(this.maxBackups)) {
                fs.rmSync(path.join(this.backupPath, dir), { recursive: true });
            }
        }
    }

    // Apply modifications
    async applyModifications(modifications) {
        if (!modifications.length) {
            console.log('✅ No modifications to apply');
            return;
        }

        console.log(`🔧 Applying ${modifications.length} modifications...`);
        
        this.createBackup();
        
        const results = [];
        
        for (const mod of modifications) {
            try {
                const filePath = path.join(this.projectPath, mod.file);
                
                if (!fs.existsSync(filePath)) {
                    console.log(`⚠️  File not found: ${mod.file}`);
                    results.push({ file: mod.file, success: false, error: 'File not found' });
                    continue;
                }
                
                const content = fs.readFileSync(filePath, 'utf-8');
                const modified = this.applyChange(content, mod.change);
                
                fs.writeFileSync(filePath, modified);
                
                console.log(`   ✅ Modified: ${mod.file}`);
                results.push({ file: mod.file, success: true });
                
                this.modificationLog.push({
                    file: mod.file,
                    change: mod.change,
                    reason: mod.reason,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.log(`   ❌ Failed: ${mod.file} - ${error.message}`);
                results.push({ file: mod.file, success: false, error: error.message });
            }
        }
        
        return results;
    }

    applyChange(content, changeDescription) {
        // Simple heuristic-based changes
        // In production, use AST or more sophisticated parsing
        
        const lower = changeDescription.toLowerCase();
        
        if (lower.includes('increase timeout') || lower.includes('add timeout')) {
            const timeoutMatch = content.match(/timeout[:\s]*(\d+)/i);
            if (timeoutMatch) {
                const newTimeout = parseInt(timeoutMatch[1]) * 2;
                return content.replace(/timeout[:\s]*(\d+)/i, `timeout: ${newTimeout}`);
            }
            // Add timeout to options
            return content.replace(
                /(\{[^}]*)\}/,
                `$1\n    timeout: 60000\n}`
            );
        }
        
        if (lower.includes('add error handling') || lower.includes('try-catch')) {
            return content.replace(
                /(async\s+function\s+\w+[^}]*\{)/,
                `$1\n    try {`
            ).replace(
                /(}\s*)$/m,
                '    } catch (error) {\n        console.error(error);\n    }\n$1'
            );
        }
        
        if (lower.includes('add retry content.replace(
               ')) {
            return /(async\s+function\s+\w+)/,
                `$1\n    // Auto-added retry logic`
            );
        }
        
        // Default: return as-is with
        return// TODO content + `\n comment: ${changeDescription}\n`;
    }

    // Test if modifications work
    async testModifications() {
        console.log('🧪 Testing modifications...');
        
        // Try to require/import the main modules
        try {
            // Dynamic import to test syntax
            const testFile = path.join(this.projectPath, 'index.js');
            const content = fs.readFileSync(testFile, 'utf-8');
            
            // Basic syntax check
            new Function(content);
            
            console.log('✅ Syntax check passed');
            return { success: true };
        } catch (error) {
            console.log(`❌ Test failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Main self-improvement loop
    async improve(failure) {
        console.log('\n' + '='.repeat(50));
        console.log('🧠 Self-Modification Loop');
        console.log('='.repeat(50));
        
        // 1. Analyze
        const analysis = await this.analyzeFailure(failure);
        
        if (!analysis.canSelfModify) {
            console.log('⚠️  Failure requires human intervention');
            return { improved: false, reason: 'cannot_self_modify' };
        }
        
        console.log(`   Root cause: ${analysis.rootCause}`);
        console.log(`   Suggested changes: ${analysis.suggestedChanges.length}`);
        
        // 2. Apply
        const results = await this.applyModifications(analysis.suggestedChanges);
        
        // 3. Test
        const testResult = await this.testModifications();
        
        // 4. Log
        const improvement = {
            failure,
            analysis,
            modifications: results,
            testResult,
            timestamp: new Date().toISOString()
        };
        
        this.modificationLog.push(improvement);
        
        console.log('\n✅ Self-modification complete');
        
        return {
            improved: testResult.success,
            ...improvement
        };
    }

    // Get modification history
    getHistory() {
        return this.modificationLog;
    }

    // Revert to a backup
    revertToBackup(backupDir) {
        const backupPath = path.join(this.backupPath, backupDir);
        
        if (!fs.existsSync(backupPath)) {
            return { success: false, error: 'Backup not found' };
        }
        
        const files = fs.readdirSync(backupPath);
        
        for (const file of files) {
            const src = path.join(backupPath, file);
            const dest = path.join(this.projectPath, file);
            fs.copyFileSync(src, dest);
        }
        
        console.log(`🔄 Reverted to: ${backupDir}`);
        return { success: true };
    }
}

export default SelfModificationSystem;
