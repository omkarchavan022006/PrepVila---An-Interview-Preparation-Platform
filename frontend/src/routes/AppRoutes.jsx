import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout'
import Spinner from '../components/common/Spinner'
import ProtectedRoute from './ProtectedRoute'
import PublicRoute from './PublicRoute'

const LandingPage = lazy(() => import('../pages/LandingPage'))
const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'))
const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'))
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'))
const ResumeAnalyzerPage = lazy(() => import('../pages/resumes/ResumeAnalyzerPage'))
const ResumeDetailPage = lazy(() => import('../pages/resumes/ResumeDetailPage'))
const JobsPage = lazy(() => import('../pages/jobs/JobsPage'))
const JobDetailPage = lazy(() => import('../pages/jobs/JobDetailPage'))
const SkillGapAnalysisPage = lazy(() => import('../pages/skills/SkillGapAnalysisPage'))
const QuestionGeneratorPage = lazy(() => import('../pages/questions/QuestionGeneratorPage'))
const QuestionHistoryPage = lazy(() => import('../pages/questions/QuestionHistoryPage'))
const QuestionDetailPage = lazy(() => import('../pages/questions/QuestionDetailPage'))
const MockInterviewPage = lazy(() => import('../pages/interviews/MockInterviewPage'))
const MockInterviewSessionPage = lazy(() => import('../pages/interviews/MockInterviewSessionPage'))
const MockInterviewHistoryPage = lazy(() => import('../pages/interviews/MockInterviewHistoryPage'))
const MockInterviewDetailPage = lazy(() => import('../pages/interviews/MockInterviewDetailPage'))
const InterviewFeedbackPage = lazy(() => import('../pages/feedback/InterviewFeedbackPage'))
const FeedbackHistoryPage = lazy(() => import('../pages/feedback/FeedbackHistoryPage'))
const FeedbackDetailPage = lazy(() => import('../pages/feedback/FeedbackDetailPage'))
const ResumeBuilderPage = lazy(() => import('../pages/resumeBuilder/ResumeBuilderPage'))
const ResumeBuilderHistoryPage = lazy(() => import('../pages/resumeBuilder/ResumeBuilderHistoryPage'))
const ChatbotPage = lazy(() => import('../pages/chatbot/ChatbotPage'))
const FollowupQuestionsPage = lazy(() => import('../pages/followup/FollowupQuestionsPage'))
const CodingInterviewPage = lazy(() => import('../pages/codingInterview/CodingInterviewPage'))
const CodingInterviewHistoryPage = lazy(() => import('../pages/codingInterview/CodingInterviewHistoryPage'))
const CodingSubmissionDetailPage = lazy(() => import('../pages/codingInterview/CodingSubmissionDetailPage'))
const CodeDebuggerPage = lazy(() => import('../pages/codeDebugger/CodeDebuggerPage'))
const CodeDebuggerHistoryPage = lazy(() => import('../pages/codeDebugger/CodeDebuggerHistoryPage'))
const CodeDebuggerDetailPage = lazy(() => import('../pages/codeDebugger/CodeDebuggerDetailPage'))
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="grid min-h-[60vh] place-items-center bg-canvas"><Spinner label="Loading page" /></div>}>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/resume-analyzer" element={<ResumeAnalyzerPage />} />
          <Route path="/dashboard/resume-analyzer/:resumeId" element={<ResumeDetailPage />} />
          <Route path="/dashboard/jobs" element={<JobsPage />} />
          <Route path="/dashboard/jobs/:jobId" element={<JobDetailPage />} />
          <Route path="/dashboard/skill-gap-analysis" element={<SkillGapAnalysisPage />} />
          <Route path="/dashboard/questions" element={<QuestionGeneratorPage />} />
          <Route path="/dashboard/questions/history" element={<QuestionHistoryPage />} />
          <Route path="/dashboard/questions/:generationId" element={<QuestionDetailPage />} />
          <Route path="/dashboard/interviews" element={<MockInterviewPage />} />
          <Route path="/dashboard/interviews/history" element={<MockInterviewHistoryPage />} />
          <Route path="/dashboard/interviews/session/:interviewId" element={<MockInterviewSessionPage />} />
          <Route path="/dashboard/interviews/:interviewId" element={<MockInterviewDetailPage />} />
          <Route path="/dashboard/feedback" element={<InterviewFeedbackPage />} />
          <Route path="/dashboard/feedback/history" element={<FeedbackHistoryPage />} />
          <Route path="/dashboard/feedback/:feedbackId" element={<FeedbackDetailPage />} />
          <Route path="/dashboard/resume-builder" element={<ResumeBuilderPage />} />
          <Route path="/dashboard/resume-builder/history" element={<ResumeBuilderHistoryPage />} />
          <Route path="/dashboard/chatbot" element={<ChatbotPage />} />
          <Route path="/dashboard/follow-up-questions" element={<FollowupQuestionsPage />} />
          <Route path="/dashboard/follow-up-questions/:followupId" element={<FollowupQuestionsPage />} />
          <Route path="/dashboard/coding-interview" element={<CodingInterviewPage />} />
          <Route path="/dashboard/coding-interview/history" element={<CodingInterviewHistoryPage />} />
          <Route path="/dashboard/coding-interview/submission/:submissionId" element={<CodingSubmissionDetailPage />} />
          <Route path="/dashboard/code-debugger" element={<CodeDebuggerPage />} />
          <Route path="/dashboard/code-debugger/history" element={<CodeDebuggerHistoryPage />} />
          <Route path="/dashboard/code-debugger/:debugId" element={<CodeDebuggerDetailPage />} />
          <Route path="/dashboard/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
    </Suspense>
  )
}
