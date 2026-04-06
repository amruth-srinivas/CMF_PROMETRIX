// d:\Project_management\my-app\src\store\projectCreation.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useProjectStore = create(
  persist(
    (set, get) => ({
      // Initial state
      projects: [],
      selectedProject: null,
      projectDetails: null,
      loading: false,
      error: null,
      
      // Actions
      addProject: (project) => set((state) => ({
        projects: [...state.projects, project]
      })),
      
      updateProject: async (id, updates) => {
        set({ loading: true, error: null });
        
        try {
          const payload = {
            ...(updates.project_number !== undefined && { project_number: updates.project_number }),
            ...(updates.name !== undefined && { name: updates.name }),
            ...(updates.customer_details !== undefined && { customer_details: updates.customer_details }),
            ...(updates.reference_no !== undefined && { reference_no: updates.reference_no }),
            ...(updates.is_completed !== undefined && { is_completed: updates.is_completed })
          };
          const response = await fetch(`http://172.18.100.26:8986/api/v1/projects/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });
          
          if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
              const errorData = await response.json();
              errorMessage = errorData.detail || errorMessage;
            } catch {
              // If we can't parse the error JSON, use the status message
            }
            throw new Error(errorMessage);
          }
          
          const updatedProject = await response.json();
          
          set((state) => ({
            projects: state.projects.map(project => 
              project.id === id ? { ...project, ...updatedProject } : project
            ),
            loading: false
          }));
          
          return updatedProject;
        } catch (error) {
          set({ 
            error: error.message || 'Failed to update project',
            loading: false 
          });
          throw error;
        }
      },
      
      deleteProject: async (id) => {
        set({ loading: true, error: null });
        
        try {
          const response = await fetch(`http://172.18.100.26:8986/api/v1/projects/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          set((state) => ({
            projects: state.projects.filter(project => project.id !== id),
            loading: false
          }));
          
          return true;
        } catch (error) {
          set({ 
            error: error.message || 'Failed to delete project',
            loading: false 
          });
          throw error;
        }
      },
      
      setSelectedProject: (project) => {
        console.log('Setting selected project:', project);
        set({ selectedProject: project });
      },
      
      clearSelectedProject: () => set({ 
        selectedProject: null, 
        projectDetails: null 
      }),
      
      // API Actions
      createProject: async (projectData) => {
        set({ loading: true, error: null });
        
        try {
          const response = await fetch('http://172.18.100.26:8986/api/v1/projects/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              project_number: projectData.project_number,
              name: projectData.name,
              customer_details: projectData.customer_details || null,
              reference_no: projectData.reference_no || null
            })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const newProject = await response.json();
          
          set((state) => ({
            projects: [...state.projects, newProject],
            loading: false
          }));
          
          return newProject;
        } catch (error) {
          set({ 
            error: error.message || 'Failed to create project',
            loading: false 
          });
          throw error;
        }
      },

      fetchProjects: async () => {
        set({ loading: true, error: null });
        
        try {
          const response = await fetch('http://172.18.100.26:8986/api/v1/projects/?skip=0&limit=100', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          const projects = Array.isArray(data) ? data : data.projects || data.results || [];
          
          set({ 
            projects: projects,
            loading: false 
          });
          
          return projects;
        } catch (error) {
          set({ 
            error: error.message || 'Failed to fetch projects',
            loading: false 
          });
          throw error;
        }
      },

      fetchProjectDetails: async (projectId) => {
        set({ loading: true, error: null });
        
        try {
          const response = await fetch(`http://172.18.100.26:8986/api/v1/projects/${projectId}/details`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const projectDetails = await response.json();
          
          set({ 
            projectDetails: projectDetails,
            loading: false 
          });
          
          return projectDetails;
        } catch (error) {
          set({ 
            error: error.message || 'Failed to fetch project details',
            loading: false 
          });
          throw error;
        }
      },

      validateProjectCompletion: async (projectId) => {
        set({ loading: true, error: null });
        
        try {
          const response = await fetch(`http://172.18.100.26:8986/api/v1/projects/${projectId}/validate-completion`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const validation = await response.json();
          
          set({ loading: false });
          
          return validation;
        } catch (error) {
          set({ 
            error: error.message || 'Failed to validate project completion',
            loading: false 
          });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
      
      // Initialize with localStorage if available
      initialize: (initialProjects) => set({ 
        projects: initialProjects || [] 
      })
    }),
    {
      name: 'project-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        selectedProject: state.selectedProject
      })
    }
  )
);

export default useProjectStore;