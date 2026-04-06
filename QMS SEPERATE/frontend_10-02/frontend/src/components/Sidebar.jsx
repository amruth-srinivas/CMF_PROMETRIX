import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavContext } from '../App';
import { Folder, Layers, ChevronRight, ChevronLeft } from 'lucide-react';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { activeNav, setActiveNav } = useContext(NavContext);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { 
      key: 'projects', 
      label: 'Projects', 
      icon: <Folder size={18} />, 
      path: '/' 
    },
    { 
      key: 'assembly', 
      label: 'Assembly', 
      icon: <Layers size={18} />, 
      path: '/Assembly' 
    }
  ];

  const handleNavClick = (item) => {
    setActiveNav(item.key);
    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <div className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-header">
        <h2>ProjectHub</h2>
        <button 
          className="toggle-sidebar"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
        </button>
      </div>
      
      <div className="sidebar-section">
        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li 
                key={item.key}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleNavClick(item)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <style jsx>{`
        .sidebar {
          width: 250px;
          background: white;
          box-shadow: 2px 0 10px rgba(0, 0, 0, 0.05);
          transition: width 0.3s ease;
          display: flex;
          flex-direction: column;
          z-index: 100;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          overflow: hidden;
        }
        
        .sidebar.collapsed {
          width: 60px;
        }
        
        .sidebar-header {
          padding: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e5e7eb;
          min-height: 70px;
        }
        
        .sidebar-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          opacity: 1;
          transition: opacity 0.2s;
        }
        
        .sidebar.collapsed .sidebar-header h2 {
          opacity: 0;
          width: 0;
        }
        
        .toggle-sidebar {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: #374151;
          padding: 0.25rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .toggle-sidebar:hover {
          background-color: #f3f4f6;
        }
        
        .sidebar-nav {
          flex: 1;
          padding: 1rem 0;
          overflow-y: auto;
        }
        
        .sidebar-nav ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .nav-item {
          display: flex;
          align-items: center;
          padding: 0.75rem 1.25rem;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .nav-item:hover {
          background-color: #f3f4f6;
          color: #3b82f6;
        }
        
        .nav-item.active {
          background-color: #e0f2fe;
          color: #0ea5e9;
        }
        
        .nav-icon {
          width: 1.5rem;
          height: 1.5rem;
          margin-right: 0.75rem;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .nav-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          opacity: 1;
          transition: opacity 0.2s;
          font-size: 0.9375rem;
        }
        
        .sidebar.collapsed .nav-label {
          opacity: 0;
          width: 0;
        }
        
        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }
          
          .sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
