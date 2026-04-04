import React, { useState, useEffect } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3,
  Users,
  Clock,
  Trophy,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Calendar,
  Target,
  Download,
  FileText,
  Award,
  CheckCircle,
  XCircle,
  Minus,
  TrendingUp,
  Activity,
  PieChart,
 
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const AdminResults = ({ user, embedded = false }) => {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('startTime');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedContest, setSelectedContest] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [contestStats, setContestStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [contestResults, setContestResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [detailedAnalysis, setDetailedAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisTab, setAnalysisTab] = useState('overview');
  const [questionAnalysis, setQuestionAnalysis] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [categoryAnalysis, setCategoryAnalysis] = useState({});
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [participantDetails, setParticipantDetails] = useState(null);
  const [loadingParticipant, setLoadingParticipant] = useState(false);

  const itemsPerPage = 10;

  // Check if user is admin or moderator
  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator';
  const canViewResults = isAdmin || isModerator;

  useEffect(() => {
    if (canViewResults) {
      fetchContests();
    }
  }, [currentPage, searchTerm, statusFilter, sortBy, sortOrder]);

  const fetchContests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/testseries', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setContests(data.testSeries || []);
      }
    } catch (error) {
      console.error('Error fetching contests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContestStats = async (contestId) => {
    try {
      setLoadingStats(true);
      const response = await fetch(`/api/testseries/${contestId}/stats`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setContestStats(data);
      }
    } catch (error) {
      console.error('Error fetching contest stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchContestResults = async (contestId) => {
    try {
      setLoadingResults(true);
      const response = await fetch(`/api/testseries/${contestId}/participants`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setContestResults(data.participants || []);
      }
    } catch (error) {
      console.error('Error fetching contest results:', error);
    } finally {
      setLoadingResults(false);
    }
  };

  const fetchDetailedAnalysis = async (contestId) => {
    try {
      setLoadingAnalysis(true);
      const response = await fetch(`/api/testseries/${contestId}/detailed-analysis`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setDetailedAnalysis(data);
        
        // Process question analysis
        if (data.questionAnalysis) {
          setQuestionAnalysis(data.questionAnalysis);
        }
        
        // Process performance metrics
        if (data.performanceMetrics) {
          setPerformanceMetrics(data.performanceMetrics);
        }
        
        // Process category analysis
        if (data.categoryAnalysis) {
          setCategoryAnalysis(data.categoryAnalysis);
        }
      }
    } catch (error) {
      console.error('Error fetching detailed analysis:', error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const fetchParticipantAnswers = async (contestId, participantId) => {
    try {
      setLoadingParticipant(true);
      const response = await fetch(`/api/testseries/${contestId}/participant/${participantId}/answers`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setParticipantDetails(data);
        setShowParticipantModal(true);
      } else {
        const err = await response.text();
        alert(`Failed to load participant answers: ${response.status} - ${err}`);
      }
    } catch (error) {
      console.error('Error fetching participant answers:', error);
      alert(`Error fetching participant answers: ${error.message}`);
    } finally {
      setLoadingParticipant(false);
    }
  };

  const handleViewStats = async (contest) => {
    setSelectedContest(contest);
    setShowStatsModal(true);
    setAnalysisTab('overview');
    await Promise.all([
      fetchContestStats(contest.id),
      fetchContestResults(contest.id),
      fetchDetailedAnalysis(contest.id)
    ]);
  };

  const downloadExcel = async (contestId, contestTitle) => {
    try {
      setDownloadingExcel(true);
      console.log('Starting Excel download for contest:', contestId, contestTitle);
      
      const response = await fetch(`/api/testseries/${contestId}/download-results`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const blob = await response.blob();
        console.log('Blob received, size:', blob.size, 'type:', blob.type);
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${contestTitle}_Results_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('Excel download completed successfully');
      } else {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        alert(`Failed to download results: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert(`Error downloading results: ${error.message}`);
    } finally {
      setDownloadingExcel(false);
    }
  };

  const getContestStatus = (contest) => {
    const now = new Date();
    const start = new Date(contest.startTime);
    const end = new Date(contest.endTime);
    
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'live';
    return 'completed';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'live': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAnswerStatus = (userAnswer, correctAnswer) => {
    if (Array.isArray(correctAnswer)) {
      // New array-based structure
      if (userAnswer && correctAnswer.includes(userAnswer)) return 'correct';
      if (userAnswer === null || userAnswer === undefined) return 'unanswered';
      return 'incorrect';
    } else {
      // Old string-based structure (backward compatibility)
      if (userAnswer === correctAnswer) return 'correct';
      if (userAnswer === null || userAnswer === undefined) return 'unanswered';
      return 'incorrect';
    }
  };

  const getAnswerStatusIcon = (status) => {
    switch (status) {
      case 'correct': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'incorrect': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'unanswered': return <Minus className="w-4 h-4 text-gray-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const calculatePerformanceMetrics = (results) => {
    if (!results || results.length === 0) {
      return {
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        medianScore: 0,
        completionRate: 0,
        standardDeviation: 0,
        averageTime: 0
      };
    }
    
    const scores = results.map(r => r.score || 0);
    const totalParticipants = results.length;
    const completedParticipants = results.filter(r => r.submittedAt).length;
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const meanScore = totalScore / totalParticipants;
    const timeValues = results.map(r => typeof r.timeTaken === 'number' ? r.timeTaken : 0).filter(n => n > 0);
    const averageTime = timeValues.length ? Math.round(timeValues.reduce((a, b) => a + b, 0) / timeValues.length) : 0;
    
    return {
      averageScore: meanScore,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      medianScore: scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)],
      completionRate: (completedParticipants / totalParticipants) * 100,
      standardDeviation: Math.sqrt(scores.reduce((sq, n) => sq + Math.pow(n - meanScore, 2), 0) / totalParticipants),
      averageTime
    };
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredContests = contests
    .filter(contest => {
      const matchesSearch = contest.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || getContestStatus(contest) === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'startTime' || sortBy === 'endTime') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const paginatedContests = filteredContests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPagesCount = Math.ceil(filteredContests.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const Pagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPagesCount, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-700">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredContests.length)} of {filteredContests.length} contests
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {pages.map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                currentPage === page
                  ? 'bg-black text-white'
                  : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPagesCount}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  if (!canViewResults) {
    return (
      <div className="page flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'page'}>
      <div className={embedded ? '' : 'max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8'}>
        {/* Header */}
        {!embedded && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Contest Results</h1>
                  <p className="text-gray-600 mt-1">View and manage contest results and statistics</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 p-2 gap-4 mb-4">
          <div className="bg-white p-6 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Contests</p>
                <p className="text-2xl font-bold">{contests.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold">{contests.filter(c => getContestStatus(c) === 'completed').length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Live</p>
                <p className="text-2xl font-bold">{contests.filter(c => getContestStatus(c) === 'live').length}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Upcoming</p>
                <p className="text-2xl font-bold">{contests.filter(c => getContestStatus(c) === 'upcoming').length}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search contests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="startTime">Start Time</option>
              <option value="endTime">End Time</option>
              <option value="title">Title</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
            </button>
        </div>

        {/* Contests List */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden p-2">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-black">All Contests</h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading contests...</p>
            </div>
          ) : paginatedContests.length === 0 ? (
            <div className="p-12 text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-800 mb-2">No contests found</p>
              <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedContests.map((contest) => {
                    const status = getContestStatus(contest);
                    const duration = Math.round((new Date(contest.endTime) - new Date(contest.startTime)) / (1000 * 60));
                    
                    return (
                      <tr key={contest.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{contest.title}</div>
                            <div className="text-sm text-gray-500">{contest.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{duration} min</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{contest.participantsCount ?? contest.participants?.length ?? 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewStats(contest)}
                            className="text-black hover:text-gray-700 flex items-center space-x-1"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Stats</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {!loading && paginatedContests.length > 0 && <Pagination />}
        </div>
      </div>

      {/* Stats Modal */}
      {showStatsModal && selectedContest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-black">Contest Statistics</h3>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mt-2">{selectedContest.title}</p>
            </div>
            
            <div className="p-6">
              {/* Download Button */}
              <div className="mb-6">
                <button
                  onClick={() => downloadExcel(selectedContest.id, selectedContest.title)}
                  disabled={downloadingExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {downloadingExcel ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Excel Report</span>
                    </>
                  )}
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Download complete results with user scores, answers, and rankings
                </p>
              </div>

              {/* Analysis Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { id: 'overview', label: 'Overview', icon: BarChart3 },
                    { id: 'performance', label: 'Performance', icon: TrendingUp },
                    { id: 'questions', label: 'Question Analysis', icon: PieChart },
                    // { id: 'categories', label: 'Categories', icon: Activity },
                    { id: 'results', label: 'Results', icon: FileText }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setAnalysisTab(tab.id)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                          analysisTab === tab.id
                            ? 'border-black text-black'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              {loadingStats || loadingAnalysis ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading analysis...</p>
                </div>
              ) : (
                <>
                  {/* Overview Tab */}
                  {analysisTab === 'overview' && contestStats && (
                    <div className="space-y-6">
                      {(() => { const perf = calculatePerformanceMetrics(contestResults); return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-600">Total Participants</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{contestStats.totalParticipants || 0}</p>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Trophy className="w-5 h-5 text-yellow-600" />
                            <span className="text-sm font-medium text-gray-600">Average Score</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{perf.averageScore.toFixed(2)}</p>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Target className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-gray-600">Highest Score</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{perf.highestScore}</p>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-5 h-5 text-purple-600" />
                            <span className="text-sm font-medium text-gray-600">Completion Rate</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{perf.completionRate.toFixed(1)}%</p>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-5 h-5 text-red-600" />
                            <span className="text-sm font-medium text-gray-600">Average Time</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{perf.averageTime} min</p>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="w-5 h-5 text-indigo-600" />
                            <span className="text-sm font-medium text-gray-600">Questions</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{contestStats.totalQuestions || 0}</p>
                        </div>
                      </div>
                      ); })()}

                      {/* Performance Distribution */}
                      {contestResults.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Distribution</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[
                              { label: 'Excellent (80-100%)', range: [80, 100], color: 'bg-green-500' },
                              { label: 'Good (60-79%)', range: [60, 79], color: 'bg-blue-500' },
                              { label: 'Average (40-59%)', range: [40, 59], color: 'bg-yellow-500' },
                              { label: 'Poor (0-39%)', range: [0, 39], color: 'bg-red-500' }
                            ].map((category) => {
                              const count = contestResults.filter(result => {
                                const percentage = result.percentage || 0;
                                return percentage >= category.range[0] && percentage <= category.range[1];
                              }).length;
                              const percentage = contestResults.length > 0 ? (count / contestResults.length * 100).toFixed(1) : 0;
                              
                              return (
                                <div key={category.label} className="text-center">
                                  <div className={`w-16 h-16 rounded-full ${category.color} mx-auto mb-2 flex items-center justify-center text-white font-bold`}>
                                    {count}
                                  </div>
                                  <p className="text-sm font-medium text-gray-900">{category.label}</p>
                                  <p className="text-sm text-gray-500">{percentage}%</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Performance Tab */}
                  {analysisTab === 'performance' && (
                    <div className="space-y-6">
                      {contestResults.length > 0 ? (() => { const perf = calculatePerformanceMetrics(contestResults); return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {Object.entries(perf).map(([key, value]) => (
                              <div key={key} className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <TrendingUp className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-600">
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                  </span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900 mt-2">
                                  {typeof value === 'number' ? value.toFixed(2) : value}
                                  {key === 'completionRate' && '%'}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Score Distribution Chart */}
                          <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h4>
                            <div className="space-y-3">
                              {contestResults
                                .sort((a, b) => (b.score || 0) - (a.score || 0))
                                .slice(0, 10)
                                .map((result, index) => {
                                  const percentage = result.percentage || 0;
                                  return (
                                    <div key={result.id} className="flex items-center space-x-4">
                                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                                        {index + 1}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="font-medium">{result.name || 'Unknown'}</span>
                                          <span className={getPerformanceColor(percentage)}>{percentage.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div 
                                            className={`h-2 rounded-full ${percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-blue-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                            style={{ width: `${percentage}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </>
                      ); })() : (
                        <div className="text-center py-8">
                          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-600">No performance data available.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Question Analysis Tab */
                  }
                  {analysisTab === 'questions' && (
                    <div className="space-y-6">
                      {questionAnalysis.length > 0 ? (
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <div className="px-6 py-4 border-b border-gray-200">
                            <h4 className="text-lg font-semibold text-gray-900">Question Performance Analysis</h4>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Options & Selections</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {questionAnalysis.map((question, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                      <div className="text-sm font-medium text-gray-900">Q{index + 1}</div>
                                      <div className="text-sm text-gray-500 truncate max-w-xs">{question.question}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="space-y-2">
                                        {Array.isArray(question.options) ? question.options.map((option, index) => (
                                          <div key={index} className={`flex items-start justify-between ${Array.isArray(question.correctAnswers) && question.correctAnswers.includes(option) ? 'font-semibold text-green-700' : ''}`}>
                                            <div className="text-sm text-gray-700 pr-4">
                                              <span className="font-medium uppercase">{String.fromCharCode(97 + index)} </span>
                                              {option}
                                            </div>
                                            <span className="ml-2 text-xs text-gray-600">selected: {question.optionCounts?.[option] || 0}</span>
                                          </div>
                                        )) : ['a','b','c','d'].map(key => (
                                          <div key={key} className={`flex items-start justify-between ${question.correctAnswer === key ? 'font-semibold text-green-700' : ''}`}>
                                            <div className="text-sm text-gray-700 pr-4">
                                              <span className="font-medium uppercase">{key} </span>
                                              {question.options?.[key] || '-'}
                                            </div>
                                            <span className="ml-2 text-xs text-gray-600">selected: {question.optionCounts?.[key] || 0}</span>
                                          </div>
                                        ))}
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                          <span>Not attempted</span>
                                          <span>{question.optionCounts?.notAttempted || 0}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(question.difficulty)}`}>
                                        {question.difficulty}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-16 bg-gray-200 rounded-full h-2">
                                          <div 
                                            className={`h-2 rounded-full ${question.successRate >= 80 ? 'bg-green-500' : question.successRate >= 60 ? 'bg-blue-500' : question.successRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                            style={{ width: `${question.successRate}%` }}
                                          ></div>
                                        </div>
                                        <span className="text-sm text-gray-900">{question.successRate.toFixed(1)}%</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {question.category}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        question.successRate >= 80 ? 'bg-green-100 text-green-800' : 
                                        question.successRate >= 60 ? 'bg-blue-100 text-blue-800' : 
                                        question.successRate >= 40 ? 'bg-yellow-100 text-yellow-800' : 
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {question.successRate >= 80 ? 'Easy' : 
                                         question.successRate >= 60 ? 'Moderate' : 
                                         question.successRate >= 40 ? 'Challenging' : 'Difficult'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <PieChart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-600">No question analysis data available.</p>
                        </div>
                      )}
                    </div>
                  )}

                  

                  {/* Categories Tab */}
                  {/* {analysisTab === 'categories' && (
                    <div className="space-y-6">
                      {categoryAnalysis && Object.keys(categoryAnalysis).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Object.entries(categoryAnalysis).map(([category, data]) => (
                            <div key={category} className="bg-white border border-gray-200 rounded-lg p-6">
                              <h4 className="text-lg font-semibold text-gray-900 mb-4">{category}</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Average Score:</span>
                                  <span className="text-sm font-medium text-gray-900">{data.averageScore?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Success Rate:</span>
                                  <span className="text-sm font-medium text-gray-900">{data.successRate?.toFixed(1) || '0'}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Questions:</span>
                                  <span className="text-sm font-medium text-gray-900">{data.questionCount || 0}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${data.successRate >= 80 ? 'bg-green-500' : data.successRate >= 60 ? 'bg-blue-500' : data.successRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${data.successRate || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-600">No category analysis data available.</p>
                        </div>
                      )}
                    </div>
                  )} */}

                  {/* Results Tab */}
                  {analysisTab === 'results' && (
                    <div className="space-y-6">
                      {loadingResults ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                          <p className="mt-4 text-gray-600">Loading results...</p>
                        </div>
                      ) : contestResults.length > 0 ? (
                        <>
                          {/* Charts Section */}
                          {contestStats?.questionStats && contestStats.questionStats.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center">
                                <h4 className="font-semibold text-gray-900 mb-3">Question-wise Attempts</h4>
                                <Bar
                                  data={{
                                    labels: contestStats.questionStats.map((q, i) => `Q${i + 1}`),
                                    datasets: [
                                      { label: 'Correct', data: contestStats.questionStats.map(q => q.correctAttempts), backgroundColor: '#22c55e' },
                                      { label: 'Incorrect', data: contestStats.questionStats.map(q => q.incorrectAttempts), backgroundColor: '#ef4444' },
                                      { label: 'Not Attempted', data: contestStats.questionStats.map(q => q.notAttempted), backgroundColor: '#f59e0b' }
                                    ]
                                  }}
                                  options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: false } } }}
                                  height={180}
                                />
                              </div>
                              <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center">
                                <h4 className="font-semibold text-gray-900 mb-3">Overall Answer Distribution</h4>
                                <Pie
                                  data={{
                                    labels: ['Correct', 'Incorrect', 'Not Attempted'],
                                    datasets: [
                                      {
                                        data: [
                                          contestStats.questionStats.reduce((a, q) => a + q.correctAttempts, 0),
                                          contestStats.questionStats.reduce((a, q) => a + q.incorrectAttempts, 0),
                                          contestStats.questionStats.reduce((a, q) => a + q.notAttempted, 0)
                                        ],
                                        backgroundColor: ['#22c55e', '#ef4444', '#f59e0b']
                                      }
                                    ]
                                  }}
                                  options={{ plugins: { legend: { position: 'top' } } }}
                                  height={180}
                                />
                              </div>
                            </div>
                          )}

                          {/* Results Table */}
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                              <h4 className="text-lg font-semibold text-gray-900">Contest Results</h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participant</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Taken</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {contestResults.map((result, index) => (
                                    <tr key={result.id} className="hover:bg-gray-50">
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          {index === 0 && <Trophy className="w-4 h-4 text-yellow-500 mr-2" />}
                                          {index === 1 && <Award className="w-4 h-4 text-gray-400 mr-2" />}
                                          {index === 2 && <Award className="w-4 h-4 text-orange-400 mr-2" />}
                                          <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">{result.name || 'Unknown'}</div>
                                          <div className="text-sm text-gray-500">{result.email || 'No email'}</div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{result.score || 0}</div>
                                        <div className="text-sm text-gray-500">
                                          {contestStats?.totalQuestions ? `${((result.score || 0) / contestStats.totalQuestions * 100).toFixed(1)}%` : '0%'}
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{result.timeTaken ? `${result.timeTaken} min` : 'N/A'}</td>
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${result.submittedAt ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                          {result.submittedAt ? 'Yes' : 'No'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => fetchParticipantAnswers(selectedContest.id, result.id)} className="text-black hover:text-gray-700 flex items-center space-x-1">
                                          <FileText className="w-4 h-4" />
                                          <span>View Answers</span>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-600">No results available for this contest.</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Participant Answers Modal */}
      {showParticipantModal && participantDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-black">Participant Answers</h3>
                <p className="text-gray-600 mt-1">{participantDetails.participant?.name} • {participantDetails.participant?.email}</p>
              </div>
              <button onClick={() => setShowParticipantModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Score</div>
                  <div className="text-lg font-semibold">{participantDetails.participant?.score}/{participantDetails.participant?.totalQuestions}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Percentage</div>
                  <div className="text-lg font-semibold">{participantDetails.participant?.percentage?.toFixed ? participantDetails.participant.percentage.toFixed(1) : participantDetails.participant?.percentage}%</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Time Taken</div>
                  <div className="text-lg font-semibold">{participantDetails.participant?.timeTaken} min</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Submitted</div>
                  <div className="text-lg font-semibold">{participantDetails.participant?.submittedAt ? 'Yes' : 'No'}</div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900">Answers</h4>
                </div>
                <div className="divide-y">
                  {participantDetails.questions?.map((q, idx) => (
                    <div key={q.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="pr-4">
                          <div className="text-sm font-medium text-gray-900">Q{idx + 1}. {q.question}</div>
                          <div className="mt-2 space-y-1 text-sm text-gray-700">
                            {Array.isArray(q.options) ? q.options.map((option, index) => (
                              <div key={index} className={`flex items-center ${Array.isArray(q.correctAnswers) && q.correctAnswers.includes(option) ? 'font-semibold text-green-700' : ''}`}>
                                <span className="uppercase mr-2">{String.fromCharCode(97 + index)})</span>
                                <span>{option}</span>
                              </div>
                            )) : ['a','b','c','d'].map(key => (
                              <div key={key} className={`flex items-center ${q.correctAnswer === key ? 'font-semibold text-green-700' : ''}`}>
                                <span className="uppercase mr-2">{key})</span>
                                <span>{q.options?.[key]}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="min-w-[160px] text-right">
                          <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${q.isCorrect ? 'bg-green-100 text-green-800' : q.userAnswer ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{q.isCorrect ? 'Correct' : q.userAnswer ? 'Incorrect' : 'Not answered'}</div>
                          <div className="text-xs text-gray-600 mt-2">Your answer: {q.userAnswer || '-'}</div>
                          <div className="text-xs text-gray-600">Correct: {
                            Array.isArray(q.correctAnswers) 
                              ? q.correctAnswers.join(', ')
                              : q.correctAnswer || 'Not available'
                          }</div>
                        </div>
                      </div>
                      {q.explanation && (
                        <div className="mt-3 text-sm text-gray-600">
                          <span className="font-medium text-gray-800">Explanation: </span>{q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminResults; 