import { Switch, Route } from "wouter";
import { ProtectedRoute } from "./lib/protected-route";
import { RoleRedirect } from "@/components/role-redirect";
import { ThemeProvider } from "@/contexts/theme-context";
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
import AdminDataImport from "@/pages/admin/data-import";
import AdminGroupChats from "@/pages/admin/group-chats";
import AdminMentorChat from "@/pages/admin-mentor-chat";
import AdminMeetings from "@/pages/admin/meetings";

// Mentor pages
import MentorDashboard from "@/pages/mentor/dashboard";
import MentorMentees from "@/pages/mentor/mentees";
import MentorAttendance from "@/pages/mentor/attendance";
import MentorMarksGrades from "@/pages/mentor/marks-grades";
import MentorMenteesData from "@/pages/mentor/mentees-data";
import MentorAtRisk from "@/pages/mentor/at-risk";
import MentorNotifications from "@/pages/mentor/notifications";

// Meetings (shared)
import MeetingsPage from "@/pages/meetings";

// Mentee pages
import MenteeDashboard from "@/pages/mentee/dashboard";
import AcademicProgressPage from "@/pages/mentee/academic-progress";
import MenteeNotificationsPage from "@/pages/mentee/notifications";

// Common pages
import GroupChat from "@/pages/group-chat";

function Router() {
  return (
    <Switch>
      {/* Auth Route */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Root Route - Redirect based on role */}
      <ProtectedRoute path="/" component={RoleRedirect} />
      
      {/* Admin Routes */}
      <ProtectedRoute path="/admin" component={AdminDashboard} />
      <ProtectedRoute path="/admin/students" component={AdminStudents} />
      <ProtectedRoute path="/admin/mentors" component={AdminMentors} />
      <ProtectedRoute path="/admin/subjects" component={AdminSubjects} />
      <ProtectedRoute path="/admin/data-import" component={AdminDataImport} />
      <ProtectedRoute path="/admin/error-logs" component={AdminErrorLogs} />
      <ProtectedRoute path="/admin/group-chats" component={AdminGroupChats} />
      <ProtectedRoute path="/admin-mentor-chat" component={AdminMentorChat} />
      <ProtectedRoute path="/admin/meetings" component={AdminMeetings} />
      
      {/* Mentor Routes */}
      <ProtectedRoute path="/mentor" component={MentorDashboard} />
      <ProtectedRoute path="/mentor/meetings" component={MeetingsPage} />
      <ProtectedRoute path="/mentor/mentees" component={MentorMentees} />
      <ProtectedRoute path="/mentor/attendance" component={MentorAttendance} />
      <ProtectedRoute path="/mentor/marks-grades" component={MentorMarksGrades} />
      <ProtectedRoute path="/mentor/mentees-data" component={MentorMenteesData} />
      <ProtectedRoute path="/mentor/at-risk" component={MentorAtRisk} />
      <ProtectedRoute path="/mentor/notifications" component={MentorNotifications} />
      
      {/* Mentee Routes */}
      <ProtectedRoute path="/mentee" component={MenteeDashboard} />
      <ProtectedRoute path="/mentee/meetings" component={MeetingsPage} />
      <ProtectedRoute path="/mentee/academic-progress" component={AcademicProgressPage} />
      <ProtectedRoute path="/mentee/notifications" component={MenteeNotificationsPage} />
      
      {/* Common User Routes */}
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <ProtectedRoute path="/messages" component={GroupChat} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router />
    </ThemeProvider>
  );
}

export default App;
