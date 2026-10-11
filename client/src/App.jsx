import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import SiteLayout from "./components/SiteLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import { Login, Register } from "./pages/AuthPages";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ResumeEditor from "./pages/ResumeEditor";
import ResumeOptimizer from "./pages/ResumeOptimizer";
import ProfileSettings from "./pages/ProfileSettings";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<Landing />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />

              <Route element={<ProtectedRoute />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="settings" element={<ProfileSettings />} />
                <Route path="resumes/new" element={<ResumeEditor />} />
                <Route path="resumes/:id/edit" element={<ResumeEditor />} />
                <Route
                  path="resumes/:id/optimize"
                  element={<ResumeOptimizer />}
                />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
