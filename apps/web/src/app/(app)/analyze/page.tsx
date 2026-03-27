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
}

const LANGUAGES = [
  { id: 'python', name: 'Python', ext: 'py' },
];

export default function AnalyzePage() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [activeIssueId, setActiveIssueId] = useState<string | undefined>();
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const searchParams = useSearchParams();
  const { setOpen: setChatOpen } = useBotStore();

  const handleStartRename = (id: string, name: string) => {
    setEditingTabId(id);
    setEditingName(name);
  };

  const handleFinishRename = () => {
    if (editingTabId && editingName.trim()) {
      setTabs(prev => prev.map(t => t.id === editingTabId ? { ...t, name: editingName.trim() } : t));
    }
    setEditingTabId(null);
  };

  const handleAddTab = useCallback(() => {
    const newId = uuidv4();
    const newTab: Tab = {
      id: newId,
      name: 'Untitled.py',
      language: 'Python',
      code: '# Paste your code here to analyze...',
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

        // Limit to 5 most recent
        const list = await api.trpcQuery<{ items: any[] }>('analysis.list', { page: 1, pageSize: 5 });
        const items = list.items || [];
        
        const mapToTab = (detail: any): Tab => ({
          id: detail.id,
          name: detail.filename,
          language: detail.language,
          code: detail.metadata?.sourceCode || '',
          isDraft: false,
          score: Math.round(Number(detail.score ?? 0)),
          status: detail.status,
          issues: (detail.issues || []).map((i: any) => ({
            id: i.id,
            line: i.line,
            column: i.col,
            severity: i.severity,
            message: i.message,
            rule: i.rule,
            fixable: i.fixable,
            explanation: i.suggestion,
          })),
          fixedCount: (detail.issues || []).filter((i: any) => i.fixable).length,
        });

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
            // Fetch the specific one and add it to the front of the 5 recent
            try {
              const detail = await api.trpcQuery<any>('analysis.byId', { id: targetId });
              const tab = mapToTab(detail);
              setTabs([tab, ...loadedTabs.slice(0, 4)]);
              setActiveTabId(targetId);
            } catch (err) {
              console.error("Failed to load specific analysis", err);
              if (loadedTabs.length > 0) {
                setTabs(loadedTabs);
                setActiveTabId(loadedTabs[0].id);
              } else {
                handleAddTab();
              }
            }
          }
        } else if (loadedTabs.length > 0) {
          setTabs(loadedTabs);
          setActiveTabId(loadedTabs[0].id);
        } else {
          handleAddTab();
        }

        if (shouldOpenChat) {
          setChatOpen(true);
        }
      } catch (e) {
        console.error("Failed to load analyses", e);
        handleAddTab();
      }
    }
    init();
  }, [searchParams, setChatOpen, handleAddTab]);

  const handleCloseTab = (id: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (activeTabId === id && filtered.length > 0) {
        setActiveTabId(filtered[filtered.length - 1].id);
      }
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
      if (t.id === activeTabId && t.isDraft) {
        const baseName = t.name.split('.')[0];
        return { ...t, language: lang.name, name: `${baseName}.${lang.ext}` };
      }
      return t;
    }));
  };

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  const activeIssue = useMemo(() => activeTab?.issues?.find(i => i.id === activeIssueId), [activeTab, activeIssueId]);

  const handleAnalyze = async () => {
    if (!activeTab || analyzing) return;

    try {
      setAnalyzing(true);
      
      const langId = 'python';

      const { analysisId, uploadUrl } = await api.trpcMutation<{ analysisId: string; uploadUrl: string }>('analysis.create', {
        filename: activeTab.name,
        language: langId as any,
        contentSize: activeTab.code.length,
        sourceCode: activeTab.code,
      });

      try {
        await fetch(uploadUrl, {
          method: 'PUT',
          body: activeTab.code,
          headers: { 'Content-Type': 'text/plain' },
        });
      } catch (err) {
        console.warn('R2 upload failed, proceeding with metadata-based analysis:', err);
      }

      await api.trpcMutation('analysis.start', { analysisId });
      setTabs(prev => prev.map(t => (t.id === activeTabId || t.id === analysisId) ? { ...t, status: 'processing', isDraft: false } : t));

      let result;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        result = await api.trpcQuery<any>('analysis.byId', { id: analysisId });
        if (result.status === 'complete' || result.status === 'failed') break;
      }

      if (result) {
        const updatedTab: Tab = {
          ...activeTab,
          id: result.id,
          isDraft: false,
          score: Math.round(Number(result.score ?? 0)),
          status: result.status,
          issues: (result.issues || []).map((i: any) => ({
            id: i.id,
            line: i.line,
            column: i.col,
            severity: i.severity,
            message: i.message,
            rule: i.rule,
            fixable: i.fixable,
            explanation: i.suggestion,
          })),
          fixedCount: (result.issues || []).filter((i: any) => i.fixable).length,
        };
        setTabs(prev => prev.map(t => t.id === activeTabId || t.id === analysisId ? updatedTab : t));
        if (activeTabId === activeTab.id) {
          setActiveTabId(result.id);
        }
      }

    } catch (e) {
      console.error("Analysis failed:", e);
    } finally {
      setAnalyzing(false);
    }
  };

  // Resize logic
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 200 && newWidth < 800) {
        setSidebarWidth(newWidth);
      }
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
      {/* Integrated Editor Toolbar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        height: 36, 
        background: 'var(--surface)', 
        borderBottom: '1px solid var(--border)',
        paddingRight: 12,
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
          <EditorTabs
            tabs={tabs.map(t => ({ id: t.id, name: t.name, language: t.language }))}
            activeId={activeTabId}
            onSelect={setActiveTabId}
            onClose={handleCloseTab}
            onAdd={handleAddTab}
            onRename={(id, name) => setTabs(prev => prev.map(t => t.id === id ? { ...t, name } : t))}
          />
        </div>

        {activeTab?.isDraft && (
          <div style={{ position: 'relative' }}>
            <select
              value="python"
              onChange={(e) => handleLanguageChange(e.target.value)}
              style={{
                appearance: 'none',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '0 28px 0 10px',
                height: 24,
                fontSize: 11,
                color: 'var(--text-mid)',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {LANGUAGES.map(lang => (
                <option key={lang.id} value={lang.id}>{lang.name}</option>
              ))}
            </select>
            <ChevronDown size={10} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={handleAnalyze}
          disabled={analyzing || !activeTab?.code}
          style={{ 
            background: 'var(--accent)', 
            color: '#000', 
            fontWeight: 600, 
            paddingLeft: 12, 
            paddingRight: 12,
            borderRadius: 4,
            height: 24,
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
          <span style={{ marginLeft: 6 }}>Analyze</span>
        </Button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main Editor Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {activeTab ? (
            <CodeEditor
              code={activeTab.code}
              language={activeTab.language}
              readOnly={!activeTab.isDraft && activeTab.status === 'complete'}
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
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
              Select or create a tab to start
            </div>
          )}
        </div>

        {/* Resizer */}
        <div
          onMouseDown={startResizing}
          style={{
            width: 4,
            cursor: 'col-resize',
            background: isResizing ? 'var(--accent)' : 'transparent',
            transition: 'background 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={e => !isResizing && (e.currentTarget.style.background = 'var(--border)')}
          onMouseLeave={e => !isResizing && (e.currentTarget.style.background = 'transparent')}
        />

        {/* Results Sidebar */}
        <div style={{ width: sidebarWidth, flexShrink: 0, background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflow: 'hidden' }}>
          {activeTab && !activeTab.isDraft ? (
            activeTab.status === 'processing' ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
                <span>Analyzing {activeTab.name}...</span>
                <span style={{ fontSize: 11, opacity: 0.6 }}>This usually takes 10-30 seconds</span>
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
                }}
                activeIssueId={activeIssueId}
                onIssueClick={setActiveIssueId}
              />
            )
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              {activeTab?.isDraft ? 'Click "Analyze" to see results' : 'No analysis selected'}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Status Bar */}
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
