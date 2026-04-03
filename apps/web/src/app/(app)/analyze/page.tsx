'use client';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { EditorTabs } from '@/components/editor/editor-tabs';
import { CodeEditor } from '@/components/editor/code-editor';
import { AnalysisPanel } from '@/components/panels/analysis-panel';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { StatusBar } from '@/components/layout/status-bar';
import { Play, Loader2, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useSearchParams } from 'next/navigation';
import { useBotStore } from '@/stores/bot.store';
import type { AnalysisFile, Issue } from '@/types';

interface Tab {
  id: string;
  name: string;
  language: string;
  code: string;
  isDraft: boolean;
  score?: number;
  issues?: Issue[];
  fixedCount?: number;
  status?: string;
  cyclomaticComplexity?: number;
  cognitiveComplexity?: number;
  timeComplexity?: string;
  complexityScore?: number;
  theoreticalOptimal?: string;
}

const LANGUAGES = [
  { id: 'typescript', name: 'TypeScript', ext: 'ts' },
  { id: 'javascript', name: 'JavaScript', ext: 'js' },
  { id: 'python', name: 'Python', ext: 'py' },
  { id: 'go', name: 'Go', ext: 'go' },
  { id: 'rust', name: 'Rust', ext: 'rs' },
  { id: 'java', name: 'Java', ext: 'java' },
  { id: 'cpp', name: 'C++', ext: 'cpp' },
  { id: 'csharp', name: 'C#', ext: 'cs' },
  { id: 'php', name: 'PHP', ext: 'php' },
];

