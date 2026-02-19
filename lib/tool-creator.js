// Tool Creation System
// Enables the agent to discover needs and build reusable tools

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ToolCreator {
    constructor(options = {}) {
        this.toolsPath = options.toolsPath || './tools';
        this.llm = options.llm || null;
        this.toolRegistry = {};
        
        this.ensureDirectories();
        this.loadRegistry();
    }

    ensureDirectories() {
        const dirs = ['custom', 'generated', 'templates'];
        dirs.forEach(dir => {
            if (!fs.existsSync(path.join(this.toolsPath, dir))) {
                fs.mkdirSync(path.join(this.toolsPath, dir), { recursive: true });
            }
        });
    }

    loadRegistry() {
        const registryFile = path.join(this.toolsPath, 'registry.json');
        if (fs.existsSync(registryFile)) {
            this.toolRegistry = JSON.parse(fs.readFileSync(registryFile, 'utf-8'));
        }
    }

    saveRegistry() {
        const registryFile = path.join(this.toolsPath, 'registry.json');
        fs.writeFileSync(registryFile, JSON.stringify(this.toolRegistry, null, 2));
    }

    // Analyze a need and determine if a tool should be created
    async analyzeNeed(need) {
        console.log(`🔧 [ToolCreator] Analyzing need: ${need.description}`);

        if (!this.llm) {
            return this.simpleAnalyze(need);
        }

        const prompt = `
Analyze this tool need and determine if a new tool should be created:

Need: ${need.description}
Context: ${need.context || 'None'}
Previous tools: ${Object.keys(this.toolRegistry).join(', ') || 'None'}

Respond with JSON:
{
  "shouldCreate": true/false,
  "toolName": "suggested_tool_name",
  "toolType": "bash|javascript|python|api",
  "description": "what the tool does",
  "parameters": [{"name": "param", "type": "string", "required": true, "description": "..."}],
  "code": "minimal code template or leave empty for manual creation"
}
`;

        try {
            const response = await this.llm(prompt);
            return JSON.parse(response);
        } catch (e) {
            console.log('⚠️ LLM analysis failed, using simple analysis');
            return this.simpleAnalyze(need);
        }
    }

    simpleAnalyze(need) {
        // Simple heuristic analysis
        const desc = need.description.toLowerCase();
        
        return {
            shouldCreate: true,
            toolName: this.sanitizeName(need.description),
            toolType: desc.includes('api') ? 'api' : desc.includes('python') ? 'python' : 'bash',
            description: need.description,
            parameters: [],
            code: ''
        };
    }

    sanitizeName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    // Create a tool from specification
    async createTool(spec) {
        console.log(`🔨 Creating tool: ${spec.toolName}`);
        
        const toolFile = path.join(this.toolsPath, 'custom', `${spec.toolName}.js`);
        
        const toolCode = this.generateToolCode(spec);
        
        fs.writeFileSync(toolFile, toolCode);
        
        // Register tool
        this.toolRegistry[spec.toolName] = {
            file: toolFile,
            type: spec.toolType,
            description: spec.description,
            parameters: spec.parameters || [],
            createdAt: new Date().toISOString(),
            usageCount: 0
        };
        
        this.saveRegistry();
        
        console.log(`✅ Tool created: ${spec.toolName}`);
        
        return {
            success: true,
            toolName: spec.toolName,
            file: toolFile
        };
    }

    generateToolCode(spec) {
        const params = spec.parameters?.map(p => p.name).join(', ') || '';
        
        return `// Auto-generated tool: ${spec.toolName}
// Created: ${new Date().toISOString()}
// Description: ${spec.description}

${spec.toolType === 'python' ? '#!/usr/bin/env python3' : ''}

/**
 * ${spec.description}
 * @param {${params.split(',').map(p => 'string').join(', ')}} ${params}
 */
${spec.toolType === 'javascript' || spec.toolType === 'bash' ? `async function ${spec.toolName}(${params}) {
    // TODO: Implement tool logic
    console.log('Tool: ${spec.toolName}');
    ${spec.parameters?.map(p => `// Use ${p.name}: ${p.description}`).join('\n    ')}
    
    return { success: true };
}

module.exports = { ${spec.toolName} };` : ''}

${spec.toolType === 'python' ? `def ${spec.toolName}(${params}):
    """${spec.description}"""
    # TODO: Implement tool logic
    print(f"Tool: ${spec.toolName}")
    ${spec.parameters?.map(p => `# Use ${p.name}: ${p.description}`).join('\n    ')}
    
    return {"success": True}` : ''}

${spec.toolType === 'api' ? `// API endpoint tool
const axios = require('axios');

async function ${spec.toolName}(${params}) {
    // TODO: Configure API endpoint
    const endpoint = 'https://api.example.com';
    
    try {
        const response = await axios.get(endpoint, {
            params: { ${spec.parameters?.map(p => p.name).join(', ')} }
        });
        return response.data;
    } catch (error) {
        console.error('API error:', error.message);
        throw error;
    }
}

module.exports = { ${spec.toolName} };` : ''}
`;
    }

    // Generate tool from LLM
    async generateTool(description, requirements) {
        if (!this.llm) {
            return { error: 'LLM not available' };
        }

        const prompt = `
Generate a JavaScript tool based on this description:

Description: ${description}
Requirements: ${requirements || 'General purpose tool'}

Generate a complete, working JavaScript module with:
1. Proper error handling
2. Input validation
3. Clear documentation
4. Return format with success/error

Respond with JSON:
{
  "toolName": "snake_case_name",
  "code": "complete JavaScript code as a string"
}
`;

        try {
            const response = await this.llm(prompt);
            const result = JSON.parse(response);
            
            const toolFile = path.join(this.toolsPath, 'generated', `${result.toolName}.js`);
            fs.writeFileSync(toolFile, result.code);
            
            this.toolRegistry[result.toolName] = {
                file: toolFile,
                type: 'javascript',
                description,
                generatedAt: new Date().toISOString(),
                usageCount: 0
            };
            
            this.saveRegistry();
            
            return { success: true, toolName: result.toolName, file: toolFile };
        } catch (e) {
            return { error: e.message };
        }
    }

    // Use a tool
    async useTool(toolName, params = {}) {
        const tool = this.toolRegistry[toolName];
        if (!tool) {
            return { error: `Tool not found: ${toolName}` };
        }

        console.log(`🔧 Using tool: ${toolName}`);

        try {
            // Dynamic import
            const toolPath = path.resolve(tool.file);
            const toolModule = await import(toolPath);
            
            const result = await toolModule[toolName](params);
            
            // Update usage count
            tool.usageCount = (tool.usageCount || 0) + 1;
            this.saveRegistry();
            
            return { success: true, result };
        } catch (error) {
            return { error: error.message };
        }
    }

    // List available tools
    listTools() {
        return Object.entries(this.toolRegistry).map(([name, info]) => ({
            name,
            type: info.type,
            description: info.description,
            usageCount: info.usageCount || 0,
            createdAt: info.createdAt || info.generatedAt
        }));
    }

    // Get tool info
    getTool(toolName) {
        return this.toolRegistry[toolName];
    }

    // Delete tool
    deleteTool(toolName) {
        const tool = this.toolRegistry[toolName];
        if (!tool) {
            return { error: 'Tool not found' };
        }

        // Delete file
        if (fs.existsSync(tool.file)) {
            fs.unlinkSync(tool.file);
        }

        // Remove from registry
        delete this.toolRegistry[toolName];
        this.saveRegistry();

        return { success: true };
    }

    // Discover tool needs from research
    async discoverNeedsFromResearch(researchFindings) {
        const needs = [];

        // Pattern: repeated tasks = tool candidate
        const taskCounts = {};
        researchFindings.forEach(f => {
            const task = f.task?.toLowerCase();
            if (task) {
                taskCounts[task] = (taskCounts[task] || 0) + 1;
            }
        });

        // Tasks repeated 3+ times are tool candidates
        Object.entries(taskCounts)
            .filter(([_, count]) => count >= 3)
            .forEach(([task, count]) => {
                needs.push({
                    type: 'frequent_task',
                    description: `Automate: ${task}`,
                    context: `Used ${count} times`,
                    priority: 'high'
                });
            });

        // Analyze for patterns
        if (this.llm) {
            try {
                const prompt = `
Analyze these research findings for tool creation opportunities:

${JSON.stringify(researchFindings.slice(0, 10), null, 2)}

Identify 3-5 tool needs. Look for:
- Repeated patterns
- Manual processes that could be automated
- API calls that could be simplified

Respond with JSON array:
[
  {"description": "tool need", "context": "why needed", "priority": "high/medium/low"}
]
`;
                const response = await this.llm(prompt);
                const llmNeeds = JSON.parse(response);
                needs.push(...llmNeeds);
            } catch (e) {
                console.log('⚠️ Could not analyze for tool needs');
            }
        }

        return needs;
    }

    // Full tool creation workflow
    async createFromNeed(need) {
        // 1. Analyze
        const analysis = await this.analyzeNeed(need);
        
        if (!analysis.shouldCreate) {
            return { created: false, reason: 'Not recommended for tool creation' };
        }

        // 2. Create
        const result = await this.createTool({
            toolName: analysis.toolName,
            toolType: analysis.toolType,
            description: analysis.description,
            parameters: analysis.parameters,
            code: analysis.code
        });

        return { created: true, ...result };
    }
}

