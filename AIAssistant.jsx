import React, { useState, useEffect, useRef } from 'react';

// Lightweight markdown rendering for bold, inline code, and lists
const escapeHtml = (str) => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const applyInlineFormatting = (str) => {
  const escaped = escapeHtml(str);
  // Inline code first to prevent formatting inside code
  const withCode = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  const withBold = withCode.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return withBold;
};

const parseMarkdownToHtml = (md) => {
  const lines = (md || '').split('\n');
  let html = '';
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) { html += '</ul>'; inUl = false; }
    if (inOl) { html += '</ol>'; inOl = false; }
  };

  for (const rawLine of lines) {
    const line = rawLine || '';
    let match;
    if ((match = line.match(/^\s*[-*]\s+(.*)$/))) {
      if (!inUl) {
        if (inOl) { html += '</ol>'; inOl = false; }
        html += '<ul>';
        inUl = true;
      }
      html += `<li>${applyInlineFormatting(match[1])}</li>`;
      continue;
    }
    if ((match = line.match(/^\s*\d+\.\s+(.*)$/))) {
      if (!inOl) {
        if (inUl) { html += '</ul>'; inUl = false; }
        html += '<ol>';
        inOl = true;
      }
      html += `<li>${applyInlineFormatting(match[1])}</li>`;
      continue;
    }
    // Paragraph
    closeLists();
    if (line.trim() === '') {
      continue;
    }
    html += `<p>${applyInlineFormatting(line)}</p>`;
  }
  closeLists();
  return html;
};
import {
  Brain,
  Send,
  Bot,
  FileText,
  Image,
  Upload,
  Lightbulb,
  MessageCircle,
  BookOpen,
  Target,
  BarChart3,
  Trash2,
  Settings,
  Sparkles,
  User
} from 'lucide-react';