export default function AnalyzePage() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [activeIssueId, setActiveIssueId] = useState<string | undefined>();
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const searchParams = useSearchParams();
  const { setOpen: setChatOpen, setContext, loadHistory } = useBotStore();

  const handleRename = (id: string, newName: string) => {
    if (!newName.trim()) return;
    const name = newName.trim();
    const ext = name.split('.').pop()?.toLowerCase();
    const lang = LANGUAGES.find(l => l.ext === ext);
    
    setTabs(prev => prev.map(t => t.id === id ? { 
      ...t, 
      name, 
      language: lang ? lang.name : t.language 
    } : t));
  };

  const handleAddTab = useCallback(() => {
    const newId = uuidv4();
    const newTab: Tab = {
      id: newId,
      name: 'Untitled.py',
      language: 'Python',
      code: '',
      isDraft: true,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  }, []);

  // Load existing analyses on mount
  useEffect(() => {
    async function init() {
      try {
        await api.ensureWorkspace();
        const targetId = searchParams.get('id');
        const shouldOpenChat = searchParams.get('chat') === 'true';

        const list = await api.trpcQuery<{ items: any[] }>('analysis.list', { page: 1, pageSize: 10 });
        const items = list.items || [];
        
        const mapToTab = (detail: any): Tab => {
          const lang = LANGUAGES.find(l => l.id === detail.language.toLowerCase());
          return {
            id: detail.id,
            name: detail.filename,
            language: lang ? lang.name : 'Python', // Fallback to Python instead of Plain Text
            code: detail.metadata?.sourceCode || '',
          isDraft: false,
          score: Math.round(Number(detail.score ?? 0)),
          status: detail.status,
          cyclomaticComplexity: detail.cyclomaticComplexity,
          cognitiveComplexity: detail.cognitiveComplexity,
          timeComplexity: detail.metadata?.timeComplexity,
          complexityScore: detail.metadata?.complexityScore,
          theoreticalOptimal: detail.metadata?.theoreticalOptimal,
          issues: (detail.issues || []).map((i: any) => ({
            id: i.id,
            line: i.line,
            column: i.column || i.col || 0,
            severity: i.severity,
            category: i.category,
            message: i.message,
            rule: i.rule,
            dimension: i.dimension,
            fixable: i.fixable,
            fix: i.fix,
            metadata: i.metadata,
          })),
          fixedCount: (detail.issues || []).filter((i: any) => i.fixable).length,
          };
        };

        const loadedTabs: Tab[] = await Promise.all(items.map(async (item) => {
          const detail = await api.trpcQuery<any>('analysis.byId', { id: item.id });
          return mapToTab(detail);
        }));

        if (targetId) {
          const exists = loadedTabs.find(t => t.id === targetId);
          if (exists) {
            setTabs(loadedTabs);
            setActiveTabId(targetId);
          } else {
            const detail = await api.trpcQuery<any>('analysis.byId', { id: targetId });
            const tab = mapToTab(detail);
            setTabs([tab, ...loadedTabs]);
            setActiveTabId(targetId);
          }
        } else if (loadedTabs.length > 0) {
          setTabs(loadedTabs);
          setActiveTabId(loadedTabs[0].id);
        } else {
            handleAddTab();
        }

        if (shouldOpenChat) setChatOpen(true);
      } catch (e) {
        console.error("Failed to load analyses", e);
      }
    }
    init();
  }, [searchParams, setChatOpen, handleAddTab]);

  const handleCloseTab = (id: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (activeTabId === id && filtered.length > 0) setActiveTabId(filtered[0].id);
      return filtered;
    });
  };

  const handleCodeChange = (value: string | undefined) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, code: value || '' } : t));
  };

  const handleLanguageChange = (langId: string) => {
    const lang = LANGUAGES.find(l => l.id === langId);
    if (!lang) return;
    setTabs(prev => prev.map(t => {
       if (t.id !== activeTabId) return t;
       // Also update name extension if possible
       let newName = t.name;
       if (t.name.includes('.')) {
          const base = t.name.split('.').slice(0, -1).join('.');
          newName = `${base}.${lang.ext}`;
       } else {
          newName = `${t.name}.${lang.ext}`;
       }
       return { ...t, language: lang.name, name: newName };
    }));
  };

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  const activeIssue = useMemo(() => activeTab?.issues?.find(i => i.id === activeIssueId), [activeTab, activeIssueId]);

  // ... existing code ...

  useEffect(() => {
    if (activeTab && !activeTab.isDraft) {
      setContext({
        analysisId: activeTab.id,
        filename: activeTab.name,
        score: activeTab.score,
        language: activeTab.language,
      });
      loadHistory(`file:${activeTab.id}`);
    } else if (activeTab?.isDraft) {
      setContext({
        filename: activeTab.name,
        isDraft: true,
      });
    }
  }, [activeTab?.id, setContext, loadHistory]);

  const handleAnalyze = async () => {
    const targetTab = activeTab;
    if (!targetTab || targetTab.status === 'processing') return;
    const targetTabId = targetTab.id;

    try {
      const langId = LANGUAGES.find(l => l.name === targetTab.language)?.id || 'python';

      const { analysisId } = await api.trpcMutation<{ analysisId: string }>('analysis.create', {
        filename: activeTab.name,
        language: langId as any,
        contentSize: activeTab.code.length,
        sourceCode: activeTab.code,
        id: activeTab.isDraft ? undefined : activeTab.id,
      });

      await api.trpcMutation('analysis.start', { analysisId });
      
      // Update tab status to processing in-place
      setTabs(prev => prev.map(t => t.id === targetTabId ? { ...t, status: 'processing', isDraft: false } : t));

      let result;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        result = await api.trpcQuery<any>('analysis.byId', { id: analysisId });
        if (result.status === 'complete' || result.status === 'failed') break;
      }

      if (result) {
        setTabs(prev => prev.map(t => t.id === targetTabId ? {
          ...t,
          id: result.id,
          isDraft: false,
          score: Math.round(Number(result.score ?? 0)),
          status: result.status,
          cyclomaticComplexity: result.cyclomaticComplexity,
          cognitiveComplexity: result.cognitiveComplexity,
          timeComplexity: result.metadata?.timeComplexity,
          complexityScore: result.metadata?.complexityScore,
          theoreticalOptimal: result.metadata?.theoreticalOptimal,
          issues: (result.issues || []).map((i: any) => ({
            id: i.id,
            line: i.line,
            column: i.column || i.col || 0,
            severity: i.severity,
            category: i.category,
            message: i.message,
            rule: i.rule,
            dimension: i.dimension,
            fixable: i.fixable,
            fix: i.fix,
            metadata: i.metadata,
          })),
          fixedCount: (result.issues || []).filter((i: any) => i.fixable).length,
        } : t));
        if (activeTabId === targetTabId) setActiveTabId(result.id);
      }
    } catch (e) {
      console.error("Analysis failed:", e);
      setTabs(prev => prev.map(t => t.id === targetTabId ? { ...t, status: 'failed' } : t));
    }
  };

  const handleApplyFix = (issueId: string) => {
    if (!activeTab) return;
    const issue = activeTab.issues?.find(i => i.id === issueId);
    if (!issue || !issue.fix) return;

    const lines = activeTab.code.split('\n');
    // Simple line-based replacement.
    // In a more advanced version, we could use the 'col' and 'endLine/endCol'
    if (issue.line > 0 && issue.line <= lines.length) {
      lines[issue.line - 1] = issue.fix;
      const updatedCode = lines.join('\n');
      handleCodeChange(updatedCode);
      // Optional: clear the issue after applying? 
      // For now, let's keep it but maybe mark it as applied if we added a field.
    }
  };

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 200 && newWidth < 800) setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 36, background: 'var(--surface)', borderBottom: '1px solid var(--border)', paddingRight: 12, gap: 12, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
          <EditorTabs
            tabs={tabs.map(t => ({ id: t.id, name: t.name, language: t.language }))}
            activeId={activeTabId}
            onSelect={setActiveTabId}
            onClose={handleCloseTab}
            onAdd={handleAddTab}
            onRename={handleRename}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: '100%', flexShrink: 0 }}>
          <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
            <select
              value={LANGUAGES.find(l => l.name === activeTab?.language)?.id || 'python'}
              onChange={(e) => handleLanguageChange(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                padding: '0 8px',
                cursor: 'pointer',
                outline: 'none',
                WebkitAppearance: 'none',
                textAlign: 'right'
              }}
            >
              {LANGUAGES.map(lang => (
                <option key={lang.id} value={lang.id}>{lang.name}</option>
              ))}
            </select>
          </div>
          <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
          
          <Button
            variant="primary"
            size="sm"
            onClick={handleAnalyze}
            disabled={activeTab?.status === 'processing' || !activeTab?.code}
            style={{ 
              background: 'var(--accent)', 
              color: '#000', 
              fontWeight: 600, 
              paddingLeft: 12, 
              paddingRight: 12, 
              borderRadius: 4, 
              height: 24, 
              fontSize: 11,
              border: 'none'
            }}
          >
            {activeTab?.status === 'processing' ? <Loader2 size={12} className="animate-spin-smooth" /> : <Play size={10} fill="currentColor" />}
            <span style={{ marginLeft: 6 }}>Analyze</span>
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {activeTab ? (
            <CodeEditor
              code={activeTab.code}
              language={activeTab.language.toLowerCase() === 'c++' ? 'cpp' : activeTab.language.toLowerCase()}
              readOnly={!activeTab.isDraft && activeTab.status === 'processing'}
              onChange={handleCodeChange}
              onCursorChange={(line, col) => setCursorPos({ line, col })}
              issues={activeTab.issues}
              highlightLine={activeIssue?.line}
              onLineClick={(line) => {
                const issue = activeTab.issues?.find(i => i.line === line);
                if (issue) setActiveIssueId(issue.id);
              }}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>Select or create a tab to start</div>
          )}
        </div>

        <div onMouseDown={startResizing} style={{ width: 4, cursor: 'col-resize', background: isResizing ? 'var(--accent)' : 'transparent', zIndex: 10 }} />

        <div style={{ width: sidebarWidth, flexShrink: 0, background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflow: 'hidden' }}>
          {activeTab && !activeTab.isDraft ? (
            activeTab.status === 'processing' ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Loader2 size={24} className="animate-spin-smooth" style={{ color: 'var(--accent)' }} />
                <span>Analyzing {activeTab.name}...</span>
              </div>
            ) : (
              <AnalysisPanel
                file={{
                  id: activeTab.id,
                  name: activeTab.name,
                  language: activeTab.language,
                  code: activeTab.code,
                  score: activeTab.score || 0,
                  issueCount: activeTab.issues?.length || 0,
                  fixedCount: activeTab.fixedCount || 0,
                  status: activeTab.status === 'complete' ? 'completed' : 'running',
                  issues: activeTab.issues || [],
                  date: '',
                  cyclomaticComplexity: activeTab.cyclomaticComplexity,
                  cognitiveComplexity: activeTab.cognitiveComplexity,
                  timeComplexity: activeTab.timeComplexity,
                  complexityScore: activeTab.complexityScore,
                }}
                activeIssueId={activeIssueId}
                onIssueClick={(id) => setActiveIssueId(activeIssueId === id ? undefined : id)}
                onApplyFix={handleApplyFix}
              />
            )
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>{activeTab?.isDraft ? 'Click "Analyze" to see results' : 'No analysis selected'}</div>
          )}
        </div>
      </div>

      <StatusBar 
        file={activeTab?.name || 'No file selected'} 
        language={activeTab?.language || 'Plain Text'} 
        issueCount={activeTab?.issues?.length || 0}
        line={cursorPos.line}
        col={cursorPos.col}
      />
    </div>
  );
}
