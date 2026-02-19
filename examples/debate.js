// Example: Run Multi-Agent Debate
// Uses Mistral 3 Large vs Kimi K2 Thinking

import DebateAgent from '../agents/debate.js';

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Multi-Agent Debate Example');
        console.log('============================');
        console.log('Usage: node examples/debate.js "<topic>" [--rounds=3]');
        console.log('');
        console.log('Example topics:');
        console.log('  "Is AI dangerous for humanity?"');
        console.log('  "Should AI be regulated?"');
        console.log('  "Will AI replace programmers?"');
        process.exit(1);
    }

    const topic = args[0];
    const rounds = parseInt(args.find(a => a.startsWith('--rounds='))?.split('=')[1]) || 3;

    const debate = new DebateAgent({
        maxRounds: rounds,
        mistralPath: '/home/sarah/opencode-bc/models/mistral.py',
        kimiPath: '/home/sarah/opencode-bc/models/kimi.py'
    });

    console.log('Starting debate...\n');

    const result = await debate.debate(topic);

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL SYNTHESIS');
    console.log('='.repeat(60));

    if (result.synthesis.proponent_summary) {
        console.log('\n📗 PRO (Mistral):');
        console.log(result.synthesis.proponent_summary);
    }

    if (result.synthesis.opponent_summary) {
        console.log('\n📕 CON (Kimi):');
        console.log(result.synthesis.opponent_summary);
    }

    if (result.synthesis.key_disagreements) {
        console.log('\n⚡ Key Disagreements:');
        result.synthesis.key_disagreements.forEach(d => console.log(`  - ${d}`));
    }

    if (result.synthesis.conclusion) {
        console.log('\n💡 Conclusion:');
        console.log(result.synthesis.conclusion);
    }

    console.log('\n✅ Debate complete!');
}

main().catch(console.error);
