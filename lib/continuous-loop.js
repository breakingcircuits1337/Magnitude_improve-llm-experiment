// Continuous Learning Loop
// Schedules and runs autonomous learning sessions

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ContinuousLearningLoop {
    constructor(options = {}) {
        this.schedulePath = options.schedulePath || './schedule.json';
        this.sessionRunner = options.sessionRunner || null;
        
        this.isRunning = false;
        this.schedule = this.loadSchedule();
        this.intervalIds = [];
    }

    loadSchedule() {
        if (fs.existsSync(this.schedulePath)) {
            return JSON.parse(fs.readFileSync(this.schedulePath, 'utf-8'));
        }
        return {
            enabled: false,
            tasks: [],
            lastRun: null,
            nextRun: null
        };
    }

    saveSchedule() {
        fs.writeFileSync(this.schedulePath, JSON.stringify(this.schedule, null, 2));
    }

    // Add a scheduled task
    addTask(task) {
        const scheduledTask = {
            id: Date.now().toString(36),
            name: task.name,
            type: task.type || 'research', // research, debate, tool-creation
            topic: task.topic,
            frequency: task.frequency, // hourly, daily, weekly
            interval: task.interval, // hours for hourly
            dayOfWeek: task.dayOfWeek, // 0-6 for weekly
            hour: task.hour, // 0-23 for daily/weekly
            enabled: task.enabled ?? true,
            lastRun: null,
            nextRun: this.calculateNextRun(task),
            options: task.options || {}
        };
        
        this.schedule.tasks.push(scheduledTask);
        this.saveSchedule();
        
        console.log(`📅 Scheduled: ${task.name}`);
        console.log(`   Frequency: ${task.frequency}`);
        console.log(`   Next run: ${scheduledTask.nextRun}`);
        
        return scheduledTask;
    }

    calculateNextRun(task) {
        const now = new Date();
        let next = new Date(now);
        
        switch (task.frequency) {
            case 'hourly':
                next.setHours(now.getHours() + (task.interval || 1));
                next.setMinutes(0);
                next.setSeconds(0);
                break;
                
            case 'daily':
                next.setDate(now.getDate() + 1);
                next.setHours(task.hour || 9, 0, 0, 0);
                break;
                
            case 'weekly':
                const daysUntil = (task.dayOfWeek - now.getDay() + 7) % 7 || 7;
                next.setDate(now.getDate() + daysUntil);
                next.setHours(task.hour || 9, 0, 0, 0);
                break;
                
            default:
                next = null;
        }
        
        return next?.toISOString() || null;
    }

    // Remove a scheduled task
    removeTask(taskId) {
        this.schedule.tasks = this.schedule.tasks.filter(t => t.id !== taskId);
        this.saveSchedule();
        return { success: true };
    }

    // Enable/disable schedule
    enable(enabled = true) {
        this.schedule.enabled = enabled;
        this.saveSchedule();
        
        if (enabled) {
            this.start();
        } else {
            this.stop();
        }
        
        return { enabled };
    }

    // Start the continuous learning loop
    start() {
        if (this.isRunning) {
            console.log('⚠️  Continuous learning already running');
            return;
        }
        
        this.isRunning = true;
        this.schedule.enabled = true;
        this.saveSchedule();
        
        console.log('🚀 Starting continuous learning loop...');
        console.log(`   Scheduled tasks: ${this.schedule.tasks.length}`);
        
        // Check every minute for tasks to run
        this.checkInterval = setInterval(() => {
            this.checkAndRunTasks();
        }, 60000); // 1 minute
        
        // Initial check
        this.checkAndRunTasks();
    }

    // Stop the continuous learning loop
    stop() {
        this.isRunning = false;
        this.schedule.enabled = false;
        
        // Clear all intervals
        this.intervalIds.forEach(id => clearInterval(id));
        this.intervalIds = [];
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        this.saveSchedule();
        console.log('⏹️  Continuous learning stopped');
    }

    // Check and run due tasks
    async checkAndRunTasks() {
        if (!this.isRunning || !this.sessionRunner) return;
        
        const now = new Date();
        
        for (const task of this.schedule.tasks) {
            if (!task.enabled) continue;
            
            const nextRun = new Date(task.nextRun);
            
            if (now >= nextRun) {
                console.log(`\n${'='.repeat(50)}`);
                console.log(`📌 Running scheduled task: ${task.name}`);
                console.log(`${'='.repeat(50)}`);
                
                try {
                    await this.runTask(task);
                    
                    // Update last run time
                    task.lastRun = now.toISOString();
                    task.nextRun = this.calculateNextRun(task).toISOString();
                    
                    console.log(`✅ Task complete. Next: ${task.nextRun}`);
                } catch (error) {
                    console.error(`❌ Task failed: ${error.message}`);
                    // Retry in 5 minutes
                    task.nextRun = new Date(now.getTime() + 300000).toISOString();
                }
                
                this.saveSchedule();
            }
        }
        
        this.schedule.lastRun = now.toISOString();
    }

    // Run a specific task type
    async runTask(task) {
        switch (task.type) {
            case 'research':
                // Run research session
                await this.sessionRunner.runResearchSession?.(task.topic, task.options);
                break;
                
            case 'debate':
                // Run debate
                await this.sessionRunner.runDebate?.(task.topic, task.options);
                break;
                
            case 'tool-creation':
                // Discover and create tools
                await this.sessionRunner.discoverTools?.();
                break;
                
            case 'reflection':
                // Run reflection
                await this.sessionRunner.runReflection?.();
                break;
                
            case 'health-check':
                // Check system health
                await this.sessionRunner.healthCheck?.();
                break;
                
            default:
                console.log(`Unknown task type: ${task.type}`);
        }
    }

    // Get schedule status
    getStatus() {
        const now = new Date();
        
        return {
            running: this.isRunning,
            enabled: this.schedule.enabled,
            tasks: this.schedule.tasks.map(t => ({
                id: t.id,
                name: t.name,
                type: t.type,
                frequency: t.frequency,
                enabled: t.enabled,
                lastRun: t.lastRun,
                nextRun: t.nextRun,
                due: new Date(t.nextRun) <= now
            })),
            lastCheck: this.schedule.lastRun
        };
    }

    // Quick add common tasks
    addDefaultTasks() {
        // Daily research on tech news
        this.addTask({
            name: 'Daily Tech Research',
            type: 'research',
            topic: 'latest technology news AI machine learning',
            frequency: 'daily',
            hour: 9,
            options: { tasksPerSession: 3 }
        });
        
        // Weekly debate
        this.addTask({
            name: 'Weekly AI Debate',
            type: 'debate',
            topic: 'AI safety and regulation',
            frequency: 'weekly',
            dayOfWeek: 1, // Monday
            hour: 10,
            options: { rounds: 3 }
        });
        
        // Daily reflection
        this.addTask({
            name: 'Daily Reflection',
            type: 'reflection',
            frequency: 'daily',
            hour: 20
        });
        
        // Hourly health check
        this.addTask({
            name: 'Hourly Health Check',
            type: 'health-check',
            frequency: 'hourly',
            interval: 1
        });
        
        return this.schedule.tasks;
    }
}

