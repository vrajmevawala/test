import Parser from 'tree-sitter';
import Python from 'tree-sitter-python';

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

const COMPLEXITY_NODES = new Set([
  'if_statement',
  'for_statement',
  'while_statement',
  'with_statement',
  'except_clause',
  'conditional_expression', // Ternary
  'boolean_operator'
]);

export function getTreeSitterAnalysis(code: string, language: string = 'python'): ASTMetrics {
  const parser = new Parser();
  
  if (language === 'python') {
    parser.setLanguage(Python as any);
  } else {
    throw new Error(`Unsupported language for Tree-sitter: ${language}`);
  }

  const tree = parser.parse(code);
  const metrics: ASTMetrics = {
    cyclomaticComplexity: 1, // Base complexity
    cognitiveComplexity: 0,
    depth: 0,
    functionCount: 0,
    classCount: 0,
    functions: []
  };

  let currentDepth = 0;

  function traverse(node: Parser.SyntaxNode) {
    const isControlFlow = COMPLEXITY_NODES.has(node.type);
    
    if (isControlFlow) {
      metrics.cyclomaticComplexity++;
      metrics.cognitiveComplexity += (1 + currentDepth);
    }

    if (node.type === 'function_definition') {
      metrics.functionCount++;
      const nameNode = node.childForFieldName('name');
      
      // Calculate function-local complexity
      let localComplexity = 1;
      const functionTraverse = (n: Parser.SyntaxNode) => {
        if (COMPLEXITY_NODES.has(n.type)) localComplexity++;
        for (let i = 0; i < n.childCount; i++) {
          functionTraverse(n.child(i)!);
        }
      };
      
      const body = node.childForFieldName('body');
      if (body) functionTraverse(body);

      metrics.functions.push({
        name: nameNode?.text || 'anonymous',
        line: node.startPosition.row + 1,
        col: node.startPosition.column,
        complexity: localComplexity
      });

      currentDepth++;
      metrics.depth = Math.max(metrics.depth, currentDepth);
      for (let i = 0; i < node.childCount; i++) traverse(node.child(i)!);
      currentDepth--;
    } else if (node.type === 'class_definition') {
      metrics.classCount++;
      currentDepth++;
      metrics.depth = Math.max(metrics.depth, currentDepth);
      for (let i = 0; i < node.childCount; i++) traverse(node.child(i)!);
      currentDepth--;
    } else {
      for (let i = 0; i < node.childCount; i++) {
        traverse(node.child(i)!);
      }
    }
  }

  traverse(tree.rootNode);
  return metrics;
}

export function snapToNode(code: string, line: number, col: number = 0): { line: number, col: number, endLine: number, endCol: number } | null {
  const parser = new Parser();
  parser.setLanguage(Python as any);
  const tree = parser.parse(code);
  
  // Try target line, then +-1 for AI off-by-one errors
  const lineCandidates = [line, line - 1, line + 1];
  
  for (const targetLine of lineCandidates) {
    const targetRow = targetLine - 1;
    let bestNode: Parser.SyntaxNode | null = null;

    function findBest(node: Parser.SyntaxNode) {
      const start = node.startPosition;
      const end = node.endPosition;

      // Check if node spans the target row
      if (start.row <= targetRow && end.row >= targetRow) {
        
        // If col is provided, we want the leafiest node containing that point
        if (col > 0) {
          if (start.row === targetRow && start.column <= col && end.column >= col) {
            if (!bestNode || node.text.length < bestNode.text.length) {
              bestNode = node;
            }
          }
        } 
        // If col is NOT provided (common), find the primary statement starting on this line
        else if (start.row === targetRow) {
           // We prefer statements/definitions over symbols or blocks
           const isStatement = node.type.includes('statement') || node.type.includes('definition');
           if (!bestNode || (isStatement && !bestNode.type.includes('statement'))) {
             bestNode = node;
           }
        }
      }

      for (let i = 0; i < node.childCount; i++) {
        findBest(node.child(i)!);
      }
    }

    findBest(tree.rootNode);

    if (bestNode) {
      const node = bestNode as Parser.SyntaxNode;
      return {
        line: node.startPosition.row + 1,
        col: node.startPosition.column,
        endLine: node.endPosition.row + 1,
        endCol: node.endPosition.column
      };
    }
  }

  return null;
}
