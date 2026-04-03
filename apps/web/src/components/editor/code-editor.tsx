'use client';
import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { Issue } from '@/types';

interface CodeEditorProps {
  code: string;
  language?: string;
  readOnly?: boolean;
  highlightLine?: number;
  issues?: Issue[];
  onLineClick?: (line: number) => void;
  onChange?: (value: string | undefined) => void;
  onCursorChange?: (line: number, col: number) => void;
}

export function CodeEditor({ 
  code, 
  language = 'typescript', 
  readOnly = false,
  highlightLine, 
  issues = [], 
  onLineClick,
  onChange,
  onCursorChange
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom theme
    monaco.editor.defineTheme('codesage-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff7b72' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'type', foreground: 'ffa657' },
        { token: 'class', foreground: 'ffa657' },
        { token: 'function', foreground: 'd2a8ff' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#c9d1d9',
        'editor.lineHighlightBackground': '#161b22',
        'editor.selectionBackground': '#3fb95033',
        'editorCursor.foreground': '#58a6ff',
        'editorWhitespace.foreground': '#484f58',
        'editor.border': '#30363d'
      }
    });
    monaco.editor.setTheme('codesage-dark');

    editor.onMouseDown((e: any) => {
      if (e.target.position) {
        onLineClick?.(e.target.position.lineNumber);
      }
    });

    editor.onDidChangeCursorPosition((e: any) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });
  };

  useEffect(() => {
    if (!editorRef.current) return;
    const monaco = (window as any).monaco;
    if (!monaco) return;

    const newDecorations: any[] = [];

    // Add issues decorations
    issues.forEach(issue => {
      newDecorations.push({
        range: new monaco.Range(issue.line, 1, issue.line, 1),
        options: {
          isWholeLine: true,
          className: `line-issue-${issue.severity}`,
          overviewRuler: {
            color: issue.severity === 'error' ? '#ff7b72' : '#e3b341',
            position: 2,
          },
        },
      });
    });

    // Add active highlight decoration
    if (highlightLine !== undefined) {
      editorRef.current.revealLineInCenter(highlightLine);
      newDecorations.push({
        range: new monaco.Range(highlightLine, 1, highlightLine, 1),
        options: {
          isWholeLine: true,
          className: 'line-highlight-accent',
        },
      });
    }

    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);
  }, [issues, highlightLine]);

  return (
    <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
      <style>{`
        .line-highlight-accent {
          background: rgba(240, 136, 62, 0.1) !important;
          border-left: 2px solid var(--accent) !important;
        }
        .line-issue-error {
          background: rgba(255, 123, 114, 0.05) !important;
          border-left: 2px solid var(--red) !important;
        }
        .line-issue-warning {
          background: rgba(227, 179, 65, 0.05) !important;
          border-left: 2px solid var(--yellow) !important;
        }
      `}</style>
      <Editor
        height="100%"
        width="100%"
        language={language.toLowerCase()}
        value={code}
        theme="vs-dark" // Will be overridden on mount
        options={{
          readOnly,
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          lineHeight: 20,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbersMinChars: 3,
          padding: { top: 16, bottom: 16 },
          automaticLayout: true,
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
        }}
        onMount={handleEditorDidMount}
        onChange={onChange}
      />
    </div>
  );
}