// CLI
function printUsage() {
    console.log(`
Tool Creator CLI
===============

Usage: node lib/tool-creator.js <command> [options]

Commands:
  create <description>     Create a new tool from description
  generate <desc>          LLM-generate a tool
  use <name> [params]     Use a tool
  list                    List all tools
  info <name>             Get tool info
  delete <name>           Delete a tool
  discover                Discover tool needs from recent research

Examples:
  node lib/tool-creator.js create "fetch weather data"
  node lib/tool-creator.js use my_tool param1=value
  node lib/tool-creator.js list
`);
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const toolCreator = new ToolCreator();

    switch (command) {
        case 'create':
            if (!args[1]) {
                console.log('Usage: create <description>');
                process.exit(1);
            }
            const result = await toolCreator.createFromNeed({
                description: args.slice(1).join(' ')
            });
            console.log(JSON.stringify(result, null, 2));
            break;

        case 'list':
            console.log('Available Tools:');
            toolCreator.listTools().forEach(t => {
                console.log(`  ${t.name} (${t.type}): ${t.description}`);
                console.log(`    Used: ${t.usageCount} times`);
            });
            break;

        case 'use':
            if (!args[1]) {
                console.log('Usage: use <name> [params]');
                process.exit(1);
            }
            const params = {};
            args.slice(2).forEach(p => {
                const [k, v] = p.split('=');
                params[k] = v;
            });
            const result = await toolCreator.useTool(args[1], params);
            console.log(JSON.stringify(result, null, 2));
            break;

        case 'info':
            console.log(JSON.stringify(toolCreator.getTool(args[1]), null, 2));
            break;

        case 'delete':
            console.log(toolCreator.deleteTool(args[1]));
            break;

        default:
            printUsage();
    }
}

export default ToolCreator;

main();
