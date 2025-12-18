import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Database, LayoutDashboard, Bell, User } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', name: 'Dashboard', icon: <BarChart3 size={20} /> },
    { path: '/pip', name: 'PIP', icon: <Database size={20} /> },
    { path: '/admin', name: 'Applications', icon: <LayoutDashboard size={20} /> },
    { path: '/alarmes', name: 'Alarmes', icon: <Bell size={20} /> },
    { path: '/profil', name: 'Profil', icon: <User size={20} /> },
  ];

  return (
    <nav className="sidebar">
      {menuItems.map((item) => (
        <Link
          key={item.name}
          to={item.path}
          className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
        >
          {item.icon}
          <span className="link-text">{item.name}</span>
        </Link>
      ))}
    </nav>
  );
};

export default Sidebar;