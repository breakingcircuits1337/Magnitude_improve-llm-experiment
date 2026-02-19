# Magnitude: LLM Self-Improvement Framework

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.7.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/Type-Multi--Agent-orange" alt="Type">
</p>

## From Directive to Framework: Autonomous Skill Acquisition

> *"Do whatever you need to use the browser."*

**Magnitude** is an experimental framework for turning open-source LLM architectures into autonomous agents capable of self-directed learning through persistent memory and multi-agent collaboration.

## What's New in v2.7

- **🌐 Web Learning** - Agent uses Magnitude browser to research on the web
- **🔍 Live Research** - Real web browsing for knowledge acquisition
- **📖 Content Extraction** - Extract structured data from websites

## What's New in v2.6

- **🛠️ Tool Creation** - Agent builds reusable tools from discovered needs
- **🤖 Auto-Generation** - LLM generates tool code
- **📦 Tool Registry** - Track and manage created tools
- **🔍 Need Discovery** - Find automation opportunities from research

## What's New in v2.5

- **🔎 Vector Memory** - ChromaDB-based semantic search
- **🧠 Semantic Search** - Find related concepts, not just keywords
- **📊 Similarity Scoring** - Know how relevant results are
- **🔄 Auto-Indexing** - New knowledge automatically vectorized

## What's New in v2.4

- **👤 Human Feedback Loop** - Queue items for human review
- **📝 Review System** - Approve/reject with corrections
- **🎯 Auto-Queue** - Low confidence items auto-queued for review
- **📊 Feedback Analytics** - Learn from human corrections

## What's New in v2.3

- **⚖️ Multi-Agent Debate** - Mistral 3 Large vs Kimi K2 Thinking debate system
- **☁️ Azure Integration** - Uses your Azure-hosted LLMs for debate
- **🔄 Nuanced Synthesis** - Kimi synthesizes balanced conclusions

## What's New in v2.2

- **🔧 Self-Modification** - Agent analyzes failures and modifies its own code
- **🪞 Reflection Agent** - Analyzes session performance and suggests improvements
- **📈 Pattern Recognition** - Identifies trends across multiple sessions
- **💾 Auto-Backups** - Automatic backups before modifications

## What's New in v2.0

- **🧠 Persistent Memory System** - Knowledge persists between sessions
- **👥 Multi-Agent Architecture** - Research, Verification, and Synthesis agents
- **📊 Evaluation Metrics** - Track improvement over time
- **🎯 Dynamic Task Generation** - Identifies and fills knowledge gaps
- **🔄 Knowledge Synthesis** - Combines findings into insights

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Magnitude Framework                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Research   │  │  Verification│  │  Synthesis   │  │
│  │    Agent     │─▶│    Agent     │─▶│    Agent     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                                   │           │
│         └───────────┬───────────────────────┘           │
│                     ▼                                     │
│            ┌────────────────┐                            │
│            │  Memory System │                            │
│            │  (Persistent)   │                            │
│            └────────────────┘                            │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Run a self-improvement session
npm start

# Run in headless mode
npm start -- --headless

# Custom session options
npm start -- --tasks=10 --name=my_session
```

## CLI Commands

```bash
# View current stats
npm run stats

# See knowledge gaps
npm run gaps

# Export all knowledge
npm run export
```

## Memory System

The framework maintains persistent memory across sessions:

```javascript
import { MemorySystem } from './lib/memory.js';

const memory = new MemorySystem('./memory');

// Add knowledge
memory.addKnowledge({
    topic: "AI Safety",
    content: "...",
    tags: ["ai", "safety"]
});

// Search knowledge
const results = memory.searchKnowledge("AI safety");

// Identify gaps
const gaps = memory.identifyGaps();

// Get statistics
const stats = memory.getStats();
```

## Multi-Agent System

### Research Agent
Autonomously researches topics using browser automation.

### Verification Agent
Evaluates quality, accuracy, and relevance of findings.

### Synthesis Agent
Combines related knowledge into insights.

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `headless` | false | Run browser in headless mode |
| `tasksPerSession` | 5 | Number of tasks per session |
| `memoryPath` | ./memory | Path to memory storage |

## Files

```
Magnitude/
├── index.js           # Main entry point
├── package.json       # Dependencies
├── .gitignore         # Git ignore rules
├── README.md          # This file
├── lib/
│   └── memory.js      # Memory system
├── agents/
│   └── index.js       # Multi-agent system
└── memory/            # Persistent storage (created at runtime)
    ├── knowledge.json
    ├── metrics.json
    └── evaluation.json
```

## Evaluation

Track improvement with built-in metrics:

- **Quality Score**: 0-1 rating of task completion
- **Verification Rate**: % of research passing verification
- **Knowledge Growth**: Entries added per session
- **Gap Closure**: Progress on identified knowledge gaps

## Research Notes

This project documents the evolution from:
1. **Clawdbot Phase** (v1): Basic browser automation
2. **Framework Phase** (v2): Multi-agent with memory

## Contributing

This is a "proof of possibility." To expand:

1. Fork the repository
2. Implement new agent types
3. Add evaluation metrics
4. Share results

## License

MIT

---

*Built with 🔬 by BreakingCircuits*
