

import React, { useState, useEffect, useRef } from 'react';
import AdminResults from './AdminResults';
import { Users, UserPlus, Activity, BarChart3, Eye, Plus, Settings, Trophy, Users as UsersIcon, FileText, Tag, Edit, Trash2, Video, X, Upload, Pencil, Download, Bookmark as BookmarkIcon, Bot as BotIcon, Bell as BellIcon, LogOut as LogOutIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bar, Pie } from 'react-chartjs-2';
import { toast } from 'react-toastify';
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
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);
import { useNotifications } from '../contexts/NotificationContext.jsx';
import AIAssistant from './AIAssistant.jsx';
import Bookmark from './Bookmark.jsx';
import CreateContest from './CreateContest.jsx';

const AdminDashboard = ({ user, onNavigate }) => {
  const location = useLocation();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showCreateModerator, setShowCreateModerator] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showPdfForm, setShowPdfForm] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [pdfSubmitMsg, setPdfSubmitMsg] = useState('');
  const [videoSubmitMsg, setVideoSubmitMsg] = useState('');
  const [form, setForm] = useState({
    question: '',
    category: 'Aptitude',
    subcategory: '',
    level: 'easy',
    options: ['', '', '', ''], // Changed from { a: '', b: '', c: '', d: '' } to array
    correctAnswers: [], // Array of correct answer strings
    explanation: ''
  });
  const [resourceView, setResourceView] = useState('questions'); // 'questions' | 'pdf' | 'video'
  const [resources, setResources] = useState([]);
  const [pdfForm, setPdfForm] = useState({
    title: '',
    description: '',
    category: 'Aptitude',
    subcategory: '',
    level: 'medium',
    file: null
  });
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    category: 'Aptitude',
    subcategory: '',
    level: 'medium',
    videoUrl: ''
  });
  const [showContestForm, setShowContestForm] = useState(false);
  const [contestForm, setContestForm] = useState({
    name: '',
    type: 'DSA',
    numberOfQuestions: 1,
    questions: [{
      question: '',
      options: { a: '', b: '', c: '', d: '' },
      correctAns: '',
      explanation: '',
      subcategory: '',
      level: ''
    }],
    startDate: '',
    startTime: '12:00',
    startAMPM: 'AM',
    endDate: '',
    endTime: '12:00',
    endAMPM: 'AM'
  });
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Management view state
  const [allContests, setAllContests] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allSubcategories, setAllSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [subcategoryQuestions, setSubcategoryQuestions] = useState([]);
  const [excelUploadStatus, setExcelUploadStatus] = useState('');
  const fileInputRef = useRef();
  const [jsonUploadStatus, setJsonUploadStatus] = useState('');
  const jsonFileInputRef = useRef();

  // Add missing state for new tab content
  const [userResults, setUserResults] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [contests, setContests] = useState([]);
  const [showCreateQuestion, setShowCreateQuestion] = useState(false);
  const [showCreateContest, setShowCreateContest] = useState(false);
  const [editingContestId, setEditingContestId] = useState(null);
  const [userActivities, setUserActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [moderators, setModerators] = useState([]);
  const [stats, setStats] = useState(null);
  const [showContestQuestionsModal, setShowContestQuestionsModal] = useState(false);
  const [selectedContestQuestions, setSelectedContestQuestions] = useState([]);
  
  // Bulk delete state
  const [selectedContestIds, setSelectedContestIds] = useState([]);
  const [selectedMCQIds, setSelectedMCQIds] = useState([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedContestTitle, setSelectedContestTitle] = useState('');
  const [loadingContestQuestions, setLoadingContestQuestions] = useState(false);
  const [contestStats, setContestStats] = useState([]);
  const [selectedContestStats, setSelectedContestStats] = useState(null);
  const [showContestStatsModal, setShowContestStatsModal] = useState(false);
  const [loadingContestStats, setLoadingContestStats] = useState(false);

  // Add filter/sort state
  const [contestSort, setContestSort] = useState({ field: 'startTime', order: 'desc' });
  const [contestStatus, setContestStatus] = useState('all'); // all, completed, upcoming, live
  const [contestCodeFilter, setContestCodeFilter] = useState('all'); // all, with, without

  // Modal scroll lock
  useEffect(() => {
    if (showForm || showContestForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showForm, showContestForm]);

  // Modal scroll lock for contest questions modal
  useEffect(() => {
    if (showContestQuestionsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showContestQuestionsModal]);

  // Fetch all contests
  useEffect(() => {
    if (selectedTab === 'contests') {
      fetch('/api/testseries', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setAllContests(data.testSeries || []))
        .catch(err => console.error('Error fetching contests:', err));
    }
  }, [selectedTab]);

  // Fetch items for Resources and Tags
  useEffect(() => {
    if (selectedTab === 'resources' || selectedTab === 'tags') {
      // Always refresh questions for tags usage
      fetch('/api/questions', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setAllQuestions(data.questions || []));

      if (selectedTab === 'resources') {
        if (resourceView === 'questions') {
          setResources([]); // Clear resources when viewing questions
        } else {
          // Use the same fetch logic as Resource.jsx
          const fetchResources = async () => {
            try {
              if (resourceView === 'pdf') {
                const pdfResponse = await fetch('/api/resources?type=PDF', { credentials: 'include' });
                if (!pdfResponse.ok) {
                  throw new Error(`PDF fetch failed: ${pdfResponse.status}`);
                }
                const pdfData = await pdfResponse.json();
                const pdfResources = Array.isArray(pdfData) ? pdfData : pdfData.resources || [];
                setResources(pdfResources);
              } else if (resourceView === 'video') {
                const videoResponse = await fetch('/api/resources?type=VIDEO', { credentials: 'include' });
                if (!videoResponse.ok) {
                  throw new Error(`Video fetch failed: ${videoResponse.status}`);
                }
                const videoData = await videoResponse.json();
                const videoResources = Array.isArray(videoData) ? videoData : videoData.resources || [];
                setResources(videoResources);
              }
            } catch (error) {
              console.error('Error fetching resources:', error);
              setResources([]);
            }
          };
          
          fetchResources();
        }
      }
    }
  }, [selectedTab, resourceView]);

  // Fetch all users
  useEffect(() => {
    if (selectedTab === 'users') {
      fetch('/api/auth/users', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setAllUsers(data.users || []));
    }
  }, [selectedTab]);

  // Extract unique subcategories for Tags
  useEffect(() => {
    if (selectedTab === 'tags') {
      const subcats = Array.from(new Set(allQuestions.map(q => q.subcategory).filter(Boolean)));
      setAllSubcategories(subcats);
    }
  }, [selectedTab, allQuestions]);

  // Fetch questions for selected subcategory
  useEffect(() => {
    if (selectedSubcategory) {
      setSubcategoryQuestions(allQuestions.filter(q => q.subcategory === selectedSubcategory));
    }
  }, [selectedSubcategory, allQuestions]);

  // Handlers for Add Question
  const handleChange = e => {
    const { name, value } = e.target;
    if (["0", "1", "2", "3"].includes(name)) {
      // Handle option changes
      setForm(f => ({
        ...f,
        options: f.options.map((opt, index) => 
          index === parseInt(name) ? value : opt
        )
      }));
    } else {
      // Handle other form fields
      setForm(f => ({ ...f, [name]: value }));
    }
  };
  const handleSubmit = async e => {
    e.preventDefault();
    // basic validation
    if (!form.subcategory || !form.level || !form.question) {
      toast.error('Please fill all required fields.');
      return;
    }
    if (!form.options || form.options.length < 4 || form.options.some(opt => !opt.trim())) {
      toast.error('Please provide all four options.');
      return;
    }
    if (!form.correctAnswers || form.correctAnswers.length === 0 || !form.correctAnswers[0].trim()) {
      toast.error('Please provide a correct answer.');
      return;
    }
    const payload = {
      category: 'Aptitude', // Default category
      subcategory: form.subcategory,
      level: form.level,
      question: form.question,
      options: form.options,
      correctAnswers: form.correctAnswers,
      explanation: form.explanation,
      visibility: true
    };
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || 'Failed to add question.');
        return;
      }
      toast.success('Question added successfully!');
      setShowForm(false);
      setForm({
        category: 'Aptitude',
        subcategory: '',
        level: 'easy',
        question: '',
        options: ['', '', '', ''],
        correctAnswers: [''],
        explanation: ''
      });
      // refresh questions list if present
      fetch('/api/questions', { credentials: 'include' })
        .then(r => r.json())
        .then(d => setAllQuestions(d.questions || []))
        .catch(() => {});
    } catch (err) {
      toast.error('Network error while adding question.');
    }
  };

  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!fileInputRef.current.files[0]) {
      setExcelUploadStatus('Please select a file.');
      return;
    }
    setExcelUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', fileInputRef.current.files[0]);
    try {
      const res = await fetch('/api/questions/upload-excel', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setExcelUploadStatus(data.message || 'Questions uploaded successfully!');
        // Optionally refresh questions
        fetch('/api/questions', { credentials: 'include' })
          .then(res => res.json())
          .then(data => setAllQuestions(data.questions || []));
      } else {
        setExcelUploadStatus(data.message || 'Upload failed.');
      }
    } catch (err) {
      setExcelUploadStatus('Upload failed.');
    }
  };

  const handleJsonUpload = async (e) => {
    e.preventDefault();
    if (!jsonFileInputRef.current.files[0]) {
      setJsonUploadStatus('Please select a file.');
      return;
    }
    setJsonUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', jsonFileInputRef.current.files[0]);
    try {
      const res = await fetch('/api/questions/upload-json', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setJsonUploadStatus(data.message || 'Questions uploaded successfully!');
        // Optionally refresh questions
        fetch('/api/questions', { credentials: 'include' })
          .then(res => res.json())
          .then(data => setAllQuestions(data.questions || []));
      } else {
        setJsonUploadStatus(data.message || 'Upload failed.');
      }
    } catch (err) {
      setJsonUploadStatus('Upload failed.');
    }
  };

  const handleResourceDelete = async (id) => {
    if (!confirm('Delete this resource?')) return;
    try {
      const res = await fetch(`/api/resources/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setResources(resources.filter(r => r.id !== id));
      }
    } catch (_) {}
  };



  const handleBulkDeleteQuestions = async () => {
    if (selectedMCQIds.length === 0) return;
    
    try {
      const promises = selectedMCQIds.map(id => 
        fetch(`/api/questions/${id}`, { method: 'DELETE', credentials: 'include' })
      );
      
      const results = await Promise.all(promises);
      const successCount = results.filter(res => res.ok).length;
      
      if (successCount > 0) {
        setAllQuestions(prev => prev.filter(q => !selectedMCQIds.includes(q.id)));
        setSelectedMCQIds([]);
        alert(`Successfully deleted ${successCount} question(s)`);
      }
    } catch (error) {
      console.error('Error bulk deleting questions:', error);
      alert('Failed to delete some questions');
    }
  };

  const handleDeleteAllQuestions = async () => {
    try {
      const promises = allQuestions.map(q => 
        fetch(`/api/questions/${q.id}`, { method: 'DELETE', credentials: 'include' })
      );
      
      const results = await Promise.all(promises);
      const successCount = results.filter(res => res.ok).length;
      
      if (successCount > 0) {
        setAllQuestions([]);
        setSelectedMCQIds([]);
        alert(`Successfully deleted ${successCount} question(s)`);
      }
    } catch (error) {
      console.error('Error deleting all questions:', error);
      alert('Failed to delete some questions');
    }
  };

  const handleBulkDeleteResources = async () => {
    if (selectedResourceIds.length === 0) return;
    
    try {
      const promises = selectedResourceIds.map(id => 
        fetch(`/api/resources/${id}`, { method: 'DELETE', credentials: 'include' })
      );
      
      const results = await Promise.all(promises);
      const successCount = results.filter(res => res.ok).length;
      
      if (successCount > 0) {
        setResources(prev => prev.filter(r => !selectedResourceIds.includes(r.id)));
        setSelectedResourceIds([]);
        alert(`Successfully deleted ${successCount} resource(s)`);
      }
    } catch (error) {
      console.error('Error bulk deleting resources:', error);
      alert('Failed to delete some resources');
    }
  };

  const handleDeleteAllResources = async () => {
    try {
      const promises = resources.map(r => 
        fetch(`/api/resources/${r.id}`, { method: 'DELETE', credentials: 'include' })
      );
      
      const results = await Promise.all(promises);
      const successCount = results.filter(res => res.ok).length;
      
      if (successCount > 0) {
        setResources([]);
        setSelectedResourceIds([]);
        alert(`Successfully deleted ${successCount} resource(s)`);
      }
    } catch (error) {
      console.error('Error deleting all resources:', error);
      alert('Failed to delete some resources');
    }
  };

  const handleResourceDownload = async (resourceId, fileName) => {
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

  // Handlers for PDF Form
  const handlePdfChange = e => {
    const { name, value } = e.target;
    setPdfForm(f => ({ ...f, [name]: value }));
  };

  const handlePdfFileChange = e => {
    const file = e.target.files[0];
    setPdfForm(f => ({ ...f, file }));
  };

  const handlePdfSubmit = async e => {
    e.preventDefault();
    setPdfSubmitMsg('');
    if (!pdfForm.title || !pdfForm.category) {
      setPdfSubmitMsg('Title and Category are required.');
      return;
    }
    if (!pdfForm.file) {
      setPdfSubmitMsg('Please choose a PDF file.');
      return;
    }
    const formData = new FormData();
    formData.append('type', 'pdf');
    formData.append('title', pdfForm.title);
    formData.append('description', pdfForm.description);
    formData.append('category', pdfForm.category);
    formData.append('subcategory', pdfForm.subcategory);
    formData.append('level', pdfForm.level);
    if (pdfForm.file) {
      formData.append('file', pdfForm.file);
    }

    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPdfSubmitMsg(data.message || 'Failed to add PDF.');
        return;
      }
      setShowPdfForm(false);
      setPdfForm({
        title: '',
        description: '',
        category: 'Aptitude',
        subcategory: '',
        level: 'medium',
        file: null
      });
      
      // Refresh resources if currently viewing PDFs
      if (selectedTab === 'resources' && resourceView === 'pdf') {
        const pdfResponse = await fetch('/api/resources?type=PDF', { credentials: 'include' });
        const pdfData = await pdfResponse.json();
        setResources(Array.isArray(pdfData) ? pdfData : pdfData.resources || []);
      }
    } catch (err) {
      setPdfSubmitMsg('Network error while adding PDF.');
    }
  };

  // Handlers for Video Form
  const handleVideoChange = e => {
    const { name, value } = e.target;
    setVideoForm(f => ({ ...f, [name]: value }));
  };

  const handleVideoSubmit = async e => {
    e.preventDefault();
    setVideoSubmitMsg('');
    if (!videoForm.title || !videoForm.category || !videoForm.videoUrl) {
      setVideoSubmitMsg('Title, Category and Video URL are required.');
      return;
    }
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'video',
          ...videoForm
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVideoSubmitMsg(data.message || 'Failed to add video.');
        return;
      }
      setShowVideoForm(false);
      setVideoForm({
        title: '',
        description: '',
        category: 'Aptitude',
        subcategory: '',
        level: 'medium',
        videoUrl: ''
      });
      
      // Refresh resources if currently viewing videos
      if (selectedTab === 'resources' && resourceView === 'video') {
        const videoResponse = await fetch('/api/resources?type=VIDEO', { credentials: 'include' });
        const videoData = await videoResponse.json();
        setResources(Array.isArray(videoData) ? videoData : videoData.resources || []);
      }
    } catch (err) {
      setVideoSubmitMsg('Network error while adding video.');
    }
  };

  // Handlers for CREATE CONTEST
  const handleContestChange = e => {
    const { name, value } = e.target;
    if (name === 'numberOfQuestions') {
      const num = Math.max(1, parseInt(value) || 1);
      setContestForm(f => ({
        ...f,
        numberOfQuestions: num,
        questions: Array.from({ length: num }, (_, i) => f.questions[i] || {
          question: '',
          options: { a: '', b: '', c: '', d: '' },
          correctAns: '',
          explanation: '',
          subcategory: '',
          level: ''
        })
      }));
      setCurrentQuestionIdx(0);
    } else {
      setContestForm(f => ({ ...f, [name]: value }));
    }
  };
  const getStatus = () => {
    const now = new Date();
    const start = new Date(`${contestForm.startDate} ${contestForm.startTime} ${contestForm.startAMPM}`);
    const end = new Date(`${contestForm.endDate} ${contestForm.endTime} ${contestForm.endAMPM}`);
    if (now < start) return 'Scheduled';
    if (now >= start && now <= end) return 'Active';
    return 'Completed';
  };
  const handleContestQuestionChange = e => {
    const { name, value } = e.target;
    setContestForm(f => {
      const updatedQuestions = [...f.questions];
      if (["a", "b", "c", "d"].includes(name)) {
        updatedQuestions[currentQuestionIdx].options = {
          ...updatedQuestions[currentQuestionIdx].options,
          [name]: value
        };
      } else {
        updatedQuestions[currentQuestionIdx][name] = value;
      }
      return { ...f, questions: updatedQuestions };
    });
  };
  const handleContestSubmit = async e => {
    e.preventDefault();
    // Validate all questions
    for (const q of contestForm.questions) {
      if (!q.question || !q.options[0] || !q.options[1] || !q.options[2] || !q.options[3] || !q.correctAnswers || q.correctAnswers.length === 0 || !q.explanation || !q.subcategory || !q.level) {
        alert('Please fill all fields (including subcategory and level) for every question in the contest.');
      return;
    }
    }
    // Prepare contest data
    const startDateTime = `${contestForm.startDate} ${contestForm.startTime} ${contestForm.startAMPM}`;
    const endDateTime = `${contestForm.endDate} ${contestForm.endTime} ${contestForm.endAMPM}`;
    try {
      // 1. Create all questions and collect their IDs
      const questionIds = [];
      for (const q of contestForm.questions) {
        const res = await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            category: contestForm.type,
            subcategory: q.subcategory,
            level: q.level,
            ...q
          })
        });
        const data = await res.json();
        if (!data.question || !data.question.id) {
          alert('Failed to create a question.');
      return;
    }
        questionIds.push(data.question.id);
      }
      // 2. Create the contest
      const contestRes = await fetch('/api/testseries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: contestForm.name,
          startTime: new Date(startDateTime),
          endTime: new Date(endDateTime),
          questionIds
        })
      });
      if (contestRes.ok) {
        alert('Contest created successfully!');
        setShowContestForm(false);
        // Optionally reset contest form here
      } else {
        alert('Failed to create contest.');
      }
    } catch (err) {
      alert('An error occurred while creating the contest.');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setAllQuestions(qs => qs.filter(q => q.id !== id));
        alert('Question deleted successfully.');
      } else {
        alert(data.message || 'Failed to delete question.');
      }
    } catch (err) {
      alert('Failed to delete question.');
    }
  };



  // Pagination helper functions
  const getCurrentPageData = (data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data) => {
    return Math.ceil(data.length / itemsPerPage);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return (
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Previous
        </button>
        
        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 border text-sm rounded ${
              currentPage === page
                ? 'bg-black text-white border-black'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    );
  };
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const handleEditQuestion = (q) => {
    // Convert options to array if it's an object
    let optionsArray = q.options;
    if (!Array.isArray(q.options)) {
      optionsArray = [q.options.a || '', q.options.b || '', q.options.c || '', q.options.d || ''];
    }
    
    // Convert correctAnswers to array if it's not already
    let correctAnswersArray = q.correctAnswers;
    if (!Array.isArray(q.correctAnswers)) {
      correctAnswersArray = q.correctAns ? [q.correctAns] : [];
    }
    
    setEditForm({ 
      ...q, 
      correctAnswers: correctAnswersArray, 
      options: optionsArray 
    });
    setEditModalOpen(true);
  };
  const handleEditFormChange = e => {
    const { name, value } = e.target;
    if ([0, 1, 2, 3].includes(Number(name))) {
      // Handle array-based options
      setEditForm(f => ({ 
        ...f, 
        options: f.options.map((opt, i) => i === Number(name) ? value : opt) 
      }));
    } else if (name === 'correctAnswer') {
      // Handle correct answer input
      setEditForm(f => ({ ...f, correctAnswers: [value] }));
    } else {
      setEditForm(f => ({ ...f, [name]: value }));
    }
  };
  const handleEditFormSubmit = async e => {
    e.preventDefault();
    
    // Validation
    if (!editForm.subcategory || !editForm.level || !editForm.question) {
      toast.error('Please fill all required fields.');
      return;
    }
    if (!editForm.options || editForm.options.length < 4 || editForm.options.some(opt => !opt.trim())) {
      toast.error('Please provide all four options.');
      return;
    }
    if (!editForm.correctAnswers || editForm.correctAnswers.length === 0 || !editForm.correctAnswers[0].trim()) {
      toast.error('Please provide a correct answer.');
      return;
    }
    
    try {
      const res = await fetch(`/api/questions/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category: 'Aptitude', // Default category
          subcategory: editForm.subcategory,
          level: editForm.level,
          question: editForm.question,
          options: editForm.options,
          correctAnswers: editForm.correctAnswers || [],
          explanation: editForm.explanation,
          visibility: editForm.visibility
        })
      });
      
      if (res.ok) {
        toast.success('Question updated successfully!');
        setEditModalOpen(false);
        // Refresh questions list
        fetch('/api/questions', { credentials: 'include' })
          .then(r => r.json())
          .then(d => setAllQuestions(d.questions || []))
          .catch(() => {});
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || 'Failed to update question.');
      }
    } catch (err) {
      toast.error('Network error while updating question.');
    }
  };

  useEffect(() => {
    fetch('/api/auth/admin/stats', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => setStats(null));
  }, []);

  const [modForm, setModForm] = useState({ fullName: '', email: '', password: '' });
  const [modError, setModError] = useState('');
  const [modSuccess, setModSuccess] = useState('');
  const [isCreatingModerator, setIsCreatingModerator] = useState(false);

  const handleModFormChange = (e) => {
    e.stopPropagation();
    const { name, value } = e.target;
    
    setModForm(prev => ({ ...prev, [name]: value }));
    setModError('');
    setModSuccess('');
  };

  const handleModFormSubmit = async (e) => {
    e.preventDefault();
    if (!modForm.fullName || !modForm.email || !modForm.password) {
      setModError('Please fill all fields.');
      return;
    }
    if (modForm.password.length < 6) {
      setModError('Password must be at least 6 characters long.');
      return;
    }
    
    setIsCreatingModerator(true);
    setModError('');
    
    try {
      const res = await fetch('/api/auth/create-moderator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(modForm)
      });
      const data = await res.json();
      if (res.ok) {
        // Refresh moderators list
        fetch('/api/auth/moderators', { credentials: 'include' })
          .then(res => res.json())
          .then(data => setModerators(data.moderators || []));
        setModSuccess('Moderator created successfully!');
        setTimeout(() => {
          setShowCreateModerator(false);
          setModForm({ fullName: '', email: '', password: '' });
          setModError('');
          setModSuccess('');
        }, 1500);
      } else {
        setModError(data.message || 'Failed to create moderator.');
      }
    } catch (err) {
      setModError('Failed to create moderator. Please try again.');
    } finally {
      setIsCreatingModerator(false);
    }
  };

  const CreateModeratorForm = () => {
    // Local state for the form to prevent interference
    const [localModForm, setLocalModForm] = useState({ fullName: '', email: '', password: '' });
    const [localModError, setLocalModError] = useState('');
    const [localModSuccess, setLocalModSuccess] = useState('');
    const [localIsCreating, setLocalIsCreating] = useState(false);

    const handleLocalModFormChange = (e) => {
      e.stopPropagation();
      const { name, value } = e.target;
      setLocalModForm(prev => ({ ...prev, [name]: value }));
      setLocalModError('');
      setLocalModSuccess('');
    };

    const handleLocalModFormSubmit = async (e) => {
      e.preventDefault();
      if (!localModForm.fullName || !localModForm.email || !localModForm.password) {
        setLocalModError('Please fill all fields.');
        return;
    }
      if (localModForm.password.length < 6) {
        setLocalModError('Password must be at least 6 characters long.');
        return;
      }
      
      setLocalIsCreating(true);
      setLocalModError('');
      
      try {
        const res = await fetch('/api/auth/create-moderator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(localModForm)
        });
        const data = await res.json();
        if (res.ok) {
          // Refresh moderators list
          fetch('/api/auth/moderators', { credentials: 'include' })
            .then(res => res.json())
            .then(data => setModerators(data.moderators || []));
          setLocalModSuccess('Moderator created successfully!');
          setTimeout(() => {
            setShowCreateModerator(false);
            setLocalModForm({ fullName: '', email: '', password: '' });
            setLocalModError('');
            setLocalModSuccess('');
          }, 1500);
        } else {
          setLocalModError(data.message || 'Failed to create moderator.');
        }
      } catch (err) {
        setLocalModError('Failed to create moderator. Please try again.');
      } finally {
        setLocalIsCreating(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg border border-gray-200 p-8 w-full max-w-md relative animate-fadeIn shadow-xl" style={{maxHeight:'95vh',overflow:'auto'}}>
          <button
            onClick={() => setShowCreateModerator(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold transition-colors"
            aria-label="Close"
          >
            ×
          </button>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New Moderator</h2>
            <p className="text-sm text-gray-600">Add a new moderator to help manage the platform</p>
          </div>
          <form className="space-y-6" onSubmit={handleLocalModFormSubmit} key="moderator-form">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              id="moderator-fullName"
              value={localModForm.fullName || ''}
              onChange={handleLocalModFormChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors"
              placeholder="Enter moderator's full name"
              required
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 2 characters, maximum 50 characters</p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              id="moderator-email"
              value={localModForm.email || ''}
              onChange={handleLocalModFormChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors"
              placeholder="moderator@example.com"
              required
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 mt-1">Enter a valid email address</p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              id="moderator-password"
              value={localModForm.password || ''}
              onChange={handleLocalModFormChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors"
              placeholder="Enter secure password"
              required
              autoComplete="new-password"
            />
            <div className="mt-1">
              <p className="text-xs text-gray-500">Minimum 6 characters</p>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full mr-2 ${(localModForm.password || '').length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="text-xs text-gray-500">Password strength</span>
              </div>
            </div>
          </div>
          
          {localModError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-700">{localModError}</span>
              </div>
            </div>
          )}
          
          {localModSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-green-700">{localModSuccess}</span>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setShowCreateModerator(false)} 
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={!localModForm.fullName || !localModForm.email || !localModForm.password || localIsCreating}
            >
              {localIsCreating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Moderator'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'moderators', label: 'Moderators' },
    { id: 'users', label: 'User Analytics' },
    { id: 'resources', label: 'Resources' },
    { id: 'contests', label: 'Contests' },
    { id: 'results', label: 'Results' },
    { id: 'ai', label: 'AI Assistant' },
    { id: 'bookmarks', label: 'Bookmarks' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'createContest', label: 'Create Contest' },
  ];
  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'moderators', label: 'Moderators', icon: UsersIcon },
    { id: 'users', label: 'User Analytics', icon: Users },
    { id: 'resources', label: 'Resources', icon: FileText },
    { id: 'contests', label: 'Contests', icon: Trophy },
    { id: 'createContest', label: 'Create Contest', icon: Trophy },
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'ai', label: 'AI Assistant', icon: BotIcon },
    { id: 'bookmarks', label: 'Bookmarks', icon: BookmarkIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon }
  ];

  useEffect(() => {
    if (selectedTab === 'overview') {
      fetch('/api/auth/activity-logs', { credentials: 'include' })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch activity logs');
          return res.json();
        })
        .then(data => setUserResults(data.logs || []))
        .catch(() => setUserResults([]));
    }
    // Fetch user results for results tab
    if (selectedTab === 'results') {
      fetch('/api/results', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setUserResults(data.results || []))
        .catch(() => setUserResults([]));
      
      // Fetch contest statistics
      fetch('/api/testseries/stats/all', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setContestStats(data.contestStats || []))
        .catch(() => setContestStats([]));
    }
  }, [selectedTab]);

  useEffect(() => {
    if (selectedTab === 'moderators') {
      fetch('/api/auth/moderators', { credentials: 'include' })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch moderators');
          return res.json();
        })
        .then(data => setModerators(data.moderators || []));
    }
  }, [selectedTab]);

  const handleCreateModerator = async (formData) => {
    const res = await fetch('/api/auth/create-moderator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      // Refresh moderators list
      fetch('/api/auth/moderators', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setModerators(data.moderators || []));
      setShowCreateModerator(false);
    }
  };

  const handleDeleteModerator = async (id) => {
    if (!window.confirm('Are you sure you want to delete this moderator?')) return;
    try {
      const res = await fetch(`/api/auth/moderators/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        // Refresh moderators list after deletion
        fetch('/api/auth/moderators', { credentials: 'include' })
          .then(res => res.json())
          .then(data => setModerators(data.moderators || []));
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete moderator');
      }
    } catch (err) {
      alert('Failed to delete moderator');
    }
  };

  const handleViewContestQuestions = async (contest) => {
    setShowContestQuestionsModal(true);
    setSelectedContestTitle(contest.title);
    setLoadingContestQuestions(true);
    try {
      const res = await fetch(`/api/testseries/${contest.id}`, { credentials: 'include' });
      const data = await res.json();
      setSelectedContestQuestions(data.testSeries?.questions || []);
    } catch (err) {
      setSelectedContestQuestions([]);
    }
    setLoadingContestQuestions(false);
  };

  const handleViewContestStats = async (contest) => {
    setShowContestStatsModal(true);
    setLoadingContestStats(true);
    try {
      const res = await fetch(`/api/testseries/${contest.id}/stats`, { credentials: 'include' });
      const data = await res.json();
      setSelectedContestStats(data);
    } catch (err) {
      setSelectedContestStats(null);
    }
    setLoadingContestStats(false);
  };

  // Helper to get contest status
  const getContestStatus = (contest) => {
    const now = new Date();
    const start = new Date(contest.startTime);
    const end = new Date(contest.endTime);
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'live';
    return 'completed';
  };

  // Filter/sort contests
  const filteredContests = allContests
    .filter(c => {
      if (contestStatus !== 'all' && getContestStatus(c) !== contestStatus) return false;
      if (contestCodeFilter === 'with' && !c.requiresCode) return false;
      if (contestCodeFilter === 'without' && c.requiresCode) return false;
      return true;
    })
    .sort((a, b) => {
      const field = contestSort.field;
      const order = contestSort.order === 'asc' ? 1 : -1;
      return (new Date(a[field]) - new Date(b[field])) * order;
    });

  // Debug: Log contest statuses
  console.log('All contests:', allContests.map(c => ({
    id: c.id,
    title: c.title,
    startTime: c.startTime,
    status: getContestStatus(c),
    isUpcoming: getContestStatus(c) === 'upcoming'
  })));

  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && tab !== selectedTab) {
      setSelectedTab(tab);
    }
    // eslint-disable-next-line
  }, [location.search]);

  const handleDeleteContest = async (contest) => {
    try {
      if (!window.confirm(`Delete contest "${contest.title}"? This cannot be undone.`)) return;
      const res = await fetch(`/api/testseries/${contest.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setAllContests(prev => prev.filter(c => c.id !== contest.id));
        alert('Contest deleted successfully.');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to delete contest');
      }
    } catch (err) {
      alert('Failed to delete contest');
    }
  };



  const allSelected = selectedContestIds.length > 0 && selectedContestIds.length === (allContests?.length || 0);
  
  const toggleSelectContest = (id) => {
    setSelectedContestIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (allSelected) setSelectedContestIds([]);
    else setSelectedContestIds((allContests || []).map(c => c.id));
  };
  const handleBulkDeleteContests = async () => {
    if (!window.confirm(`Delete ${selectedContestIds.length} selected contest(s)? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/testseries/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: selectedContestIds })
      });
      if (res.ok) {
        setAllContests(prev => prev.filter(c => !selectedContestIds.includes(c.id)));
        setSelectedContestIds([]);
        alert('Selected contests deleted successfully.');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to delete selected contests');
      }
    } catch (err) {
      alert('Failed to delete selected contests');
    }
  };

  const handleDeleteAllContests = async () => {
    if (!window.confirm(`Delete ALL ${filteredContests.length} contests? This action cannot be undone!`)) return;
    try {
      const promises = filteredContests.map(contest =>
        fetch(`/api/testseries/${contest.id}`, { method: 'DELETE', credentials: 'include' })
      );
      const results = await Promise.all(promises);
      const successCount = results.filter(res => res.ok).length;
      if (successCount > 0) {
        setAllContests(prev => prev.filter(c => !filteredContests.some(fc => fc.id === c.id)));
        setSelectedContestIds([]);
        alert(`Successfully deleted ${successCount} contest(s)`);
      }
    } catch (error) {
      console.error('Error deleting all contests:', error);
      alert('Failed to delete some contests. Please try again.');
    }
  };

  // Contest management states
  const [showContestModal, setShowContestModal] = useState(false);
  const [selectedContest, setSelectedContest] = useState(null);
  const [contestExtension, setContestExtension] = useState(0); // minutes to extend

  // Contest management functions
  const handleExtendContest = async (contestId, extensionMinutes) => {
    try {
      const response = await fetch(`/api/testseries/${contestId}/extend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ extensionMinutes })
      });
      
      if (response.ok) {
        alert(`Contest time extended by ${extensionMinutes} minutes successfully!`);
        setShowContestModal(false);
        setSelectedContest(null);
        // Refresh contests list
        fetchContests();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to extend contest time');
      }
    } catch (error) {
      console.error('Error extending contest:', error);
      alert('Failed to extend contest time');
    }
  };

  const handleRecalculateResults = async (contestId) => {
    try {
      const response = await fetch(`/api/testseries/${contestId}/recalculate-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (response.ok) {
        alert('Contest results recalculated successfully!');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to recalculate results');
      }
    } catch (error) {
      console.error('Error recalculating results:', error);
      alert('Failed to recalculate results');
    }
  };

  const openContestModal = (contest) => {
    setSelectedContest(contest);
    setContestExtension(0);
    setShowContestModal(true);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      localStorage.removeItem('jwt');
      navigate('/');
      window.location.reload();
    } catch (_) {
      navigate('/');
    }
  };

  const AdminNotificationsPanel = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-sm text-blue-600 hover:text-blue-800">
              Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No notifications yet</div>
        ) : (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className={`p-3 rounded border ${!n.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                    <p className="text-sm text-gray-600">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {!n.isRead && (
                      <button onClick={() => markAsRead(n.id)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Read</button>
                    )}
                    <button onClick={() => deleteNotification(n.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="min-h-screen flex">
        <aside className="w-64 border-r border-gray-200 bg-white p-4 sticky top-0 self-start h-screen overflow-y-auto">
          <div className="mb-4">
            <img src="../assests/logo.png" alt="logo" className="w-40 h-15" />
          </div>
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = selectedTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedTab(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm transition-colors ${active ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-6 border-t border-gray-200 pt-4 space-y-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm text-red-600 hover:bg-red-50"
            >
              <LogOutIcon className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </aside>
        <div className="flex-1 px-4 py-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage moderators and monitor system performance</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8 mb-5">
          <div className="bg-white p-6 border border-gray-200 rounded-lg flex justify-between items-center">
              <div>
              <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold">{stats ? stats.totalUsers : '...'}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
          </div>
          <div className="bg-white p-6 border border-gray-200 rounded-lg flex justify-between items-center">
                  <div>
              <p className="text-sm text-gray-500">Active Moderators</p>
                <p className="text-2xl font-bold">{stats ? stats.totalModerators : '...'}</p>
                  </div>
              <UserPlus className="w-8 h-8 text-gray-400" />
            </div>
          <div className="bg-white p-6 border border-gray-200 rounded-lg flex justify-between items-center">
                  <div>
              <p className="text-sm text-gray-500">Tests Conducted</p>
                <p className="text-2xl font-bold">{stats ? stats.totalTests : '...'}</p>
                  </div>
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
          <div className="bg-white p-6 border border-gray-200 rounded-lg flex justify-between items-center">
                <div>
              <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold">{stats ? stats.successRate + '%' : '...'}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-black">Recent Activity</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {userResults.length === 0 ? (
                  <div className="p-6 text-gray-400">No recent activity.</div>
                ) : (
                  userResults.slice(0, 3).map((result, index) => (
                  <div key={index} className="p-6">
                    <div className="flex justify-between items-start">
                    <div>
                          <p className="font-medium">{typeof result.user === 'object' ? (result.user?.fullName || result.user?.email || 'User') : result.user}</p>
                          <p className="text-sm text-gray-600">{result.action}</p>
                          <p className="text-xs text-gray-500">{result.timestamp}</p>
                    </div>
                        {result.score !== undefined && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                            {result.score}%
                      </span>
                    )}
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>

          <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-black">Quick Actions</h2>
              </div>
              <div className="p-6 space-y-4">
              <button
                onClick={() => navigate('/dashboard?tab=resources')}
                className="w-full flex items-center justify-center space-x-2 bg-black text-white px-4 py-3 rounded-md hover:bg-gray-800"
              >
                <Plus className="w-5 h-5" />
                <span>Add Resource</span>
              </button>
              <button
                onClick={() => setSelectedTab('createContest')}
                className="w-full flex items-center justify-center space-x-2 border border-gray-300 px-4 py-3 rounded-md hover:bg-gray-50"
              >
                <Trophy className="w-5 h-5" />
                <span>Create Contest</span>
              </button>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'moderators' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-black">Moderators</h2>
              <button
                onClick={() => setShowCreateModerator(true)}
                className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
              >
                <Plus className="w-4 h-4" />
                <span>Create Moderator</span>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              {moderators.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tests Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Active
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {moderators.map((moderator, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium">{moderator.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-600">{moderator.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded ${
                            moderator.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {moderator.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>{moderator.testsCreated}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-600">
                            {moderator.lastActive ? new Date(moderator.lastActive).toLocaleDateString() : 'Never'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button 
                            onClick={() => handleDeleteModerator(moderator.id)} 
                            className="text-gray-600 hover:text-red-600 transition-colors"
                            title="Delete moderator"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <div className="text-lg font-medium text-gray-500 mb-2">No recent activity</div>
                  <div className="text-gray-400">No moderators found. Create your first moderator to get started.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'ai' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <AIAssistant user={user} />
          </div>
        )}

        {selectedTab === 'bookmarks' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <Bookmark isAdmin={true} />
          </div>
        )}

        {selectedTab === 'notifications' && (
          <AdminNotificationsPanel />
        )}

        {selectedTab === 'createContest' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <CreateContest contestId={editingContestId} embedded={true} onClose={() => { setEditingContestId(null); setSelectedTab('contests'); }} />
          </div>
        )}

        {selectedTab === 'users' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-black">User Analytics</h2>
            </div>
            <div className="overflow-x-auto">
              {allUsers.filter(u => u.role === 'user').length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allUsers.filter(u => u.role === 'user').map(u => (
                      <tr key={u.id} className="border-b hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium">{u.fullName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium">{u.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium">{u.role}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.score !== null ? (
                          <span className={`px-2 py-1 text-xs rounded ${
                              u.score >= 85 ? 'bg-green-100 text-green-800' :
                              u.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                              {u.score}%
                          </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <div className="text-lg font-medium text-gray-500 mb-2">No recent activity</div>
                  <div className="text-gray-400">No users found. Users will appear here once they register.</div>
                </div>
              )}
            </div>
            </div>
        )}

        {selectedTab === 'resources' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-black mb-4">Resource Management</h2>
              
              {/* Add Resource Buttons */}
              <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setShowForm(true)}
                className="group inline-flex items-center gap-2.5 bg-white border border-gray-200 text-gray-800 px-4 py-2.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 active:scale-98"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                <span className="text-sm font-medium">Add Question</span>
              </button>
              
              <button
                onClick={() => setShowPdfForm(true)}
                className="group inline-flex items-center gap-2.5 bg-white border border-gray-200 text-gray-800 px-4 py-2.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 active:scale-98"
              >
                <FileText className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-sm font-medium">Add PDF</span>
              </button>
              
              <button
                onClick={() => setShowVideoForm(true)}
                className="group inline-flex items-center gap-2.5 bg-black border border-gray-800 text-white px-4 py-2.5 rounded-xl hover:bg-gray-900 hover:border-gray-700 hover:shadow-md transition-all duration-200 active:scale-98"
              >
                <Video className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-sm font-medium">Add Video</span>
              </button>
            </div>

              {/* Resource switcher */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600 mr-2">View:</span>
                <button onClick={() => setResourceView('questions')} className={`px-3 py-1 rounded border ${resourceView==='questions'?'bg-black text-white border-black':'bg-white text-gray-700 border-gray-300'}`}>Questions</button>
                <button onClick={() => setResourceView('pdf')} className={`px-3 py-1 rounded border ${resourceView==='pdf'?'bg-black text-white border-black':'bg-white text-gray-700 border-gray-300'}`}>PDFs</button>
                <button onClick={() => setResourceView('video')} className={`px-3 py-1 rounded border ${resourceView==='video'?'bg-black text-white border-black':'bg-white text-gray-700 border-gray-300'}`}>Videos</button>
              </div>

              {/* Bulk Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Excel Card */}
                <form className="bg-gray-50 border border-gray-200 rounded-lg p-4" onSubmit={handleExcelUpload}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Questions (Excel)</label>
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <input type="file" accept=".xlsx, .xls" ref={fileInputRef} className="border rounded px-3 py-2 w-full sm:w-auto" />
                    <button type="submit" className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 border border-black">Upload</button>
                  </div>
                  {excelUploadStatus && <p className="mt-2 text-sm text-gray-600">{excelUploadStatus}</p>}
                </form>

                {/* JSON Card */}
                <form className="bg-gray-50 border border-gray-200 rounded-lg p-4" onSubmit={handleJsonUpload}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Questions (JSON)</label>
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <input 
                    type="file" 
                    accept=".json" 
                    ref={jsonFileInputRef} 
                    className="border rounded px-3 py-2 w-full sm:w-auto" 
                  />
                  <button 
                    type="submit" 
                    className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 border border-black"
                  >
                    Upload
                  </button>

                  {/* Tooltip Info Button */}
                  <div className="relative group">
                    <button className="mt-2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-bold italic">
                      i
                    </button>
                    <div className="absolute left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-black text-white text-xs p-3 rounded-lg w-64">
                      <p className="whitespace-pre-line text-left">
                        {`{
                          "category": "",
                          "subcategory": "",
                          "level": "",
                          "question": "",
                          "options": ["", "", "", ""],
                          "correctAnswers": [""],
                          "explanation": "",
                          "visibility": 
                        }`}
                      </p>
                    </div>
                  </div>
                </div>

                  {jsonUploadStatus && <p className="mt-2 text-sm text-gray-600">{jsonUploadStatus}</p>}
                </form>
              </div>
            </div>
            
            {/* Data tables based on view */}
            {resourceView === 'questions' && (
            <div className="overflow-x-auto">
              {/* Bulk Actions for Questions */}
              <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={getCurrentPageData(allQuestions).length > 0 && selectedMCQIds.length === getCurrentPageData(allQuestions).length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMCQIds(getCurrentPageData(allQuestions).map(q => q.id));
                        } else {
                          setSelectedMCQIds([]);
                        }
                      }}
                      className="w-4 h-4 text-black"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Select All ({selectedMCQIds.length} of {getCurrentPageData(allQuestions).length})
                    </span>
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedMCQIds.length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete ${selectedMCQIds.length} selected question(s)?`)) {
                          handleBulkDeleteQuestions();
                        }
                      }}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    >
                      Delete Selected ({selectedMCQIds.length})
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete ALL ${allQuestions.length} questions? This action cannot be undone!`)) {
                        handleDeleteAllQuestions();
                      }
                    }}
                    className="px-3 py-1 bg-red-800 text-white text-sm rounded hover:bg-red-900 transition-colors"
                  >
                    Delete All ({allQuestions.length})
                  </button>
                </div>
              </div>
              
              <table className="w-full text-left border rounded overflow-hidden">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="py-2 px-3"></th>
                  <th className="py-2 px-3">Question</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Subcategory</th>
                  <th className="py-2 px-3">Level</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allQuestions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-6 text-center text-gray-500"
                    >
                      No questions found
                    </td>
                  </tr>
                ) : (
                  getCurrentPageData(allQuestions).map((q, index) => {
                    const actualIndex =
                      (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <tr
                        key={q.id}
                        className="border-b hover:bg-gray-50 transition"
                      >
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={selectedMCQIds.includes(q.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMCQIds([...selectedMCQIds, q.id]);
                              } else {
                                setSelectedMCQIds(
                                  selectedMCQIds.filter((id) => id !== q.id)
                                );
                              }
                            }}
                            className="w-4 h-4 text-black"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {actualIndex}
                              </span>
                            </div>
                            <div>{q.question}</div>
                          </div>
                        </td>
                        <td className="py-2 px-3">{q.category}</td>
                        <td className="py-2 px-3">{q.subcategory}</td>
                        <td className="py-2 px-3">{q.level}</td>
                        <td className="py-2 px-3 flex gap-2">
                          <button
                            onClick={() => handleEditQuestion(q)}
                            className="text-gray-600 hover:text-black mr-3"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-gray-600 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            
            {/* Pagination for Questions */}
            {getTotalPages(allQuestions) > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {getCurrentPageData(allQuestions).length} of {allQuestions.length} questions
                    {getTotalPages(allQuestions) > 1 && (
                      <span> (Page {currentPage} of {getTotalPages(allQuestions)})</span>
                    )}
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={getTotalPages(allQuestions)}
                    onPageChange={handlePageChange}
                  />
                </div>
              </div>
            )}
            </div>
            )}

            {(resourceView === 'pdf' || resourceView === 'video') && (
              <div className="overflow-x-auto">
                {/* Bulk Actions for PDFs/Videos */}
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={getCurrentPageData(resources).length > 0 && selectedResourceIds.length === getCurrentPageData(resources).length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedResourceIds(getCurrentPageData(resources).map(r => r.id));
                          } else {
                            setSelectedResourceIds([]);
                          }
                        }}
                        className="w-4 h-4 text-black"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Select All ({selectedResourceIds.length} of {getCurrentPageData(resources).length})
                      </span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedResourceIds.length > 0 && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${selectedResourceIds.length} selected ${resourceView === 'pdf' ? 'PDF' : 'video'}(s)?`)) {
                            handleBulkDeleteResources();
                          }
                        }}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        Delete Selected ({selectedResourceIds.length})
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete ALL ${resources.length} ${resourceView === 'pdf' ? 'PDFs' : 'videos'}? This action cannot be undone!`)) {
                          handleDeleteAllResources();
                        }
                      }}
                      className="px-3 py-1 bg-red-800 text-white text-sm rounded hover:bg-red-900 transition-colors"
                    >
                      Delete All ({resources.length})
                    </button>
                  </div>
                </div>
                
                <table className="w-full text-left border rounded overflow-hidden">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="py-2 px-3">
                      </th>
                      <th className="py-2 px-3">Title</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Subcategory</th>
                      <th className="py-2 px-3">Level</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-4 text-center text-gray-500">
                          No {resourceView === 'pdf' ? 'PDF' : 'video'} resources found
                        </td>
                      </tr>
                    ) : (
                      getCurrentPageData(resources).map((resource, index) => {
                        const actualIndex = (currentPage - 1) * itemsPerPage + index + 1;
                        return (
                          <tr key={resource.id} className="border-b hover:bg-gray-50 transition">
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                checked={selectedResourceIds.includes(resource.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedResourceIds([...selectedResourceIds, resource.id]);
                                  } else {
                                    setSelectedResourceIds(selectedResourceIds.filter(id => id !== resource.id));
                                  }
                                }}
                                className="w-4 h-4 text-black"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600">{actualIndex}</span>
                                </div>
                                <div className="font-medium">{resource.title}</div>
                              </div>
                            </td>
                            <td className="py-2 px-3">{resource.category}</td>
                            <td className="py-2 px-3">{resource.subcategory || '-'}</td>
                            <td className="py-2 px-3">{resource.level}</td>
                            <td className="py-2 px-3">{resource.type}</td>
                            <td className="py-2 px-3 flex gap-2">
                              {/* {resourceView === 'pdf' && resource.fileName && (
                                <a 
                                  href={`http://localhost:5001/uploads/resources/${resource.fileName}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-black hover:text-blue-600"
                                >
                                  <Eye className="w-4 h-4" />
                                </a>
                              )} */}
                              {resourceView === 'video' && resource.videoUrl && (
                                <a 
                                  href={resource.videoUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-black hover:text-red-600"
                                >
                                  {resource.videoUrl.includes('youtube.com') || resource.videoUrl.includes('youtu.be') ? (
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                  ) : 'Watch Video'}
                                </a>
                              )}
                              {resourceView === 'pdf' && resource.fileName && (
                                <button 
                                  onClick={() => handleResourceDownload(resource.id, resource.fileName)}
                                  className="text-black hover:text-blue-600"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleResourceDelete(resource.id)} 
                                className="text-gray-600 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                
                {/* Pagination for PDFs/Videos */}
                {getTotalPages(resources) > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Showing {getCurrentPageData(resources).length} of {resources.length} {resourceView === 'pdf' ? 'PDFs' : 'videos'}
                        {getTotalPages(resources) > 1 && (
                          <span> (Page {currentPage} of {getTotalPages(resources)})</span>
                        )}
                      </div>
                      <Pagination
                        currentPage={currentPage}
                        totalPages={getTotalPages(resources)}
                        onPageChange={handlePageChange}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'contests' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <h2 className="text-xl font-semibold text-black">All Contests</h2>
              <div className="flex flex-wrap gap-2 items-center">
                <label className="text-sm">Sort by:</label>
                <select value={contestSort.field} onChange={e => setContestSort(s => ({ ...s, field: e.target.value }))} className="border rounded px-2 py-1">
                  <option value="startTime">Start Time</option>
                  <option value="endTime">End Time</option>
                </select>
                <select value={contestSort.order} onChange={e => setContestSort(s => ({ ...s, order: e.target.value }))} className="border rounded px-2 py-1">
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>
                <label className="text-sm ml-2">Status:</label>
                <select value={contestStatus} onChange={e => setContestStatus(e.target.value)} className="border rounded px-2 py-1">
                  <option value="all">All</option>
                  <option value="completed">Completed</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                </select>
                <label className="text-sm ml-2">Requires Code:</label>
                <select value={contestCodeFilter} onChange={e => setContestCodeFilter(e.target.value)} className="border rounded px-2 py-1">
                  <option value="all">All</option>
                  <option value="with">With Code</option>
                  <option value="without">Without Code</option>
                </select>
                <button
                  onClick={() => { setEditingContestId(null); setSelectedTab('createContest'); }}
                  className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Contest</span>
                </button>
              </div>
            </div>
            
            {/* Bulk Actions for Contests */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-black"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Select All ({selectedContestIds.length} of {filteredContests.length})
                  </span>
                </label>
              </div>
              <div className="flex items-center space-x-2">
                {selectedContestIds.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete ${selectedContestIds.length} selected contest(s)?`)) {
                        handleBulkDeleteContests();
                      }
                    }}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Delete Selected ({selectedContestIds.length})
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm(`Delete ALL ${filteredContests.length} contests? This action cannot be undone!`)) {
                      handleDeleteAllContests();
                    }
                  }}
                  className="px-3 py-1 bg-red-800 text-white text-sm rounded hover:bg-red-900 transition-colors"
                >
                  Delete All ({filteredContests.length})
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {filteredContests.length > 0 ? (
                <table className="w-full text-left border rounded overflow-hidden">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="py-2 px-3">
                      </th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Start Time</th>
                      <th className="py-2 px-3">End Time</th>
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Created By</th>
                      <th className="py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContests.map(contest => (
                      <tr key={contest.id} className="border-b hover:bg-gray-50 transition">
                        <td className="py-2 px-3">
                          <input type="checkbox" checked={selectedContestIds?.includes(contest.id)} onChange={() => toggleSelectContest(contest.id)} />
                        </td>
                        <td className="py-2 px-3">
                          <div>
                            <div className="font-semibold">{contest.title}</div>
                            {contest.hasNegativeMarking && (
                              <div className="text-xs text-red-600 mt-1">
                                Negative Marking: {contest.negativeMarkingValue} per wrong answer
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3">{new Date(contest.startTime).toLocaleString()}</td>
                        <td className="py-2 px-3">{new Date(contest.endTime).toLocaleString()}</td>
                        <td className="py-2 px-3 font-mono text-blue-700">{contest.requiresCode ? contest.contestCode : '-'}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            getContestStatus(contest) === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                            getContestStatus(contest) === 'live' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getContestStatus(contest).charAt(0).toUpperCase() + getContestStatus(contest).slice(1)}
                          </span>
                        </td>
                        <td className="py-2 px-3">{contest.creator?.fullName || 'Unknown'}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-3">
                            <button onClick={() => { setEditingContestId(contest.id); setSelectedTab('createContest'); }} title="Edit">
                              <Pencil className="w-5 h-5 text-gray-800" />
                            </button>
                            <button onClick={() => handleDeleteContest(contest)} title="Delete">
                              <Trash2 className="w-5 h-5 text-red-600" />
                            </button>
                            <button onClick={() => handleViewContestQuestions(contest)} title="View Details" className="flex items-center gap-2">
                              <Eye className="w-5 h-5 text-gray-800" />
                              {/* <span className="text-sm font-medium">View Details</span> */}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <div className="text-lg font-medium text-gray-500 mb-2">No recent activity</div>
                  <div className="text-gray-400">No contests found. Create your first contest to get started.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'results' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-black">Contest Results</h2>
            </div>
            <div className="p-0">
              <AdminResults user={user} embedded />
            </div>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white border border-gray-200 p-4 max-w-sm w-full mx-2 relative rounded-md shadow-md">
              {/* Close */}
              <button
                onClick={() => setShowForm(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
                aria-label="Close"
              >
                ×
              </button>

              <h2 className="text-lg font-bold mb-4 text-black text-center">
                Add New Question
              </h2>

              <form
                onSubmit={handleSubmit}
                className="space-y-3"
              >
                {/* Question */}
                <div>
                  <label className="block text-xs font-semibold text-black mb-1">
                    Question
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-black text-sm"
                    rows={2}
                    name="question"
                    value={form.question}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Topic + Difficulty */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-black mb-1">
                      Topic
                    </label>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-black text-sm"
                      name="subcategory"
                      value={form.subcategory}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black mb-1">
                      Difficulty
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-black text-sm"
                      name="level"
                      value={form.level}
                      onChange={handleChange}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index}>
                      <label className="block text-xs font-semibold text-black mb-1">
                        Option {String.fromCharCode(65 + index)}
                      </label>
                      <input
                        className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-black text-sm"
                        name={index.toString()}
                        value={form.options[index]}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  ))}
                </div>

                {/* Correct Answer */}
                <div>
                  <label className="block text-xs font-semibold text-black mb-1">
                    Correct Answer
                  </label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-black text-sm"
                    name="correctAnswer"
                    value={form.correctAnswers[0] || ''}
                    onChange={(e) => setForm(f => ({ ...f, correctAnswers: [e.target.value] }))}
                    placeholder="Enter the exact correct answer text"
                    required
                  />
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-xs font-semibold text-black mb-1">
                    Explanation
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-black text-sm"
                    rows={2}
                    name="explanation"
                    value={form.explanation}
                    onChange={handleChange}
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    Add Question
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Form for CREATE CONTEST */}
        {showContestForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-sm border border-gray-200 p-6 w-full max-w-2xl relative animate-fadeIn" style={{maxHeight:'95vh',overflow:'auto'}}>
              <button
                onClick={() => setShowContestForm(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-xl font-bold mb-6 text-black-800 text-center">Add New Contest</h2>
              <form onSubmit={handleContestSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                    <input name="name" value={contestForm.name} onChange={handleContestChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400" placeholder="Contest Name" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                    <select name="type" value={contestForm.type} onChange={handleContestChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400">
                      <option value="Technical">Technical</option>
                      <option value="Aptitude">Aptitude</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Number of Questions</label>
                    <input name="numberOfQuestions" value={contestForm.numberOfQuestions} onChange={handleContestChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400" type="number" min="1" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                    <input name="startDate" value={contestForm.startDate} onChange={handleContestChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400" type="date" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
                    <div className="flex gap-2">
                      <select name="startTime" value={contestForm.startTime} onChange={handleContestChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400">
                        {Array.from({length: 48}).map((_,i) => {
                          const h = ((Math.floor(i/4)+11)%12+1);
                          const m = (i%4)*15;
                          const label = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
                          return <option key={label} value={label}>{label}</option>;
                        })}
                      </select>
                      <select name="startAMPM" value={contestForm.startAMPM} onChange={handleContestChange} className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400">
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                    <input name="endDate" value={contestForm.endDate} onChange={handleContestChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400" type="date" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
                    <div className="flex gap-2">
                      <select name="endTime" value={contestForm.endTime} onChange={handleContestChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400">
                        {Array.from({length: 48}).map((_,i) => {
                          const h = ((Math.floor(i/4)+11)%12+1);
                          const m = (i%4)*15;
                          const label = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
                          return <option key={label} value={label}>{label}</option>;
                        })}
                      </select>
                      <select name="endAMPM" value={contestForm.endAMPM} onChange={handleContestChange} className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400">
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700 text-lg">Question {currentQuestionIdx + 1} of {contestForm.numberOfQuestions}</h3>
                    <div className="flex gap-2">
                      <button type="button" disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx(i => i - 1)} className="px-4 py-2 bg-gray-200 rounded-lg font-semibold disabled:opacity-50">Prev</button>
                      <button type="button" disabled={currentQuestionIdx === contestForm.numberOfQuestions - 1} onClick={() => setCurrentQuestionIdx(i => i + 1)} className="px-4 py-2 bg-gray-200 rounded-lg font-semibold disabled:opacity-50">Next</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-base font-semibold text-gray-700 mb-2">Question</label>
                      <input name="question" value={contestForm.questions[currentQuestionIdx].question} onChange={handleContestQuestionChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 mb-2" placeholder="Question" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option A</label>
                      <input name="0" value={contestForm.questions[currentQuestionIdx].options[0]} onChange={handleContestQuestionChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400" placeholder="Option A" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option B</label>
                      <input name="1" value={contestForm.questions[currentQuestionIdx].options[1]} onChange={handleContestQuestionChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400" placeholder="Option B" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option C</label>
                      <input name="2" value={contestForm.questions[currentQuestionIdx].options[2]} onChange={handleContestQuestionChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400" placeholder="Option C" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option D</label>
                      <input name="3" value={contestForm.questions[currentQuestionIdx].options[3]} onChange={handleContestQuestionChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400" placeholder="Option D" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                      <input name="correctAnswers" value={contestForm.questions[currentQuestionIdx].correctAnswers[0]} onChange={handleContestQuestionChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400" placeholder="Enter the exact correct answer text" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
                      <input name="explanation" value={contestForm.questions[currentQuestionIdx].explanation} onChange={handleContestQuestionChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400" placeholder="Explanation" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-sm font-bold hover:bg-gray-800">Add</button>
                  <button type="button" onClick={() => setShowContestForm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-sm font-bold">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Form for Edit Question */}
        {editModalOpen && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white border border-gray-200 p-4 max-w-sm w-full mx-2 relative rounded-md shadow-md">
              {/* Close */}
              <button
                onClick={() => setEditModalOpen(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
                aria-label="Close"
              >
                ×
              </button>

              <h2 className="text-lg font-bold mb-4 text-black text-center">
                Edit Question
              </h2>

              <form
                onSubmit={handleEditFormSubmit}
                className="space-y-3"
              >
                {/* Question */}
                <div>
                  <label className="block text-xs font-semibold text-black mb-1">
                    Question
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-black text-sm"
                    rows={2}
                    name="question"
                    value={editForm.question}
                    onChange={handleEditFormChange}
                    required
                  />
                </div>

                {/* Topic + Difficulty */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-black mb-1">
                      Topic
                    </label>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-black text-sm"
                      name="subcategory"
                      value={editForm.subcategory}
                      onChange={handleEditFormChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black mb-1">
                      Difficulty
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-black text-sm"
                      name="level"
                      value={editForm.level}
                      onChange={handleEditFormChange}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index}>
                      <label className="block text-xs font-semibold text-black mb-1">
                        Option {String.fromCharCode(65 + index)}
                      </label>
                      <input
                        className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-black text-sm"
                        name={index.toString()}
                        value={editForm.options[index]}
                        onChange={handleEditFormChange}
                        required
                      />
                    </div>
                  ))}
                </div>

                {/* Correct Answer */}
                <div>
                  <label className="block text-xs font-semibold text-black mb-1">
                    Correct Answer
                  </label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-black text-sm"
                    name="correctAnswer"
                    value={editForm.correctAnswers[0] || ''}
                    onChange={(e) => setEditForm(f => ({ ...f, correctAnswers: [e.target.value] }))}
                    placeholder="Enter the exact correct answer text"
                    required
                  />
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-xs font-semibold text-black mb-1">
                    Explanation
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-black text-sm"
                    rows={2}
                    name="explanation"
                    value={editForm.explanation}
                    onChange={handleEditFormChange}
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    Save Question
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCreateModerator && (
          <CreateModeratorForm
            onSubmit={handleCreateModerator}
            onCancel={() => setShowCreateModerator(false)}
          />
          )}
        {/* Contest Questions Modal */}
        {showContestQuestionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 relative">
              <button
                onClick={() => setShowContestQuestionsModal(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-xl font-bold mb-6 text-black-800 text-center">Questions in: {selectedContestTitle}</h2>
              {selectedContestQuestions.length > 0 && selectedContestQuestions[0].testSeries && selectedContestQuestions[0].testSeries.requiresCode && (
                <div className="mb-4 text-center">
                  <span className="text-sm text-blue-700 font-mono">Contest Code: {selectedContestQuestions[0].testSeries.contestCode}</span>
                </div>
              )}
              {loadingContestQuestions ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : selectedContestQuestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No questions found for this contest.</div>
              ) : (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                  {selectedContestQuestions.map((q, idx) => (
                    <div key={q.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="mb-2 text-sm text-gray-500">Question {idx + 1}</div>
                      <div className="font-semibold text-gray-900 mb-2">{q.question}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                        {q.options.map((option, index) => (
                          <div key={index} className={`px-3 py-2 rounded border ${q.correctAnswers.includes(option) ? 'bg-green-100 border-green-300 font-semibold text-green-800' : 'bg-white border-gray-200'}`}>
                            <span className="font-bold mr-2">{String.fromCharCode(65 + index)}.</span> {option}
                            {q.correctAnswers.includes(option) && <span className="ml-2 text-green-600">✓</span>}
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-gray-700"><span className="font-semibold">Explanation:</span> {q.explanation}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contest Statistics Modal */}
        {showContestStatsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-4xl w-full mx-4 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowContestStatsModal(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-xl font-bold mb-6 text-black text-center">Detailed Statistics: {selectedContestStats?.contestTitle || 'Contest'}</h2>
              {loadingContestStats ? (
                <div className="text-center py-8 text-gray-500">Loading statistics...</div>
              ) : !selectedContestStats ? (
                <div className="text-center py-8 text-gray-500">No statistics available for this contest.</div>
              ) : (
                <div className="space-y-8">
                  {/* Charts Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Bar Chart: Question-wise stats */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center">
                      <h3 className="font-semibold text-black mb-4 text-center">Question-wise Attempts</h3>
                      <Bar
                        data={{
                          labels: selectedContestStats.questionStats.map((q, i) => `Q${i + 1}`),
                          datasets: [
                            {
                              label: 'Correct',
                              data: selectedContestStats.questionStats.map(q => q.correctAttempts),
                              backgroundColor: '#22c55e',
                              borderWidth: 1,
                            },
                            {
                              label: 'Incorrect',
                              data: selectedContestStats.questionStats.map(q => q.incorrectAttempts),
                              backgroundColor: '#ef4444',
                              borderWidth: 1,
                            },
                            {
                              label: 'Not Attempted',
                              data: selectedContestStats.questionStats.map(q => q.notAttempted),
                              backgroundColor: '#f59e0b',
                              borderWidth: 1,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              labels: { color: '#374151', font: { weight: 'bold' } },
                            },
                            title: { display: false },
                          },
                          scales: {
                            x: { ticks: { color: '#374151' }, grid: { color: '#e5e5e5' } },
                            y: { ticks: { color: '#374151' }, grid: { color: '#e5e5e5' } },
                          },
                        }}
                        height={220}
                      />
                    </div>
                    {/* Pie Chart: Overall distribution */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center">
                      <h3 className="font-semibold text-black mb-4 text-center">Overall Answer Distribution</h3>
                      <Pie
                        data={{
                          labels: ['Correct', 'Incorrect', 'Not Attempted'],
                          datasets: [
                            {
                              data: [
                                selectedContestStats.questionStats.reduce((a, q) => a + q.correctAttempts, 0),
                                selectedContestStats.questionStats.reduce((a, q) => a + q.incorrectAttempts, 0),
                                selectedContestStats.questionStats.reduce((a, q) => a + q.notAttempted, 0),
                              ],
                              backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'],
                              borderColor: ['#fff', '#fff', '#fff'],
                              borderWidth: 2,
                            },
                          ],
                        }}
                        options={{
                          plugins: {
                            legend: {
                              labels: { color: '#374151', font: { weight: 'bold' } },
                            },
                          },
                          cutout: '50%', // This makes the pie chart hollow (donut chart)
                        }}
                        height={220}
                      />
                    </div>
                  </div>

                  {/* Overall Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border border-gray-300 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-black">{selectedContestStats.average?.toFixed(2) || '0'}</div>
                      <div className="text-sm text-gray-700">Average Score</div>
                    </div>
                    <div className="bg-white border border-gray-300 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-black">{selectedContestStats.averagePercentage?.toFixed(1) || '0'}%</div>
                      <div className="text-sm text-gray-700">Average Percentage</div>
                    </div>
                    <div className="bg-white border border-gray-300 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-black">{selectedContestStats.totalParticipants || '0'}</div>
                      <div className="text-sm text-gray-700">Total Participants</div>
                    </div>
                    <div className="bg-white border border-gray-300 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-black">{selectedContestStats.totalQuestions || '0'}</div>
                      <div className="text-sm text-gray-700">Total Questions</div>
                    </div>
                  </div>

                  {/* Question Highlights - Minimalist Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white border border-gray-300 rounded-lg p-4">
                      <h3 className="font-semibold text-black mb-2 flex items-center gap-2">
                        <span>Most Correctly Answered</span>
                        <span className="inline-block w-4 h-4 border-2 border-black rounded-full flex items-center justify-center text-xs font-bold">✓</span>
                      </h3>
                      {selectedContestStats.mostCorrect ? (
                        <div>
                          <div className="font-medium text-black mb-1">{selectedContestStats.mostCorrect.question}</div>
                          <div className="text-xs text-gray-700">Correct: {selectedContestStats.mostCorrect.correctAttempts} | Total: {selectedContestStats.mostCorrect.totalAttempts}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="bg-white border border-gray-300 rounded-lg p-4">
                      <h3 className="font-semibold text-black mb-2 flex items-center gap-2">
                        <span>Most Incorrectly Answered</span>
                        <span className="inline-block w-4 h-4 border-2 border-black rounded-full flex items-center justify-center text-xs font-bold">✗</span>
                      </h3>
                      {selectedContestStats.mostIncorrect ? (
                        <div>
                          <div className="font-medium text-black mb-1">{selectedContestStats.mostIncorrect.question}</div>
                          <div className="text-xs text-gray-700">Incorrect: {selectedContestStats.mostIncorrect.incorrectAttempts} | Total: {selectedContestStats.mostIncorrect.totalAttempts}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="bg-white border border-gray-300 rounded-lg p-4">
                      <h3 className="font-semibold text-black mb-2 flex items-center gap-2">
                        <span>Most Attempted</span>
                        <span className="inline-block w-4 h-4 border-2 border-black rounded-full flex items-center justify-center text-xs font-bold">→</span>
                      </h3>
                      {selectedContestStats.mostAttempted ? (
                        <div>
                          <div className="font-medium text-black mb-1">{selectedContestStats.mostAttempted.question}</div>
                          <div className="text-xs text-gray-700">Attempts: {selectedContestStats.mostAttempted.totalAttempts}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="bg-white border border-gray-300 rounded-lg p-4">
                      <h3 className="font-semibold text-black mb-2 flex items-center gap-2">
                        <span>Least Attempted</span>
                        <span className="inline-block w-4 h-4 border-2 border-black rounded-full flex items-center justify-center text-xs font-bold">↓</span>
                      </h3>
                      {selectedContestStats.leastAttempted ? (
                        <div>
                          <div className="font-medium text-black mb-1">{selectedContestStats.leastAttempted.question}</div>
                          <div className="text-xs text-gray-700">Attempts: {selectedContestStats.leastAttempted.totalAttempts}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No data available</div>
                      )}
                    </div>
                  </div>

                  {/* Question-wise Statistics Table */}
                  {selectedContestStats.questionStats && selectedContestStats.questionStats.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-black mb-4">Question-wise Performance</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border border-gray-200 rounded-lg">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="py-3 px-4 font-medium text-black">Question</th>
                              <th className="py-3 px-4 font-medium text-black">Correct</th>
                              <th className="py-3 px-4 font-medium text-black">Incorrect</th>
                              <th className="py-3 px-4 font-medium text-black">Not Attempted</th>
                              <th className="py-3 px-4 font-medium text-black">Success Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedContestStats.questionStats.map((q, idx) => (
                              <tr key={q.questionId} className="border-t border-gray-200">
                                <td className="py-3 px-4 max-w-xs truncate" title={q.question}>
                                  <span className="font-medium text-black">{q.question}</span>
                                </td>
                                <td className="py-3 px-4 text-black font-medium">{q.correctAttempts}</td>
                                <td className="py-3 px-4 text-black font-medium">{q.incorrectAttempts}</td>
                                <td className="py-3 px-4 text-black font-medium">{q.notAttempted}</td>
                                <td className="py-3 px-4 font-medium text-black">
                                  {q.totalAttempts > 0 ? `${((q.correctAttempts / q.totalAttempts) * 100).toFixed(1)}%` : '0%'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PDF Form Modal */}
        {showPdfForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Add PDF Resource</h2>
                <button
                  onClick={() => setShowPdfForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handlePdfSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={pdfForm.title}
                    onChange={handlePdfChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={pdfForm.description}
                    onChange={handlePdfChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      name="category"
                      value={pdfForm.category}
                      onChange={handlePdfChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="Aptitude">Aptitude</option>
                      <option value="Technical">Technical</option>
                      <option value="Logical">Logical</option>
                      <option value="Verbal">Verbal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                    <select
                      name="level"
                      value={pdfForm.level}
                      onChange={handlePdfChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                  <input
                    type="text"
                    name="subcategory"
                    value={pdfForm.subcategory}
                    onChange={handlePdfChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PDF File *</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfFileChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPdfForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
                  >
                    Add PDF
                  </button>
                </div>
                {pdfSubmitMsg && (
                  <p className="mt-3 text-sm text-red-600">{pdfSubmitMsg}</p>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Video Form Modal */}
        {showVideoForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Add Video Resource</h2>
                <button
                  onClick={() => setShowVideoForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleVideoSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={videoForm.title}
                    onChange={handleVideoChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={videoForm.description}
                    onChange={handleVideoChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      name="category"
                      value={videoForm.category}
                      onChange={handleVideoChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="Aptitude">Aptitude</option>
                      <option value="Technical">Technical</option>
                      <option value="Logical">Logical</option>
                      <option value="Verbal">Verbal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                    <select
                      name="level"
                      value={videoForm.level}
                      onChange={handleVideoChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                  <input
                    type="text"
                    name="subcategory"
                    value={videoForm.subcategory}
                    onChange={handleVideoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Video URL *</label>
                  <input
                    type="url"
                    name="videoUrl"
                    value={videoForm.videoUrl}
                    onChange={handleVideoChange}
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowVideoForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
                  >
                    Add Video
                  </button>
                </div>
                {videoSubmitMsg && (
                  <p className="mt-3 text-sm text-red-600">{videoSubmitMsg}</p>
                )}
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
    </div>
  );
};

export default AdminDashboard;