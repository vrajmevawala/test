import { buildAnalysisSystemPrompt } from '../packages/utils/src/ai/prompts.js';

console.log('--- C++ SYSTEM PROMPT ---');
console.log(buildAnalysisSystemPrompt('cpp'));

console.log('\n--- PYTHON SYSTEM PROMPT ---');
console.log(buildAnalysisSystemPrompt('python'));
