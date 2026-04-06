import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import { FolderOpen, Settings, Key, Menu, ChevronLeft } from 'lucide-react';

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const HEADER_HEIGHT = 64;

const navItems = [
  { label: 'Project Management', path: '/', icon: <FolderOpen size={20} /> },
  { label: 'Configurations', path: '/configurations', icon: <Settings size={20} /> },
  { label: 'License Management', path: '/license-management', icon: <Key size={20} /> },
];

function getHeaderTitle(pathname) {
  const item = navItems.find((i) => i.path === pathname);
  return item ? item.label : 'Project Management';
}

export default function ProjectManagementLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const width = sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {/* Sidebar */}
      <Box
        component="aside"
        sx={{
          width: width,
          flexShrink: 0,
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1200,
          bgcolor: '#1f2937',
          color: '#f9fafb',
          transition: 'width 0.25s ease',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
        }}
      >
        <Box
          sx={{
            height: HEADER_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarOpen ? 'space-between' : 'center',
            px: sidebarOpen ? 2 : 0,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {sidebarOpen && (
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '-0.01em',
                color: '#fff',
              }}
            >
              QMS
            </Typography>
          )}
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <List sx={{ flex: 1, py: 1.5, px: 0.75 }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItemButton
                key={item.path}
                onClick={() => navigate(item.path)}
                selected={isActive}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  py: 1.25,
                  px: sidebarOpen ? 2 : 1.5,
                  justifyContent: sidebarOpen ? 'initial' : 'center',
                  color: isActive ? '#fff' : '#d1d5db',
                  bgcolor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                  '&:hover': {
                    bgcolor: isActive ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                  },
                  '&.Mui-selected': {
                    bgcolor: 'rgba(255,255,255,0.12)',
                    color: '#fff',
                  },
                  '&.Mui-selected:hover': {
                    bgcolor: 'rgba(255,255,255,0.16)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: sidebarOpen ? 40 : 0,
                    color: 'inherit',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {sidebarOpen && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.9375rem',
                      fontWeight: 500,
                    }}
                  />
                )}
              </ListItemButton>
            );
          })}
        </List>
        <Box sx={{ p: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <IconButton
            onClick={() => setSidebarOpen(!sidebarOpen)}
            sx={{
              color: '#9ca3af',
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
            }}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </IconButton>
        </Box>
      </Box>

      {/* Main area: header + content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: '100vh',
          ml: `${width}px`,
          transition: 'margin-left 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            height: HEADER_HEIGHT,
            bgcolor: '#ffffff',
            color: '#111827',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <Toolbar sx={{ minHeight: `${HEADER_HEIGHT}px !important`, px: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem', color: '#111827' }}>
              {getHeaderTitle(location.pathname)}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3 },
            boxSizing: 'border-box',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