// CLI
function printUsage() {
    console.log(`
Continuous Learning Loop CLI
===========================

Usage: node lib/continuous-loop.js <command> [options]

Commands:
  start              Start the continuous learning loop
  stop               Stop the loop
  status             Show schedule status
  add <type> <topic> Add a scheduled task
  remove <id>        Remove a task
  default            Add default scheduled tasks
  run <id>           Run a task immediately

Examples:
  node lib/continuous-loop.js start
  node lib/continuous-loop.js add research "AI safety"
  node lib/continuous-loop.js add debate "Is AI dangerous?"
  node lib/continuous-loop.js status
`);
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    // Create continuous loop (would need proper session runner in real usage)
    const loop = new ContinuousLearningLoop();
    
    switch (command) {
        case 'start':
            loop.start();
            break;
            
        case 'stop':
            loop.stop();
            break;
            
        case 'status':
            console.log(JSON.stringify(loop.getStatus(), null, 2));
            break;
            
        case 'add':
            const type = args[1];
            const topic = args.slice(2).join(' ');
            
            if (!type) {
                console.log('Usage: add <research|debate|reflection|health-check> [topic]');
                process.exit(1);
            }
            
            loop.addTask({
                name: `${type} - ${topic || 'general'}`,
                type,
                topic,
                frequency: args.find(a => a.includes('--'))?.split('=')[1] || 'daily',
                hour: 9
            });
            break;
            
        case 'remove':
            console.log(loop.removeTask(args[1]));
            break;
            
        case 'default':
            console.log('Adding default tasks...');
            loop.addDefaultTasks();
            break;
            
        case 'run':
            // Run immediately
            const task = loop.schedule.tasks.find(t => t.id === args[1]);
            if (task) {
                console.log(`Running task: ${task.name}`);
                // Would need session runner
            }
            break;
            
        default:
            printUsage();
    }
}

export default ContinuousLearningLoop;

main();
