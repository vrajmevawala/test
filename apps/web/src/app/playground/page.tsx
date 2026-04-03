'use client';
import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import Link from 'next/link';
import { Zap, ArrowRight, Play, Loader2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { StatusBar } from '@/components/layout/status-bar';

const DEFAULT_CODE: Record<string, string> = {
  javascript: '// Paste your JavaScript code here to optimize\nfunction slowFib(n) {\n  if (n <= 1) return n;\n  return slowFib(n - 1) + slowFib(n - 2);\n}',
  typescript: '// Paste your TypeScript code here to optimize\ninterface User {\n  id: number;\n  name: string;\n}\n\nfunction findUser(users: User[], id: number): User | undefined {\n  for (let i = 0; i < users.length; i++) {\n    if (users[i].id === id) return users[i];\n  }\n  return undefined;\n}',
  python: '# Paste your Python code here to optimize\ndef slow_fib(n):\n    if n <= 1:\n        return n\n    return slow_fib(n - 1) + slow_fib(n - 2)',
  cpp: '// Paste your C++ code here to optimize\n#include <vector>\n\nint sum(std::vector<int>& vec) {\n  int res = 0;\n  for (int i = 0; i < vec.size(); i++) {\n    res += vec[i];\n  }\n  return res;\n}'
};

export default function AnonymousAnalyzePage() {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(DEFAULT_CODE.javascript);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<{ 
    score: number; 
    issues: any[];
    cyclomaticComplexity?: number | null;
    cognitiveComplexity?: number | null;
  } | null>(null);
  const [remaining, setRemaining] = useState<number | null>(5);

  // Update default code when language changes
  React.useEffect(() => {
    // Only update if current code matches a default one (prevents overwriting user changes)
    const isDefault = Object.values(DEFAULT_CODE).some(val => val.trim() === code.trim());
    if (isDefault || code.trim() === '') {
      setCode(DEFAULT_CODE[language] || '');
    }
  }, [language]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setResults(null);
    try {
      const response = await fetch('http://localhost:3001/api/analyze-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      if (response.status === 429) {
        alert('Rate limit exceeded. Please sign up or wait an hour for more free analyses.');
        setIsAnalyzing(false);
        return;
      }
      
      const data = await response.json();
      
      const rem = response.headers.get('x-ratelimit-remaining');
      if (rem) setRemaining(parseInt(rem, 10));

      if (data.success) {
        setResults({ 
          score: data.score, 
          issues: data.issues,
          cyclomaticComplexity: data.cyclomaticComplexity,
          cognitiveComplexity: data.cognitiveComplexity
        });
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        height: 56, borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 24,
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
           <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={12} color="#0d1117" fill="#0d1117" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>CodeSage</span>
        </Link>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', background: 'rgba(240,136,62,0.1)', 
            padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(240,136,62,0.2)',
            fontFamily: 'var(--font-mono)'
          }}>
            {remaining ?? 5}/5 FREE USES
          </div>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ 
              background: 'var(--surface-2)', border: '1px solid var(--border)', 
              color: 'var(--text)', borderRadius: 6, padding: '4px 8px', fontSize: 13,
              fontFamily: 'var(--font-ui)', outline: 'none'
            }}
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
          </select>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            style={{
              height: 32, padding: '0 16px', borderRadius: 6, background: 'var(--accent)',
              color: '#0d1117', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, border: 'none',
              opacity: isAnalyzing ? 0.6 : 1
            }}
          >
            {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {isAnalyzing ? 'Analyzing...' : 'Optimize Now'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Editor Area */}
        <div style={{ flex: 1, position: 'relative', borderRight: '1px solid var(--border)' }}>
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={(v) => setCode(v || '')}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        {/* Results Side Panel */}
        <div style={{ width: 400, background: 'var(--surface)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Analysis Results</h2>
            <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>AI-powered feedback on your code.</p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {!results && !isAnalyzing && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-dim)' }}>
                <Zap size={48} style={{ marginBottom: 16, opacity: 0.1 }} />
                <p style={{ fontSize: 14 }}>Enter some code and click <b>Optimize</b> to see the AI magic.</p>
              </div>
            )}

            {isAnalyzing && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                <Loader2 size={32} className="animate-spin" style={{ marginBottom: 16 }} />
                <p style={{ fontSize: 14 }}>Consulting AI experts...</p>
              </div>
            )}

            {results && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Score Card */}
                <div style={{ 
                  padding: '20px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Overall Score</div>
                  <div style={{ 
                    fontSize: 48, fontWeight: 800, 
                    color: results.score > 80 ? 'var(--green)' : results.score > 50 ? 'var(--yellow)' : 'var(--red)'
                  }}>
                    {results.score}
                  </div>
                </div>

                {/* Complexity Stats */}
                {(results.cyclomaticComplexity !== null || results.cognitiveComplexity !== null) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ padding: '12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Cyclomatic</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{results.cyclomaticComplexity ?? '--'}</div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Cognitive</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{results.cognitiveComplexity ?? '--'}</div>
                    </div>
                  </div>
                )}

                {/* Issues List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                   <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                     Issues Detected ({results.issues.length})
                   </div>
                   {results.issues.length === 0 ? (
                     <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--green)', fontSize: 14 }}>
                       <CheckCircle2 size={18} /> No optimizations needed!
                     </div>
                   ) : (
                     results.issues.map((issue: any, i: number) => (
                       <div key={i} style={{ 
                         padding: '12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)',
                         display: 'flex', gap: 12 
                       }}>
                         <div style={{ marginTop: 2 }}>
                           {issue.severity === 'error' ? <AlertTriangle size={16} color="var(--red)" /> : 
                            issue.severity === 'warning' ? <AlertTriangle size={16} color="var(--yellow)" /> : 
                            <Info size={16} color="var(--blue)" />}
                         </div>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                           <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Ln {issue.line}: {issue.message}</div>
                           <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}>{issue.suggestion}</p>
                         </div>
                       </div>
                     ))
                   )}
                </div>

                <div style={{ 
                  marginTop: 8, padding: '12px', borderRadius: 8, background: 'rgba(240,136,62,0.1)', 
                  border: '1px solid rgba(240,136,62,0.2)', fontSize: 12, color: 'var(--accent)',
                  display: 'flex', gap: 8, alignItems: 'center'
                }}>
                  <Info size={14} /> Result not stored. Sign up to save history.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer / Status */}
      <footer style={{ height: 32, borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <StatusBar 
          file="Public Playground" 
          language={language} 
          issueCount={results?.issues.length || 0} 
          remainingUses={remaining}
        />
      </footer>
    </div>
  );
}
