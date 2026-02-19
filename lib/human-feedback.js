// Human Feedback Loop System
// Queues items for human review and learns from corrections

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HumanFeedbackLoop {
    constructor(options = {}) {
        this.feedbackPath = options.feedbackPath || './feedback';
        this.queue = [];
        this.approved = [];
        this.rejected = [];
        this.pending = [];
        
        this.ensureDirectories();
        this.loadQueue();
    }

    ensureDirectories() {
        const dirs = ['pending', 'approved', 'rejected', 'reviews'];
        dirs.forEach(dir => {
            if (!fs.existsSync(path.join(this.feedbackPath, dir))) {
                fs.mkdirSync(path.join(this.feedbackPath, dir), { recursive: true });
            }
        });
    }

    loadQueue() {
        try {
            const pendingFile = path.join(this.feedbackPath, 'pending', 'queue.json');
            if (fs.existsSync(pendingFile)) {
                this.pending = JSON.parse(fs.readFileSync(pendingFile, 'utf-8'));
            }
            
            const approvedFile = path.join(this.feedbackPath, 'approved', 'approved.json');
            if (fs.existsSync(approvedFile)) {
                this.approved = JSON.parse(fs.readFileSync(approvedFile, 'utf-8'));
            }
            
            const rejectedFile = path.join(this.feedbackPath, 'rejected', 'rejected.json');
            if (fs.existsSync(rejectedFile)) {
                this.rejected = JSON.parse(fs.readFileSync(rejectedFile, 'utf-8'));
            }
        } catch (e) {
            console.log('⚠️  Could not load feedback queue');
        }
    }

    saveQueue() {
        try {
            fs.writeFileSync(
                path.join(this.feedbackPath, 'pending', 'queue.json'),
                JSON.stringify(this.pending, null, 2)
            );
            fs.writeFileSync(
                path.join(this.feedbackPath, 'approved', 'approved.json'),
                JSON.stringify(this.approved, null, 2)
            );
            fs.writeFileSync(
                path.join(this.feedbackPath, 'rejected', 'rejected.json'),
                JSON.stringify(this.rejected, null, 2)
            );
        } catch (e) {
            console.error('Failed to save queue:', e);
        }
    }

    // Queue an item for human review
    queueForReview(item) {
        const feedbackItem = {
            id: uuidv4(),
            ...item,
            status: 'pending',
            createdAt: new Date().toISOString(),
            reviewedAt: null,
            reviewer: null,
            comments: null,
            corrections: null,
            rating: null
        };
        
        this.pending.push(feedbackItem);
        
        // Save to file
        fs.writeFileSync(
            path.join(this.feedbackPath, 'pending', `${feedbackItem.id}.json`),
            JSON.stringify(feedbackItem, null, 2)
        );
        
        this.saveQueue();
        
        console.log(`📝 Queued for review: ${feedbackItem.id}`);
        console.log(`   Type: ${feedbackItem.type}`);
        console.log(`   Content: ${feedbackItem.content?.slice(0, 100)}...`);
        
        return feedbackItem;
    }

    // Get pending items
    getPending() {
        return this.pending;
    }

    // Get item by ID
    getItem(id) {
        return this.pending.find(i => i.id === id) ||
               this.approved.find(i => i.id === id) ||
               this.rejected.find(i => i.id === id);
    }

    // Submit review (approve or reject)
    async submitReview(id, review) {
        const index = this.pending.findIndex(i => i.id === id);
        if (index === -1) {
            return { success: false, error: 'Item not found' };
        }

        const item = this.pending[index];
        
        item.status = review.approved ? 'approved' : 'rejected';
        item.reviewedAt = new Date().toISOString();
        item.reviewer = review.reviewer || 'human';
        item.comments = review.comments;
        item.corrections = review.corrections;
        item.rating = review.rating; // 1-5
        
        // Move from pending to approved/rejected
        this.pending.splice(index, 1);
        
        if (review.approved) {
            this.approved.push(item);
        } else {
            this.rejected.push(item);
        }
        
        // Save to file
        const destDir = review.approved ? 'approved' : 'rejected';
        fs.writeFileSync(
            path.join(this.feedbackPath, destDir, `${item.id}.json`),
            JSON.stringify(item, null, 2)
        );
        
        // Delete from pending
        const pendingFile = path.join(this.feedbackPath, 'pending', `${item.id}.json`);
        if (fs.existsSync(pendingFile)) {
            fs.unlinkSync(pendingFile);
        }
        
        this.saveQueue();
        
        console.log(`✅ Review submitted: ${id}`);
        console.log(`   Status: ${item.status}`);
        
        return { success: true, item };
    }

    // Quick approve
    approve(id, comments = '') {
        return this.submitReview(id, {
            approved: true,
            comments,
            rating: 5
        });
    }

    // Quick reject
    reject(id, reason = '') {
        return this.submitReview(id, {
            approved: false,
            comments: reason,
            rating: 1
        });
    }

    // Learn from approved items - extract patterns
    learnFromApproved() {
        if (this.approved.length === 0) {
            return { patterns: [], insights };
        }

        const patterns = {
            commonCorrections: [],
            ratingDistribution: {},
            reviewerFeedback: {}
        };

        // Analyze corrections
        const corrections = this.approved
            .filter(i => i.corrections)
            .flatMap(i => i.corrections);
        
        // Analyze ratings
        this.approved.forEach(i => {
            const rating = i.rating || 3;
            patterns.ratingDistribution[rating] = (patterns.ratingDistribution[rating] || 0) + 1;
        });

        // Analyze reviewer comments
        const allComments = this.approved
            .filter(i => i.comments)
            .map(i => i.comments)
            .join(' ');

        const insights = {
            approvedCount: this.approved.length,
            rejectedCount: this.rejected.length,
            approvalRate: this.approved.length / (this.approved.length + this.rejected.length),
            avgRating: this.approved.reduce((a, i) => a + (i.rating || 3), 0) / this.approved.length,
            topCorrections: corrections.slice(0, 10)
        };

        return { patterns, insights };
    }

    // Get items needing correction review
    getItemsNeedingCorrection() {
        return this.rejected.filter(i => i.corrections && i.corrections.length > 0);
    }

    // Auto-queue based on confidence
    autoQueue(items, confidenceThreshold = 0.7) {
        const queued = [];
        
        for (const item of items) {
            if (item.confidence < confidenceThreshold) {
                const queuedItem = this.queueForReview({
                    type: item.type,
                    content: item.content,
                    source: item.source,
                    confidence: item.confidence,
                    suggestedAction: item.suggestedAction,
                    metadata: item.metadata
                });
                queued.push(queuedItem);
            }
        }
        
        console.log(`🎯 Auto-queued ${queued.length} items for review`);
        return queued;
    }

    // Generate feedback report
    generateReport() {
        const { patterns, insights } = this.learnFromApproved();
        
        return {
            summary: {
                pending: this.pending.length,
                approved: this.approved.length,
                rejected: this.rejected.length,
                total: this.pending.length + this.approved.length + this.rejected.length
            },
            insights,
            pendingItems: this.pending.map(i => ({
                id: i.id,
                type: i.type,
                content: i.content?.slice(0, 50)
            })),
            generatedAt: new Date().toISOString()
        };
    }

    // Export feedback for training
    exportForTraining() {
        return {
            approved: this.approved.map(i => ({
                input: i.content,
                output: i.corrections || i.content,
                feedback: i.comments,
                rating: i.rating
            })),
            rejected: this.rejected.map(i => ({
                input: i.content,
                error: i.comments,
                corrections: i.corrections
            }))
        };
    }

    // Clear old items (archive)
    archiveOldItems(daysOld = 30) {
        const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
        
        const oldApproved = this.approved.filter(i => 
            new Date(i.reviewedAt).getTime() < cutoff
        );
        
        // Move to archived
        const archiveDir = path.join(this.feedbackPath, 'archived');
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }
        
        oldApproved.forEach(item => {
            fs.writeFileSync(
                path.join(archiveDir, `${item.id}.json`),
                JSON.stringify(item, null, 2)
            );
        });
        
        // Remove from active
        this.approved = this.approved.filter(i => 
            new Date(i.reviewedAt).getTime() >= cutoff
        );
        
        this.saveQueue();
        
        console.log(`📦 Archived ${oldApproved.length} old items`);
        return oldApproved.length;
    }
}