const AIAssistant = ({ user }) => {
  // AI Chat State
  const [chatMessages, setChatMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_chat_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch { }
    return [{
      id: 1,
      type: 'bot',
      message: "Hi! I'm your AI study assistant. Ask me anything about aptitude, DSA, or interviews.",
      timestamp: new Date()
    }];
  });
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [responseMode, setResponseMode] = useState(() => localStorage.getItem('ai_response_mode') || 'concise');

  // File Analysis State
  const [selectedAnalysisFile, setSelectedAnalysisFile] = useState(null);
  const [analysisType, setAnalysisType] = useState('summary');
  const [analyzing, setAnalyzing] = useState(false);

  // Refs
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Persist chat history
  useEffect(() => {
    try {
      const serializable = chatMessages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() }));
      localStorage.setItem('ai_chat_messages', JSON.stringify(serializable));
    } catch { }
  }, [chatMessages]);

  // Persist mode
  useEffect(() => {
    localStorage.setItem('ai_response_mode', responseMode);
  }, [responseMode]);

  // Handle file selection for analysis
  const handleAnalysisFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      setSelectedAnalysisFile(file);
    } else {
      alert('Please select a valid PDF or image file.');
    }
  };

  // Handle file analysis
  const handleAnalyzeFile = async () => {
    if (!selectedAnalysisFile) {
      alert('Please select a file to analyze.');
      return;
    }

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedAnalysisFile);
      formData.append('analysisType', analysisType);

      const response = await fetch('/api/resources/ai/analyze', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();

        // Add analysis result to chat
        const analysisMessage = {
          id: Date.now(),
          type: 'bot',
          message: `📄 **File Analysis Result**\n\n**File:** ${selectedAnalysisFile.name}\n**Type:** ${data.type}\n**Analysis:**\n\n${data.analysis}`,
          timestamp: new Date(data.timestamp)
        };
        setChatMessages(prev => [...prev, analysisMessage]);

        // Reset file selection
        setSelectedAnalysisFile(null);
      } else {
        const errorData = await response.json();
        const errorMessage = {
          id: Date.now(),
          type: 'bot',
          message: `❌ **File Analysis Error**\n\n**File:** ${selectedAnalysisFile.name}\n**Error:** ${errorData.message}\n\n${errorData.suggestion || 'Please try again with a different file.'}`,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
      const errorMessage = {
        id: Date.now(),
        type: 'bot',
        message: `❌ **File Analysis Error**\n\n**File:** ${selectedAnalysisFile.name}\n**Error:** Failed to analyze file. Please try again.\n\nMake sure your file is not corrupted and try uploading it again.`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle chatbot message send
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: newMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/resources/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          message: newMessage,
          context: 'AI Assistant - General study help',
          mode: responseMode,
          history: chatMessages.slice(-10).map(m => ({ type: m.type, message: m.message }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: data.message,
          timestamp: new Date(data.timestamp)
        };
        setChatMessages(prev => [...prev, botResponse]);
      } else {
        const errorData = await response.json();
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: `Sorry, I encountered an error: ${errorData.message || 'Failed to get response'}`,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, botResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([
      {
        id: Date.now(),
        type: 'bot',
        message: "Chat cleared. How can I help you next?",
        timestamp: new Date()
      }
    ]);
  };
  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      setSelectedAnalysisFile(file);
    } else {
      alert('Please select a valid PDF or image file.');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-14 h-14 bg-black to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                {/* <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div> */}
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  AI Study Assistant
                </h1>
                <p className="text-gray-600 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  Your intelligent learning companion
                </p>
              </div>
            </div>
            {user && (
              <div className="flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Welcome, {user.fullName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20">
              <div className="p-6">
                {/* Chat Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-black-600" />
                    <h2 className="text-lg font-semibold text-gray-800">Chat Assistant</h2>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={responseMode}
                      onChange={(e) => setResponseMode(e.target.value)}
                      className="px-3 py-1.5 border border-gray-200 rounded-full text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                      title="Response length"
                    >
                      <option value="concise">Concise</option>
                      <option value="balanced">Balanced</option>
                      <option value="detailed">Detailed</option>
                    </select>
                    <button
                      onClick={handleClearChat}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-full text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-b from-gray-50/50 to-white/50 rounded-2xl p-4 h-[65vh] flex flex-col">
                  {/* Chat Messages */}
                  <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb #f3f4f6' }}
                  >
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start space-x-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.type === 'bot' && (
                          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-md px-4 py-3 rounded-2xl shadow-sm ${message.type === 'user'
                              ? 'bg-black text-white ml-8'
                              : 'bg-white border border-gray-100 text-gray-800'
                            }`}
                        >
                          {message.type === 'bot' ? (
                            <div
                              className="prose prose-sm max-w-none text-gray-800"
                              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(message.message) }}
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-line">{message.message}</p>
                          )}
                          <p className={`text-xs mt-2 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {message.type === 'user' && (
                          <div className="w-8 h-8 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex items-start space-x-2 justify-start">
                        <div className="w-8 h-8 bg-black  rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl shadow-sm">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-black rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-3 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask me anything about aptitude, DSA, or technical topics..."
                        className="flex-1 px-4 py-3 bg-transparent border-none outline-none text-sm placeholder-gray-500"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isTyping}
                        className="bg-black text-white p-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transform hover:scale-105"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* File Analysis Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">File Analysis</h3>
                    <p className="text-sm text-gray-600">Upload files for AI insights</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Type</label>
                  <select
                    value={analysisType}
                    onChange={(e) => setAnalysisType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white shadow-sm"
                  >
                    <option value="summary">📄 Summary</option>
                    <option value="explanation">💡 Explanation</option>
                    <option value="questions">❓ Generate Questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Upload File</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleAnalysisFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 text-center">
                        <span className="font-medium text-blue-600">Click to upload</span>
                        <br />or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PDF, JPEG, PNG up to 10MB</p>

                    </label>
                  </div>

                  {selectedAnalysisFile && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-800 font-medium truncate">
                          {selectedAnalysisFile.name}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedAnalysisFile(null)}
                        className="ml-2 p-1 text-gray-500 hover:text-red-600 transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                </div>

                <button
                  onClick={handleAnalyzeFile}
                  disabled={!selectedAnalysisFile || analyzing}
                  className="w-full px-4 py-3 bg-black text-white text-sm rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-md transform hover:scale-105"
                >
                  {analyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze File</span>
                    </>
                  )}
                </button>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-medium text-gray-700 mb-2">✨ AI Analysis Features</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Smart document understanding</li>
                    <li>• Question generation from content</li>
                    <li>• Instant explanations & summaries</li>
                    <li>• Multi-format support (PDF, images)</li>
                  </ul>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant; 
