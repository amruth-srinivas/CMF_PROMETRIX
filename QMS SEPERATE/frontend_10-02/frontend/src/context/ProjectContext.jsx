import { createContext, useState, useEffect } from 'react';

export const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(() => {
    // Load selected project from localStorage if available
    const saved = localStorage.getItem('selectedProject');
    return saved ? JSON.parse(saved) : null;
  });

  // Save selected project to localStorage whenever it changes
  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('selectedProject', JSON.stringify(selectedProject));
    } else {
      localStorage.removeItem('selectedProject');
    }
  }, [selectedProject]);

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      setProjects, 
      selectedProject, 
      setSelectedProject 
    }}>
      {children}
    </ProjectContext.Provider>
  );
};