// CLI Interface
function printUsage() {
    console.log(`
Human Feedback Loop CLI
=======================

Usage: node lib/human-feedback.js <command> [options]

Commands:
  queue <type> <content>     Queue item for review
  pending                   List pending items
  approve <id> [comments]    Approve an item
  reject <id> [reason]      Reject an item  
  review <id>               Submit detailed review
  report                    Generate feedback report
  export                    Export for training

Examples:
  node lib/human-feedback.js queue research "AI safety findings..."
  node lib/human-feedback.js approve abc123 "Looks good!"
  node lib/human-feedback.js reject abc123 "Needs more detail"
  node lib/human-feedback.js report
`);
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const feedback = new HumanFeedbackLoop();
    
    switch (command) {
        case 'queue':
            if (args.length < 3) {
                console.log('Usage: queue <type> <content>');
                process.exit(1);
            }
            feedback.queueForReview({
                type: args[1],
                content: args.slice(2).join(' ')
            });
            break;
            
        case 'pending':
            const pending = feedback.getPending();
            console.log(`\n📝 Pending Reviews (${pending.length}):\n`);
            pending.forEach(p => {
                console.log(`  [${p.id.slice(0, 8)}] ${p.type}: ${p.content?.slice(0, 60)}...`);
            });
            break;
            
        case 'approve':
            if (!args[1]) {
                console.log('Usage: approve <id> [comments]');
                process.exit(1);
            }
            await feedback.approve(args[1], args.slice(2).join(' '));
            break;
            
        case 'reject':
            if (!args[1]) {
                console.log('Usage: reject <id> [reason]');
                process.exit(1);
            }
            await feedback.reject(args[1], args.slice(2).join(' '));
            break;
            
        case 'report':
            console.log(JSON.stringify(feedback.generateReport(), null, 2));
            break;
            
        case 'export':
            console.log(JSON.stringify(feedback.exportForTraining(), null, 2));
            break;
            
        default:
            printUsage();
    }
}

export default HumanFeedbackLoop;

// Run if called directly
main();
