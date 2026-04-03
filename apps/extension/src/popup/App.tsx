import React, { useState, useEffect } from 'react';
import { Zap, Play, Loader2, Copy, AlertTriangle, CheckCircle2, Info, ChevronRight, LayoutPanelTop } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      // 1. Extract metadata from URL
      if (tab.url) {
        const url = new URL(tab.url).pathname;
        if (url.endsWith('.ts') || url.endsWith('.tsx')) setLanguage('typescript');
        else if (url.endsWith('.py')) setLanguage('python');
        else if (url.endsWith('.cpp') || url.endsWith('.hpp') || url.endsWith('.cc')) setLanguage('cpp');
        else if (url.endsWith('.js') || url.endsWith('.jsx')) setLanguage('javascript');
      }

      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // 1. Check selection
          const selection = window.getSelection()?.toString();
          if (selection && selection.trim().length > 5) return selection;

          // 2. Targeted: GitHub Modern (React Code View)
          const githubModern = document.querySelector('[data-testid="code-content"]');
          if (githubModern) return (githubModern as HTMLElement).innerText;

          // 3. Targeted: GitHub Classic
          const githubClassic = document.querySelector('.blob-code-content');
          if (githubClassic) return (githubClassic as HTMLElement).innerText;

          // 4. Targeted: Stack Overflow / Generic Highlighter
          const genericHighlighter = document.querySelector('pre code, .hljs, .prettyprint');
          if (genericHighlighter) return (genericHighlighter as HTMLElement).innerText;

          // 5. Fallback: First code block
          const codeBlock = document.querySelector('pre, code');
          if (codeBlock) return (codeBlock as HTMLElement).innerText;

          return null;
        },
      });

      if (result) {
        // Clean up extracted code (remove potential line number artifacts)
        const cleaned = result
          .split('\n')
          .map(line => line.replace(/^\s*\d+\s+/, '')) // Simple line number strip
          .join('\n');

        setCode(cleaned);
        setError(null);
      } else {
        setError("No code found on page. Select some text first!");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to capture code. Reload the page and try again.");
    }
  };

  const handleAnalyze = async () => {
    if (!code) return;
    setIsAnalyzing(true);
    setResults(null);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/analyze-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });

      if (!response.ok) throw new Error("API call failed");

      const data = await response.json();
      if (data.success) {
        setResults(data);
      } else {
        throw new Error(data.error || "Analysis failed");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="popup-container">
      {/* Header */}
      <header style={{
        height: 56, borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={14} color="#0d1117" fill="#0d1117" strokeWidth={3} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>CodeSage <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 500 }}>Extension</span></h1>
        </div>
        <div className="status-bubble">PLAYGROUND MODE</div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* CTAs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button className="btn-secondary" onClick={handleCapture}>
            <LayoutPanelTop size={16} />
            Capture Page
          </button>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 13, cursor: 'pointer'
            }}
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        {/* Editor Area */}
        <div style={{
          flex: results ? 'none' : 1,
          height: results ? 120 : 'auto',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Capture code or paste here..."
            style={{
              flex: 1, width: '100%', background: 'transparent', border: 'none',
              color: 'var(--text)', padding: 12, resize: 'none', outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5
            }}
          />
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.1)' }}>
            <button
              className="btn-primary"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !code}
              style={{ height: 32, padding: '0 16px', fontSize: 12 }}
            >
              {isAnalyzing ? <Loader2 size={14} className="animate-spin-smooth" /> : <Play size={12} fill="currentColor" />}
              Analyze Now
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--red-dim)', color: 'var(--red)', fontSize: 12, border: '1px solid rgba(255,123,114,0.2)' }}>
            {error}
          </div>
        )}

        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 20 }}
            >
              {/* Score Area */}
              <div className="score-card">
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>Analysis Score</div>
                <div style={{
                  fontSize: 56, fontWeight: 800,
                  color: results.score > 80 ? 'var(--green)' : results.score > 50 ? 'var(--yellow)' : 'var(--red)'
                }}>
                  {results.score}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                  <div style={{ background: 'var(--surface-3)', padding: '4px 10px', borderRadius: 6, fontSize: 11 }}>
                    <span style={{ color: 'var(--text-dim)' }}>Complexity: </span>
                    <span style={{ fontWeight: 600 }}>{results.cyclomaticComplexity || '--'}</span>
                  </div>
                </div>
              </div>

              {/* Issues */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Detected Issues ({results.issues.length})</h3>
                {results.issues.map((issue: any, i: number) => (
                  <div key={i} className="issue-item">
                    <div style={{ marginTop: 2 }}>
                      {issue.severity === 'error' ? <AlertTriangle size={16} color="var(--red)" /> : <Info size={16} color="var(--yellow)" />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Ln {issue.line}: {issue.message}</div>
                      <p style={{ fontSize: 12, color: 'var(--text-mid)', margin: 0, lineHeight: 1.4 }}>{issue.suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer style={{
        height: 32, borderTop: '1px solid var(--border)',
        background: 'var(--surface)', display: 'flex', alignItems: 'center',
        padding: '0 16px', fontSize: 10, color: 'var(--text-dim)', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={10} />
          <span>CodeSage v1.0.0 — Always Secure</span>
        </div>
      </footer>
    </div>
  );
}
