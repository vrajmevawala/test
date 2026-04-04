import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trophy, Eye, BarChart3, Edit } from 'lucide-react';

const AdminContests = ({ user }) => {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contestSort, setContestSort] = useState({ field: 'startTime', order: 'desc' });
  const [contestStatus, setContestStatus] = useState('all');
  const [contestCodeFilter, setContestCodeFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [showContestQuestionsModal, setShowContestQuestionsModal] = useState(false);
  const [selectedContestQuestions, setSelectedContestQuestions] = useState([]);
  const [showContestStatsModal, setShowContestStatsModal] = useState(false);
  const [selectedContestStats, setSelectedContestStats] = useState(null);

  // Check if user is admin or moderator
  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator';
  const canManageContests = isAdmin || isModerator;

  useEffect(() => {
    const fetchContests = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/testseries', { credentials: 'include' });
        const data = await res.json();
        if (res.ok && data.testSeries) {
          setContests(data.testSeries);
        } else {
          setError(data.message || 'Failed to fetch contests.');
        }
      } catch {
        setError('Failed to fetch contests.');
      }
      setLoading(false);
    };
    fetchContests();
  }, []);

  const getContestStatus = (contest) => {
    const now = new Date();
    const start = new Date(contest.startTime);
    const end = new Date(contest.endTime);
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'live';
    return 'completed';
  };

  const filteredContests = contests
    .filter(c => {
      if (contestStatus !== 'all' && getContestStatus(c) !== contestStatus) return false;
      if (contestCodeFilter === 'with' && !c.requiresCode) return false;
      if (contestCodeFilter === 'without' && c.requiresCode) return false;
      if (subcategoryFilter && (c.subcategory || '').toLowerCase().indexOf(subcategoryFilter.toLowerCase()) === -1) return false;
      return true;
    })
    .sort((a, b) => {
      const field = contestSort.field;
      const order = contestSort.order === 'asc' ? 1 : -1;
      return (new Date(a[field]) - new Date(b[field])) * order;
    });

  const handleViewContestQuestions = async (contest) => {
    try {
      const response = await fetch(`/api/testseries/${contest.id}/questions`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedContestQuestions(data.questions || []);
        setShowContestQuestionsModal(true);
      } else {
        alert('Failed to fetch contest questions');
      }
    } catch (error) {
      alert('Error fetching contest questions');
    }
  };

  const handleViewContestStats = async (contest) => {
    try {
      const response = await fetch(`/api/testseries/${contest.id}/stats`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedContestStats(data);
        setShowContestStatsModal(true);
      } else {
        alert('Failed to fetch contest statistics');
      }
    } catch (error) {
      alert('Error fetching contest statistics');
    }
  };

  if (loading) {
    return (
      <div className="page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-3"></div>
          <p className="text-gray-600">Loading contests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-black flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-black">
                  {isAdmin ? 'Contest Management' : 'Contest Overview'}
                </h1>
                <p className="text-gray-600 mt-2">
                  {isAdmin ? 'Manage and monitor all contests' : 'View and monitor contests'}
                </p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => navigate('/create-contest')}
                className="flex items-center space-x-3 px-6 py-3 bg-black text-white font-semibold hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Create Contest</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-black mb-4">Filters & Sorting</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Sort by</label>
              <select 
                value={contestSort.field} 
                onChange={e => setContestSort(s => ({ ...s, field: e.target.value }))} 
                className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black transition-colors"
              >
                <option value="startTime">Start Time</option>
                <option value="endTime">End Time</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Subcategory</label>
              <input
                value={subcategoryFilter}
                onChange={e => setSubcategoryFilter(e.target.value)}
                placeholder="Search subcategory"
                className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Order</label>
              <select 
                value={contestSort.order} 
                onChange={e => setContestSort(s => ({ ...s, order: e.target.value }))} 
                className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black transition-colors"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Status</label>
              <select 
                value={contestStatus} 
                onChange={e => setContestStatus(e.target.value)} 
                className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black transition-colors"
              >
                <option value="all">All Contests</option>
                <option value="live">Live Now</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Code Required</label>
              <select 
                value={contestCodeFilter} 
                onChange={e => setContestCodeFilter(e.target.value)} 
                className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black transition-colors"
              >
                <option value="all">All Contests</option>
                <option value="with">Requires Code</option>
                <option value="without">No Code Required</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300">
                <span className="text-sm font-semibold text-black">{filteredContests.length}</span>
                <span className="text-gray-600 ml-1">contests found</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contests Table */}
        <div className="bg-white border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-black">All Contests</h2>
          </div>
          
          {filteredContests.length === 0 ? (
            <div className="p-12 text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500 mb-2">No contests found</p>
              <p className="text-gray-400">Try adjusting your filters to see more contests</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="py-4 px-6 text-left font-semibold text-black">Name</th>
                    <th className="py-4 px-6 text-left font-semibold text-black">Start Time</th>
                    <th className="py-4 px-6 text-left font-semibold text-black">End Time</th>
                    <th className="py-4 px-6 text-left font-semibold text-black">Code</th>
                    <th className="py-4 px-6 text-left font-semibold text-black">Status</th>
                    <th className="py-4 px-6 text-left font-semibold text-black">Created By</th>
                    <th className="py-4 px-6 text-left font-semibold text-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContests.map(contest => {
                    const status = getContestStatus(contest);
                    return (
                      <tr key={contest.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-semibold text-black">{contest.title}</p>
                            <p className="text-sm text-gray-600">{contest.numberOfQuestions} questions</p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-700">{new Date(contest.startTime).toLocaleString()}</td>
                        <td className="py-4 px-6 text-gray-700">{new Date(contest.endTime).toLocaleString()}</td>
                        <td className="py-4 px-6">
                          {contest.requiresCode ? (
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 border border-gray-200">
                              {contest.contestCode}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center space-x-1 px-3 py-1 text-sm font-medium border ${
                            status === 'live' 
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : status === 'upcoming'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                          }`}>
                            <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-700">{contest.creator?.fullName || 'Unknown'}</td>
                        <td className="py-4 px-6">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewContestQuestions(contest)}
                              className="px-3 py-1 bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
                            >
                              <Eye className="w-3 h-3 inline mr-1" />
                              Questions
                            </button>
                            <button
                              onClick={() => handleViewContestStats(contest)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                            >
                              <BarChart3 className="w-3 h-3 inline mr-1" />
                              Stats
                            </button>
                            {status === 'upcoming' && (
                              <button
                                onClick={() => navigate(`/edit-contest/${contest.id}`)}
                                className="px-3 py-1 bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                              >
                                <Edit className="w-3 h-3 inline mr-1" />
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Contest Questions Modal */}
      {showContestQuestionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white border border-gray-200 p-8 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-black">Contest Questions</h3>
              <button
                onClick={() => setShowContestQuestionsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Plus className="w-6 h-6 transform rotate-45" />
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedContestQuestions.map((question, index) => (
                <div key={index} className="border border-gray-200 p-4">
                  <h4 className="font-semibold text-black mb-2">Question {index + 1}</h4>
                  <p className="text-gray-700 mb-3">{question.question}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {question.options.map((option, index) => (
                      <div key={index} className={`p-2 border ${
                        Array.isArray(question.correctAnswers) && question.correctAnswers.includes(option) ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <span className="font-medium">{String.fromCharCode(65 + index)}:</span> {option}
                        {Array.isArray(question.correctAnswers) && question.correctAnswers.includes(option) && (
                          <span className="ml-2 text-green-600 font-semibold">✓ Correct</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contest Stats Modal */}
      {showContestStatsModal && selectedContestStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white border border-gray-200 p-8 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-black">Contest Statistics</h3>
              <button
                onClick={() => setShowContestStatsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Plus className="w-6 h-6 transform rotate-45" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-600">Total Participants</p>
                  <p className="text-2xl font-bold text-black">{selectedContestStats.totalParticipants || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-black">{selectedContestStats.averageScore?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-600">Average Percentage</p>
                  <p className="text-2xl font-bold text-black">{selectedContestStats.averagePercentage?.toFixed(1) || '0.0'}%</p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-600">Total Questions</p>
                  <p className="text-2xl font-bold text-black">{selectedContestStats.totalQuestions || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContests; 