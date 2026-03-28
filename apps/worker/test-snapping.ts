import { snapToNode } from './src/utils/tree-sitter-analyzer.js';

const testCode = `
def foo():
    x = 10
    if x > 5:
        print("large")
`;

function test() {
  console.log('Testing Coordinate Snapping...');
  
  // AI reports issue on line 4 (the if statement) but maybe column 0
  const issueLine = 4;
  const issueCol = 0;
  
  const snapped = snapToNode(testCode, issueLine, issueCol);
  console.log(`Original: Line ${issueLine}, Col ${issueCol}`);
  console.log(`Snapped:  Line ${snapped?.line}, Col ${snapped?.col}, EndLine ${snapped?.endLine}`);
  
  if (snapped?.line === 4 && snapped?.col === 4) {
    console.log('SUCCESS: Snapped to correct indentation/node start.');
  } else {
    console.log('FAILURE: Snapped to incorrect node.');
  }
}

test();
