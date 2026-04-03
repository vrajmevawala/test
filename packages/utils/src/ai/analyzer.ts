async function getParser(language: string = 'python') {
  try {
    const { default: Parser } = await import('tree-sitter');
    const parser = new Parser();
    const lang = language.toLowerCase();
    if (lang === 'cpp' || lang === 'c++') {
      const { default: Cpp } = await import('tree-sitter-cpp');
      parser.setLanguage(Cpp as any);
    } else {
      const { default: Python } = await import('tree-sitter-python');
      parser.setLanguage(Python as any);
    }
    return { Parser, parser };
  } catch (err) {
    console.warn(`[Tree-sitter] Native module failure: ${language}. Falling back to semantic patterns.`, String(err));
    return null;
  }
}

export interface ASTMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  depth: number;
  functionCount: number;
  classCount: number;
  functions: Array<{
    name: string;
    line: number;
    col: number;
    complexity: number;
  }>;
}

/**
 * SEMANTIC FALLBACK (RegExp-based)
 * Used when native tree-sitter modules cannot be loaded.
 */
function getSemanticFallbackMetrics(code: string, language: string): ASTMetrics {
  const lines = code.split('\n');
  const metrics: ASTMetrics = {
    cyclomaticComplexity: 1,
    cognitiveComplexity: 0,
    depth: 0,
    functionCount: 0,
    classCount: 0,
    functions: []
  };

  const isCpp = ['cpp', 'c++'].includes(language.toLowerCase());
  
  // Basic control flow patterns
  const patterns = [
    /\bif\b/g, /\bfor\b/g, /\bwhile\b/g, /\bswitch\b/g, /\bcatch\b/g, /\bthrow\b/g,
    /\?.*:/g, // Ternary
    /\belse if\b/g,
  ];

  // Function patterns
  const funcPattern = isCpp 
    ? /[\w:<>]+\s+[\w:<>]+\s*\([^)]*\)\s*\{/g // C++ function/method
    : /\bdef\s+(\w+)\s*\(/g; // Python def

  const classPattern = isCpp ? /\bclass\s+\w+/g : /\bclass\s+(\w+)\s*(\(.*\))?\s*:/g;

  let currentNesting = 0;
  
  lines.forEach((line, i) => {
    // Basic nesting estimation (based on braces for C++, indentation for Python)
    if (isCpp) {
      if (line.includes('{')) {
        currentNesting++;
        metrics.depth = Math.max(metrics.depth, currentNesting);
      }
      if (line.includes('}')) {
        currentNesting = Math.max(0, currentNesting - 1);
      }
    } else {
      // Python indentation estimation
      const indent = line.match(/^\s*/)?.[0].length || 0;
      const level = Math.floor(indent / 4);
      metrics.depth = Math.max(metrics.depth, level);
      currentNesting = level;
    }

    // Cyclomatic & Cognitive Count
    patterns.forEach(p => {
      const matches = line.match(p);
      if (matches) {
        metrics.cyclomaticComplexity += matches.length;
        // Cognitive complexity increases with nesting depth
        metrics.cognitiveComplexity += matches.length * (1 + currentNesting);
      }
    });

    // Detect functions
    const funcMatch = line.match(funcPattern);
    if (funcMatch) {
      metrics.functionCount++;
      metrics.functions.push({
        name: 'detected_func',
        line: i + 1,
        col: line.indexOf(funcMatch[0]),
        complexity: 1
      });
    }

    // Detect classes
    if (line.match(classPattern)) metrics.classCount++;
  });

  return metrics;
}

const COMPLEXITY_NODES = new Set([
  'if_statement', 'for_statement', 'while_statement', 'do_statement', 'switch_statement', 
  'case_clause', 'conditional_expression', 'try_statement', 'catch_clause', 'throw_statement',
  'with_statement', 'except_clause', 'boolean_operator', 'for_range_loop', 'if_constexpr_statement',
]);

const FUNCTION_NODES = new Set(['function_definition', 'method_definition', 'function_declaration', 'template_declaration']);

export async function getTreeSitterAnalysis(code: string, language: string = 'python'): Promise<ASTMetrics> {
  const result = await getParser(language);
  
  // If native parser fails, return semantic fallback metrics instead of null/0
  if (!result) return getSemanticFallbackMetrics(code, language);

  const { parser } = result;
  try {
    const tree = parser.parse(code);
    const metrics: ASTMetrics = {
      cyclomaticComplexity: 1, 
      cognitiveComplexity: 0,
      depth: 0,
      functionCount: 0,
      classCount: 0,
      functions: []
    };

    let currentDepth = 0;

    function traverse(node: any) {
      const isControlFlow = COMPLEXITY_NODES.has(node.type);
      if (isControlFlow) {
        metrics.cyclomaticComplexity++;
        metrics.cognitiveComplexity += (1 + currentDepth);
      }
      if (FUNCTION_NODES.has(node.type)) {
        if (node.type.includes('definition')) metrics.functionCount++;
        const nameNode = node.childForFieldName('name') || node.childForFieldName('declarator');
        let localComplexity = 1;
        const functionTraverse = (n: any) => {
          if (COMPLEXITY_NODES.has(n.type)) localComplexity++;
          for (let i = 0; i < n.childCount; i++) functionTraverse(n.child(i)!);
        };
        const body = node.childForFieldName('body') || node.childForFieldName('compound_statement');
        if (body) functionTraverse(body);
        if (node.type.includes('definition')) {
          metrics.functions.push({ name: nameNode?.text || 'anonymous', line: node.startPosition.row + 1, col: node.startPosition.column, complexity: localComplexity });
        }
        currentDepth++;
        metrics.depth = Math.max(metrics.depth, currentDepth);
        for (let i = 0; i < node.childCount; i++) traverse(node.child(i)!);
        currentDepth--;
      } else if (node.type === 'class_definition' || node.type === 'struct_specifier') {
        metrics.classCount++;
        currentDepth++;
        metrics.depth = Math.max(metrics.depth, currentDepth);
        for (let i = 0; i < node.childCount; i++) traverse(node.child(i)!);
        currentDepth--;
      } else {
        for (let i = 0; i < node.childCount; i++) traverse(node.child(i)!);
      }
    }

    traverse(tree.rootNode);
    return metrics;
  } catch (err) {
    console.error('[Tree-sitter] Analysis error:', err);
    return getSemanticFallbackMetrics(code, language);
  }
}

export async function snapToNode(code: string, line: number, col: number = 0): Promise<{ line: number, col: number, endLine: number, endCol: number } | null> {
  const result = await getParser();
  if (!result) return null;
  const { parser } = result;
  try {
    const tree = parser.parse(code);
    const lineCandidates = [line, line - 1, line + 1];
    for (const targetLine of lineCandidates) {
      const targetRow = targetLine - 1;
      let bestNode: any | null = null;
      function findBest(node: any) {
        const start = node.startPosition;
        const end = node.endPosition;
        if (start.row <= targetRow && end.row >= targetRow) {
          if (col > 0) {
            if (start.row === targetRow && start.column <= col && end.column >= col) {
              if (!bestNode || node.text.length < bestNode.text.length) bestNode = node;
            }
          } 
          else if (start.row === targetRow) {
             const isStatement = node.type.includes('statement') || node.type.includes('definition');
             if (!bestNode || (isStatement && !bestNode.type.includes('statement'))) bestNode = node;
          }
        }
        for (let i = 0; i < node.childCount; i++) findBest(node.child(i)!);
      }
      findBest(tree.rootNode);
      if (bestNode) {
        return { line: bestNode.startPosition.row + 1, col: bestNode.startPosition.column, endLine: bestNode.endPosition.row + 1, endCol: bestNode.endPosition.column };
      }
    }
  } catch (err) { console.error('[Tree-sitter] Snap error:', err); }
  return null;
}
