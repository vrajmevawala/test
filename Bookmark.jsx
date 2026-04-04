import { BookmarkCheck, FileText, Video, Target, Download, Play } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const Bookmark = ({ isAdmin = false }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unbookmarkedItems, setUnbookmarkedItems] = useState(new Set()); // Track unbookmarked items

  const [category, setCategory] = useState('all');
  const [subcategory, setSubcategory] = useState('all');
  const [level, setLevel] = useState('all');
  const [type, setType] = useState('all');
  const [subcategories, setSubcategories] = useState([]);
  const [showExplanation, setShowExplanation] = useState({});

  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        const res = await fetch(`/api/questions/subcategories?category=${category === 'all' ? 'Aptitude' : category}`);
        const data = await res.json();
        if (res.ok && data.subcategories && data.subcategories.length) {
          setSubcategories(data.subcategories);
          setSubcategory(data.subcategories.includes('All') ? 'All' : data.subcategories[0]);
        } else {
          setSubcategories([]);
          setSubcategory('all');
        }
      } catch {
        setSubcategories([]);
        setSubcategory('all');
      }
    };
    
    if (category !== 'all') {
      fetchSubcategories();
    } else {
      setSubcategories([]);
      setSubcategory('all');
    }
  }, [category]);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category && category !== 'all') params.append('category', category);
      if (subcategory && subcategory !== 'all' && subcategory !== 'All') params.append('subcategory', subcategory);
      if (level && level !== 'all') params.append('level', level);
      if (type && type !== 'all') params.append('type', type);
      
      const res = await fetch(`/api/resources/all-bookmarks?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch bookmarks');
      const data = await res.json();
      setBookmarks(data.bookmarks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchBookmarks();
  };

  const handleRemoveBookmark = async (bm) => {
    try {
      const body = bm.questionId 
        ? { questionId: bm.questionId }
        : { resourceId: bm.resourceId };
      
      const res = await fetch('/api/resources/remove-bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to remove bookmark');
      
      // Mark as unbookmarked instead of removing from view
      setUnbookmarkedItems(prev => new Set(prev).add(bm.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReBookmark = async (bm) => {
    try {
      let res;
      
      if (bm.questionId) {
        // Re-bookmark a question
        res = await fetch('/api/questions/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ questionId: bm.questionId })
        });
      } else {
        // Re-bookmark a resource
        res = await fetch(`/api/resources/bookmark/${bm.resourceId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
      }
      
      if (!res.ok) throw new Error('Failed to add bookmark');
      
      // Remove from unbookmarked items
      setUnbookmarkedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(bm.id);
        return newSet;
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleShowExplanation = (id) => {
    setShowExplanation(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDownloadPDF = async (resourceId, fileName) => {
    try {
      const response = await fetch(`/api/resources/download/${resourceId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  const handlePlayVideo = (videoUrl) => {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] py-12 bg-gray-50">
        <p className="text-lg text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] py-12 bg-gray-50">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="page py-12 px-4">
      <div className={`mb-10 ${!isAdmin ? 'text-center' : ''}`}>
        <h1 className="text-3xl font-bold text-black mb-2">Bookmarks</h1>
        {unbookmarkedItems.size > 0 && (
          <p className="text-sm text-gray-600">
            {unbookmarkedItems.size} item{unbookmarkedItems.size !== 1 ? 's' : ''} unbookmarked - click "Refresh" to clear
          </p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-10 justify-center">
        {/* Filter Panel */}
        <div className="bg-white shadow border border-gray-200 rounded-sm p-6 w-full max-w-sm sticky top-24 self-start">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="all">All Categories</option>
                <option value="Aptitude">Aptitude</option>
                <option value="Technical">Technical</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Subcategory</label>
              <select
                value={subcategory}
                onChange={e => setSubcategory(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                disabled={subcategories.length === 0 && category !== 'all'}
              >
                <option value="all">All Subcategories</option>
                {subcategories.map(sub => (
                  <option key={sub} value={sub}>
                    {sub === 'All' ? 'All (All Subcategories)' : sub}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Level</label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="all">All Levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="all">All Types</option>
                <option value="MCQ">MCQ</option>
                <option value="PDF">PDF</option>
                <option value="VIDEO">Video</option>
              </select>
            </div>
            <button
              onClick={handleSearch}
              className="w-full mt-2 px-6 py-2 bg-black text-white font-bold rounded-sm border border-black hover:bg-gray-900"
            >
              Search Now
            </button>
            {unbookmarkedItems.size > 0 && (
              <button
                onClick={() => {
                  setUnbookmarkedItems(new Set());
                  fetchBookmarks();
                }}
                className="w-full mt-2 px-6 py-2 bg-gray-600 text-white font-bold rounded-sm border border-gray-600 hover:bg-gray-700"
              >
                Refresh (Clear Unbookmarked)
              </button>
            )}
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </div>
        </div>

        {/* Bookmarked Items */}
        <div className="flex-1 w-full max-w-4xl">
          {bookmarks.length === 0 ? (
            <p className="text-xl text-gray-500 text-center">No bookmarks yet.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {bookmarks.map((bm, idx) => {
                // Handle question bookmarks
                if (bm.question) {
                  const q = bm.question;
                  const isUnbookmarked = unbookmarkedItems.has(bm.id);
                  
                  return (
                    <div
                      key={bm.id}
                      className={`rounded-sm shadow p-6 border transition ${
                        isUnbookmarked 
                          ? 'bg-gray-50 border-gray-300 opacity-75' 
                          : 'bg-white border-gray-200 hover:shadow-xl'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="text-lg font-bold text-black">Q{idx + 1}.</div>
                        <div className="px-3 py-1 text-xs font-semibold bg-gray-200 text-gray-800 rounded-full">
                          {q.level?.charAt(0).toUpperCase() + q.level?.slice(1)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Category: <span className="font-semibold">{q.category}</span> | Subcategory:{' '}
                          <span className="font-semibold">{q.subcategory}</span>
                        </div>
                        {isUnbookmarked ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 italic">Unbookmarked</span>
                            <button
                              onClick={() => handleReBookmark(bm)}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                              title="Re-bookmark"
                            >
                              Re-bookmark
                            </button>
                          </div>
                        ) : (
                          <BookmarkCheck
                            className="w-5 h-5 text-yellow-500 cursor-pointer"
                            title="Remove Bookmark"
                            onClick={() => handleRemoveBookmark(bm)}
                          />
                        )}
                      </div>

                      <div className="mb-4 text-black font-medium text-lg">{q.question}</div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                        {q.options.map((option, index) => {
                          const isCorrect = Array.isArray(q.correctAnswers) && q.correctAnswers.includes(option);
                          const btnClass = isCorrect
                            ? 'border-green-600 bg-green-50 text-green-800'
                            : 'border-gray-300';
                          return (
                            <div
                              key={index}
                              className={`px-4 py-2 rounded border bg-gray-50 font-medium text-left transition ${btnClass}`}
                            >
                              {String.fromCharCode(65 + index)}. {option}
                            </div>
                          );
                        })}
                      </div>

                      <button
                        className="text-black underline text-sm mb-2"
                        onClick={() => handleShowExplanation(bm.id)}
                      >
                        {showExplanation[bm.id] ? 'Hide Explanation' : 'See Explanation'}
                      </button>
                      {showExplanation[bm.id] && (
                        <div className="bg-black text-white p-4 mt-2 rounded">
                          <div className="font-semibold mb-1">Explanation:</div>
                          <div className="mb-1">Correct Answer(s): <span className="font-bold text-green-700">{Array.isArray(q.correctAnswers) ? q.correctAnswers.join(', ') : ''}</span></div>
                          <div>{q.explanation}</div>
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        Bookmarked on: {new Date(bm.createdAt).toLocaleString()}
                      </div>
                    </div>
                  );
                }

                // Handle resource bookmarks
                if (bm.resource) {
                  const r = bm.resource;
                  const isUnbookmarked = unbookmarkedItems.has(bm.id);
                  
                  return (
                    <div
                      key={bm.id}
                      className={`rounded-sm shadow p-6 border transition ${
                        isUnbookmarked 
                          ? 'bg-gray-50 border-gray-300 opacity-75' 
                          : 'bg-white border-gray-200 hover:shadow-xl'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center space-x-3">
                          {r.type === 'PDF' && <FileText className="w-5 h-5 text-red-500" />}
                          {r.type === 'VIDEO' && <Video className="w-5 h-5 text-blue-500" />}
                          <div className="text-lg font-bold text-black">{r.type}</div>
                        </div>
                        <div className="px-3 py-1 text-xs font-semibold bg-gray-200 text-gray-800 rounded-full">
                          {r.level?.charAt(0).toUpperCase() + r.level?.slice(1)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Category: <span className="font-semibold">{r.category}</span> | Subcategory:{' '}
                          <span className="font-semibold">{r.subcategory}</span>
                        </div>
                        {isUnbookmarked ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 italic">Unbookmarked</span>
                            <button
                              onClick={() => handleReBookmark(bm)}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                              title="Re-bookmark"
                            >
                              Re-bookmark
                            </button>
                          </div>
                        ) : (
                          <BookmarkCheck
                            className="w-5 h-5 text-yellow-500 cursor-pointer"
                            title="Remove Bookmark"
                            onClick={() => handleRemoveBookmark(bm)}
                          />
                        )}
                      </div>

                      <div className="mb-4 text-black font-medium text-lg">{r.title}</div>
                      
                      {r.description && (
                        <p className="text-gray-700 mb-4">{r.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          Added by: {r.creator?.fullName || 'Unknown'}
                        </div>
                        <div className="flex items-center space-x-2">
                          {r.type === 'PDF' && (
                            <button
                              onClick={() => handleDownloadPDF(r.id, r.fileName)}
                              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download</span>
                            </button>
                          )}
                          {r.type === 'VIDEO' && (
                            <button
                              onClick={() => handlePlayVideo(r.videoUrl)}
                              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
                            >
                              <Play className="w-4 h-4" />
                              <span>Watch</span>
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-400 mt-2">
                        Bookmarked on: {new Date(bm.createdAt).toLocaleString()}
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Bookmark;
