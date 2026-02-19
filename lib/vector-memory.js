// Vector Database Integration using ChromaDB
// Enables semantic search for knowledge retrieval

import Chroma from 'chroma-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VectorMemory {
    constructor(options = {}) {
        this.persistPath = options.persistPath || './vector-memory';
        this.collectionName = options.collectionName || 'magnitude-knowledge';
        this.embeddingDim = options.embeddingDim || 384;
        
        this.collection = null;
        this.initialized = false;
        
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.persistPath)) {
            fs.mkdirSync(this.persistPath, { recursive: true });
        }
    }

    // Initialize Chroma client
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Using chroma-js client (in-memory for simplicity)
            this.client = new Chroma.Client({
                path: this.persistPath
            });
            
            // Create or get collection
            this.collection = await this.client.getOrCreateCollection({
                name: this.collectionName
            });
            
            this.initialized = true;
            console.log('✅ Vector memory initialized');
        } catch (error) {
            console.error('❌ Failed to initialize vector DB:', error.message);
            // Fallback to simple embedding
            this.initialized = false;
        }
    }

    // Generate embedding (using simple hash-based for fallback)
    generateEmbedding(text) {
        // Simple hash-based embedding for fallback
        // In production, use OpenAI embeddings or similar
        const hash = this.simpleHash(text);
        const embedding = new Array(this.embeddingDim).fill(0);
        
        for (let i = 0; i < this.embeddingDim; i++) {
            embedding[i] = Math.sin(hash * (i + 1)) * Math.cos(hash * (i + 1));
        }
        
        // Normalize
        const mag = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0));
        return embedding.map(x => x / mag);
    }

    simpleHash(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) / 1e10;
    }

    // Add knowledge with embedding
    async add(id, document, metadata = {}) {
        if (!this.initialized) {
            console.log('⚠️  Vector DB not initialized, using fallback');
            return this.addFallback(id, document, metadata);
        }

        try {
            const embedding = this.generateEmbedding(document);
            
            await this.collection.add({
                ids: [id],
                embeddings: [embedding],
                documents: [document],
                metadatas: [{ ...metadata, id }]
            });
            
            return { success: true, id };
        } catch (error) {
            console.error('Vector add error:', error.message);
            return this.addFallback(id, document, metadata);
        }
    }

    // Simple fallback without vector DB
    addFallback(id, document, metadata) {
        const fallbackPath = path.join(this.persistPath, 'documents.json');
        let docs = {};
        
        if (fs.existsSync(fallbackPath)) {
            docs = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
        }
        
        docs[id] = { document, metadata, addedAt: new Date().toISOString() };
        fs.writeFileSync(fallbackPath, JSON.stringify(docs, null, 2));
        
        return { success: true, id, fallback: true };
    }

    // Semantic search
    async search(query, nResults = 5) {
        if (!this.initialized) {
            return this.searchFallback(query, nResults);
        }

        try {
            const queryEmbedding = this.generateEmbedding(query);
            
            const results = await this.collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults
            });
            
            return {
                ids: results.ids[0] || [],
                documents: results.documents[0] || [],
                distances: results.distances?.[0] || [],
                metadatas: results.metadatas?.[0] || []
            };
        } catch (error) {
            console.error('Vector search error:', error.message);
            return this.searchFallback(query, nResults);
        }
    }

    // Fallback search (simple keyword)
    searchFallback(query, nResults) {
        const fallbackPath = path.join(this.persistPath, 'documents.json');
        
        if (!fs.existsSync(fallbackPath)) {
            return { ids: [], documents: [], distances: [] };
        }
        
        const docs = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
        const queryLower = query.toLowerCase();
        
        // Score by keyword matching
        const scored = Object.entries(docs).map(([id, data]) => {
            const docLower = data.document.toLowerCase();
            let score = 0;
            
            // Count keyword matches
            const queryWords = queryLower.split(' ');
            for (const word of queryWords) {
                if (docLower.includes(word)) score++;
            }
            
            return { id, ...data, score };
        });
        
        // Sort by score and take top n
        scored.sort((a, b) => b.score - a.score);
        
        const results = scored.slice(0, nResults);
        
        return {
            ids: results.map(r => r.id),
            documents: results.map(r => r.document),
            distances: results.map(r => 1 / (r.score + 1)),
            metadatas: results.map(r => r.metadata)
        };
    }

    // Delete by ID
    async delete(id) {
        if (!this.initialized) {
            return this.deleteFallback(id);
        }

        try {
            await this.collection.delete({ ids: [id] });
            return { success: true };
        } catch (error) {
            return this.deleteFallback(id);
        }
    }

    deleteFallback(id) {
        const fallbackPath = path.join(this.persistPath, 'documents.json');
        if (fs.existsSync(fallbackPath)) {
            const docs = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
            delete docs[id];
            fs.writeFileSync(fallbackPath, JSON.stringify(docs, null, 2));
        }
        return { success: true };
    }

    // Get collection stats
    async getStats() {
        if (!this.initialized) {
            const fallbackPath = path.join(this.persistPath, 'documents.json');
            const count = fs.existsSync(fallbackPath) 
                ? Object.keys(JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'))).length 
                : 0;
            return { count, mode: 'fallback' };
        }

        try {
            const count = await this.collection.count();
            return { count, mode: 'chroma' };
        } catch {
            return { count: 0, mode: 'error' };
        }
    }

    // Similarity search - find related concepts
    async findSimilar(documentId, nResults = 5) {
        // Get the original document
        const results = await this.collection.get({ ids: [documentId] });
        
        if (!results.documents?.[0]) {
            return { error: 'Document not found' };
        }
        
        // Search for similar
        return this.search(results.documents[0], nResults);
    }

    // Bulk add from existing knowledge
    async bulkAdd(knowledgeItems) {
        const ids = [];
        const embeddings = [];
        const documents = [];
        const metadatas = [];

        for (const item of knowledgeItems) {
            ids.push(item.id);
            embeddings.push(this.generateEmbedding(item.content));
            documents.push(item.content);
            metadatas.push(item.metadata || {});
        }

        try {
            await this.collection.add({ ids, embeddings, documents, metadatas });
            return { success: true, count: ids.length };
        } catch (error) {
            console.error('Bulk add error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Clear all
    async clear() {
        if (!this.initialized) {
            const fallbackPath = path.join(this.persistPath, 'documents.json');
            if (fs.existsSync(fallbackPath)) {
                fs.unlinkSync(fallbackPath);
            }
            return { success: true };
        }

        try {
            await this.collection.delete({ where: {} });
            return { success: true };
        } catch {
            return { success: false };
        }
    }
}

// OpenAI Embeddings version (for production)
class OpenAIEmbeddings {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async embed(text) {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: text
            })
        });
        
        const data = await response.json();
        return data.data[0].embedding;
    }
}

export { VectorMemory, OpenAIEmbeddings };
