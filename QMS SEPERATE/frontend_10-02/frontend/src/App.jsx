import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ProjectCreation from './components/ProjectCreation';
import ProjectManagementLayout from './components/ProjectManagementLayout';
import Assembly from './pages/Assembly';
import InspectionPlan from './pages/InspectionPlan';
import Configuration from './pages/Configuration';
import { createContext, useState, useEffect, useContext } from 'react';
import { ProjectProvider } from './context/ProjectContext';
import './App.css';

export const NavContext = createContext();

function App() {
  const [activeNav, setActiveNav] = useState('projects');
  
  return (
    <NavContext.Provider value={{ activeNav, setActiveNav }}>
      <ProjectProvider>
        <Router>
          <Routes>
            {/* Project management section: sidebar + header only on these routes */}
            <Route path="/" element={
              <NavHandler>
                <ProjectManagementLayout>
                  <ProjectCreation />
                </ProjectManagementLayout>
              </NavHandler>
            } />
            <Route path="/configurations" element={
              <NavHandler>
                <ProjectManagementLayout>
                  <Configuration />
                </ProjectManagementLayout>
              </NavHandler>
            } />
            <Route path="/license-management" element={
              <NavHandler>
                <ProjectManagementLayout>
                  <PlaceholderPage title="License Management" />
                </ProjectManagementLayout>
              </NavHandler>
            } />
            {/* Other pages: no sidebar, no header */}
            <Route path="/Assembly" element={
              <NavHandler>
                <Assembly />
              </NavHandler>
            } />
            <Route path="/inspection-plan" element={
              <NavHandler>
                <InspectionPlan />
              </NavHandler>
            } />
          </Routes>
        </Router>
      </ProjectProvider>
    </NavContext.Provider>
  );
}

function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: 24, color: '#6b7280', fontSize: 18 }}>
      {title} — Coming soon
    </div>
  );
}

// Helper component to handle navigation state based on route
function NavHandler({ children }) {
  const location = useLocation();
  const { setActiveNav } = useContext(NavContext);

  useEffect(() => {
    // Update activeNav based on current route
    if (location.pathname === '/Assembly') {
      setActiveNav('assembly');
    } else {
      setActiveNav('projects');
    }
  }, [location, setActiveNav]);

  return children;
}

export default App;