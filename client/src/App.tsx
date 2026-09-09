import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { ProtectedRoute } from "@/lib/protected-route";
import { LogoutProvider } from "@/components/auth/logout-provider";
import AuthPage from "@/pages/auth-page";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminCourses from "@/pages/admin/courses";
import AdminCourseProgress from "@/pages/admin/course-progress";
import AdminExams from "@/pages/admin/exams";
import AdminStudents from "@/pages/admin/students";
import AdminStudentDetails from "@/pages/admin/student-details";
import AdminBatches from "@/pages/admin/batches";
import AdminBatchDetails from "@/pages/admin/batch-details";
import AdminReports from "@/pages/admin/reports";
import AdminProfile from "@/pages/admin/profile";
import AdminGrading from "@/pages/admin/grading";
import AdminThemeStudio from "@/pages/admin/theme-studio";
import { ThemeProvider } from "@/theme";

// Student Pages
import StudentDashboard from "@/pages/student/dashboard";
import StudentMyCourses from "@/pages/student/my-courses";
import StudentCourseDetails from "@/pages/student/course-details";
import StudentUpcomingExams from "@/pages/student/upcoming-exams";
import StudentResults from "@/pages/student/results";
import StudentProfile from "@/pages/student/profile";
import StudentAIAssistant from "@/pages/student/ai-assistant";
import StudentTakeQuiz from "@/pages/student/take-quiz";
import StudentTakeExam from "@/pages/student/take-exam";

function Router() {
  return (
    <Switch>
      {/* Public Route */}
      <Route path="/auth" component={AuthPage} />

      {/* Admin Routes */}
      <ProtectedRoute path="/" component={AdminDashboard} roles={["admin", "superadmin"]} />
      <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} roles={["admin", "superadmin"]} />
      <ProtectedRoute path="/admin/courses" component={AdminCourses} roles={["admin", "superadmin"]} />
      <ProtectedRoute path="/admin/courses/:id/progress" component={AdminCourseProgress} roles={["admin", "superadmin"]} />
      <ProtectedRoute path="/admin/exams" component={AdminExams} roles={["admin", "superadmin"]} />
      <ProtectedRoute path="/admin/students" component={AdminStudents} roles={["admin", "superadmin"]} />
      <ProtectedRoute path="/admin/students/:id" component={AdminStudentDetails} roles={["admin", "superadmin"]} />
      <ProtectedRoute path="/admin/batches" component={AdminBatches} roles={["admin", "superadmin"]} />
      <ProtectedRoute path="/admin/batches/:id" component={AdminBatchDetails} roles={["admin", "superadmin"]} />
      <ProtectedRoute path="/admin/reports" component={AdminReports} roles={["admin", "superadmin"]} />
      <ProtectedRoute path="/admin/grading" component={AdminGrading} roles={["admin", "superadmin"]} />
      <ProtectedRoute path="/admin/theme-studio" component={AdminThemeStudio} roles={["admin", "superadmin"]} />
      <ProtectedRoute path="/admin/profile" component={AdminProfile} roles={["admin", "superadmin"]} />

      {/* Student Routes */}
      <ProtectedRoute path="/student/dashboard" component={StudentDashboard} roles={["student"]} />
      <ProtectedRoute path="/student/my-courses" component={StudentMyCourses} roles={["student"]} />
      <ProtectedRoute path="/student/quiz/:courseId/:moduleId/:lessonId" component={StudentTakeQuiz} roles={["student"]} />
      <ProtectedRoute path="/student/take-exam/:examId" component={StudentTakeExam} roles={["student"]} />
      <ProtectedRoute path="/student/my-courses/:id" component={StudentCourseDetails} roles={["student"]} />
      <ProtectedRoute path="/student/upcoming-exams" component={StudentUpcomingExams} roles={["student"]} />
      <ProtectedRoute path="/student/results" component={StudentResults} roles={["student"]} />
      <ProtectedRoute path="/student/ai-assistant" component={StudentAIAssistant} roles={["student"]} />
      <ProtectedRoute path="/student/profile" component={StudentProfile} roles={["student"]} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  return (
    <LogoutProvider>
      <Router />
      <Toaster />
    </LogoutProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <SidebarProvider>
            <AppContent />
          </SidebarProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
