/**
 * SYSTEM PROMPT MODULES
 * These can be combined based on the analysis mode.
 */

export const BASE_SYSTEM_PROMPT = `
You are an elite Senior Software Engineer and Code Architect.
Your goal is to perform a deep semantic analysis of the provided code.
`.trim();

export const OPTIMIZATION_MODULE = `
CORE OBJECTIVES:
1. TIME COMPLEXITY: First of all identify what the code is for . Identify current time complexity , through algorithms , and try to optimise it , make sure that the use case of the code doesn't change , it's okay if time complexity is not improved
2. SPACE COMPLEXITY: Identify excessive memory usage or unnecessary allocations.
3. REDUNDANCY: Identify duplicate logic, boilerplate, and suggest DRY patterns.
`.trim();

export const ARCHITECTURE_MODULE = `
4. PATTERN IDENTIFICATION: Suggest superior design patterns (Strategy, Factory, Memoization, etc.) if they fit.
5. SEMANTIC UNDERSTANDING: Suggest Map lookups for loops, State Machines for manual state, or Reducers.
`.trim();

export const OUTPUT_RULES_MODULE = `
OUTPUT RULES:
- PRIORITIZE: Report the most critical issues first. High-severity bugs and performance bottlenecks must appear at the top of your list.
- Use the report_issue tool for every finding.
- Be precise with line numbers.
- Provide a "suggestion" explaining the better pattern and why it's faster/cleaner.
- Mark as fixable only if the problem can be replaced with a concise code block.
- Add comments for clarity, keep them short and precise.
`.trim();

export const ANALYSIS_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

${OPTIMIZATION_MODULE}
${ARCHITECTURE_MODULE}

${OUTPUT_RULES_MODULE}
`.trim();

/**
 * CONTEXT BUILDERS
 * Use these to ground the LLM in specific project/code metadata.
 */

export function buildASTContext(metrics: {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  depth: number;
  functionCount: number;
}): string {
  return `
[AST ANALYSIS DATA]
- Cyclomatic Complexity: ${metrics.cyclomaticComplexity} (High risk if > 10)
- Cognitive Complexity: ${metrics.cognitiveComplexity}
- Nesting Depth: ${metrics.depth}
- Total Functions: ${metrics.functionCount}
`.trim();
}

export function buildRAGContext(similarChunks: string[]): string {
  if (similarChunks.length === 0) return '';
  return `
[SIMILAR CODE EXAMPLES FROM PROJECT]
${similarChunks.map((chunk, i) => `Example ${i + 1}:\n${chunk}`).join('\n---\n')}
`.trim();
}

/**
 * USER PROMPT BUILDERS
 */

export function buildAnalysisUserPrompt(
  language: string, 
  code: string, 
  astContext?: string, 
  ragContext?: string
): string {
  const lines = code.split('\n');
  const numberedCode = lines.map((line, i) => `${i + 1} | ${line}`).join('\n');

  return `
Analyze this ${language} code for complexity, redundancy, and architectural improvements.

${astContext || ''}

${ragContext || ''}

[SOURCE CODE TO ANALYZE]
(Line numbers are provided as "LINE | CODE" for your reference. ALWAYS report the exact line number from this list.)
${numberedCode}
`.trim();
}

export function buildFixPrompt(language: string, issueMessage: string, codeSnippet: string): string {
  return `
Generate an optimized, high-performance code fix for this ${language} issue.
        
Issue: ${issueMessage}
Context: ${codeSnippet}

FIX REQUIREMENTS:
- Optimize for Time and Space Complexity.
- Eliminate all redundancy.
- Use the best possible architectural pattern for this problem.
- DO add comments for clarity , keep them short and precise.
- Return ONLY the fixed code block wrapped in triple backticks.
`.trim();
}
