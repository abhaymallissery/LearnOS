import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export const checkHealth = () => api.get("/api/health");

// ---- Auth ----
export const registerUser = (data) => api.post("/api/auth/register", data);
export const loginUser = (data) => {
  const form = new URLSearchParams();
  form.append("username", data.email);
  form.append("password", data.password);
  return api.post("/api/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
};
export const getMe = () => api.get("/api/auth/me");
export const forgotPassword = (data) => api.post("/api/auth/forgot-password", data);
export const resetPassword = (data) => api.post("/api/auth/reset-password", data);
export const verifyEmail = (token) => api.get(`/api/auth/verify-email?token=${token}`);

// ---- Subjects / Topics ----
export const listSubjects = () => api.get("/api/subjects");
export const createSubject = (data) => api.post("/api/subjects", data);
export const deleteSubject = (id) => api.delete(`/api/subjects/${id}`);
export const listTopics = (subjectId) => api.get(`/api/topics?subject_id=${subjectId}`);
export const createTopic = (data) => api.post("/api/topics", data);
export const deleteTopic = (id) => api.delete(`/api/topics/${id}`);
export const updateTopic = (id, data) => api.patch(`/api/topics/${id}`, data);
export const updateTopicStatus = (id, status) =>
  api.patch(`/api/topics/${id}/status`, { status });

// ---- Documents / Library ----
export const listDocuments = (subjectId) =>
  api.get(`/api/documents${subjectId ? `?subject_id=${subjectId}` : ""}`);
export const uploadDocument = (subjectId, file, onProgress) => {
  const form = new FormData();
  form.append("subject_id", subjectId);
  form.append("file", file);
  return api.post("/api/documents/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  });
};
export const uploadUrl = (subjectId, url) => api.post("/api/documents/url", { subject_id: subjectId, url });
export const getDocument = (id) => api.get(`/api/documents/${id}`);
export const getDocumentsByDate = (date) => api.get(`/api/documents-by-date?date=${date}`);
export const getUploadDates = () => api.get("/api/documents-upload-dates");
export const deleteDocument = (id) => api.delete(`/api/documents/${id}`);
export const getDocumentNotes = (id) => api.get(`/api/documents/${id}/notes`);
export const searchLibrary = (q) => api.get(`/api/search?q=${encodeURIComponent(q)}`);

// ---- Chat ----
export const createChatSession = (data) => api.post("/api/chat/sessions", data);
export const listChatSessions = () => api.get("/api/chat/sessions");
export const getChatMessages = (sessionId) =>
  api.get(`/api/chat/sessions/${sessionId}/messages`);
export const askChat = (data) => api.post("/api/chat/ask", data);
export const deleteChatSession = (id) => api.delete(`/api/chat/sessions/${id}`);
export const renameChatSession = (id, title) => api.patch(`/api/chat/sessions/${id}`, { title });

// ---- Exam Center ----
export const generateQuiz = (data) => api.post("/api/exam/generate", data);
export const submitQuiz = (data) => api.post("/api/exam/submit", data);
export const quizHistory = () => api.get("/api/exam/history");

// ---- Revision Center ----
export const dueReviews = () => api.get("/api/revision/due");
export const upcomingReviews = () => api.get("/api/revision/upcoming");
export const submitReview = (data) => api.post("/api/revision/review", data);
export const getStickyNotes = (subjectId) => api.get(`/api/revision/sticky_notes${subjectId ? `?subject_id=${subjectId}` : ''}`);

// ---- Recommendations ----
export const nextTopics = (limit = 5) => api.get(`/api/recommend/next-topics?limit=${limit}`);

// ---- Analytics / Timeline ----
export const analyticsOverview = () => api.get("/api/analytics/overview");
export const analyticsTimeline = () => api.get("/api/analytics/timeline");
export const logDailyStudy = (documentIds, minutes) =>
  api.post("/api/analytics/daily-log", documentIds, { params: { minutes } });

// ---- Share Center ----
export const createShareLink = (data) => api.post("/api/share/create", data);
export const resolveShareLink = (token) => api.get(`/api/share/${token}`);
export const duplicateShareLink = (token) => api.post(`/api/share/${token}/duplicate`);
export const consumeShareLink = (token) => api.post(`/api/share/${token}/consume`);

// ---- Study Targets & Daily Plan ----
export const listStudyTargets = () => api.get("/api/study_targets");
export const createStudyTarget = (data) => api.post("/api/study_targets", data);
export const deleteStudyTarget = (id) => api.delete(`/api/study_targets/${id}`);
export const addStudyTask = (targetId, data) => api.post(`/api/study_targets/${targetId}/tasks`, data);
export const toggleStudyTask = (taskId) => api.patch(`/api/study_targets/tasks/${taskId}/toggle`);
export const deleteStudyTask = (taskId) => api.delete(`/api/study_targets/tasks/${taskId}`);
export const getGlobalDailyTasks = () => api.get("/api/study_targets/tasks");
export const resetGlobalDailyTasks = () => api.delete("/api/study_targets/tasks/reset");
export const addGlobalDailyTask = (data) => api.post("/api/study_targets/tasks", data);
export const getDailyTasksAnalytics = () => api.get("/api/study_targets/analytics/tasks");

// ---- Manual Notes ----
export const getTopicNotes = (topicId) => api.get(`/api/topics/${topicId}/notes`);
export const getSubjectNotes = (subjectId) => api.get(`/api/topics/subject/${subjectId}/notes`);
export const reviewManualNote = (topicId, content) => api.post(`/api/topics/${topicId}/review_note`, { content });
export const createManualNote = (topicId, content) => api.post(`/api/topics/${topicId}/notes`, { content });
