import { Switch, Route } from "wouter";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import NotificationsPage from "@/pages/notifications";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminStudents from "@/pages/admin/students";
import AdminMentors from "@/pages/admin/mentors";
import AdminErrorLogs from "@/pages/admin/error-logs";
import AdminSubjects from "@/pages/admin/subjects";

// Mentor pages
import MentorDashboard from "@/pages/mentor/dashboard";
import MentorMentees from "@/pages/mentor/mentees";
import MentorAtRisk from "@/pages/mentor/at-risk";

// Mentee pages
import MenteeDashboard from "@/pages/mentee/dashboard";
import MenteeSelfAssessment from "@/pages/mentee/self-assessment";
import MenteeMessages from "@/pages/mentee/messages";
import AcademicProgressPage from "@/pages/mentee/academic-progress";

function Router() {
  return (
    <Switch>
      {/* Auth Route */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Admin Routes */}
      <ProtectedRoute path="/" component={AdminDashboard} />
      <ProtectedRoute path="/admin/students" component={AdminStudents} />
      <ProtectedRoute path="/admin/mentors" component={AdminMentors} />
      <ProtectedRoute path="/admin/subjects" component={AdminSubjects} />
      <ProtectedRoute path="/admin/error-logs" component={AdminErrorLogs} />
      
      {/* Mentor Routes */}
      <ProtectedRoute path="/mentor" component={MentorDashboard} />
      <ProtectedRoute path="/mentor/mentees" component={MentorMentees} />
      <ProtectedRoute path="/mentor/at-risk" component={MentorAtRisk} />
      
      {/* Mentee Routes */}
      <ProtectedRoute path="/mentee" component={MenteeDashboard} />
      <ProtectedRoute path="/mentee/self-assessment" component={MenteeSelfAssessment} />
      <ProtectedRoute path="/mentee/messages" component={MenteeMessages} />
      <ProtectedRoute path="/mentee/academic-progress" component={AcademicProgressPage} />
      
      {/* Common User Routes */}
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return <Router />;
}

export default App;
