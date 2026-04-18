import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.js";
import AppShell from "./layout/AppShell.jsx";
import Calendar from "./pages/Calendar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import Nutrition from "./pages/Nutrition.jsx";
import Profile from "./pages/Profile.jsx";
import Progress from "./pages/Progress.jsx";
import Register from "./pages/Register.jsx";
import TemplateEditor from "./pages/TemplateEditor.jsx";
import TemplatesList from "./pages/TemplatesList.jsx";
import WorkoutEditor from "./pages/WorkoutEditor.jsx";
import WorkoutsList from "./pages/WorkoutsList.jsx";

function ProtectedRoute({ children }) {
  const { token, hydrating } = useAuth();
  if (hydrating) {
    return <p className="ff-meta">Restoring session…</p>;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/workouts" element={<WorkoutsList />} />
        <Route path="/workouts/new" element={<WorkoutEditor />} />
        <Route path="/workouts/:id" element={<WorkoutEditor />} />
        <Route path="/templates" element={<TemplatesList />} />
        <Route path="/templates/new" element={<TemplateEditor />} />
        <Route path="/templates/:id" element={<TemplateEditor />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
