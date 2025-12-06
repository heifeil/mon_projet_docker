import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { AuthProvider } from './context/AuthContext'; // <--- IMPORT ICI

// Pages
import Dashboard from './pages/Dashboard';
import PIP from './pages/PIP';
import Admin from './pages/Admin';
import Alarmes from './pages/Alarmes';
import Profil from './pages/Profil';

import './App.css';

function App() {
  return (
    // On englobe tout avec AuthProvider
    <AuthProvider>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pip" element={<PIP />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/alarmes" element={<Alarmes />} />
            <Route path="/profil" element={<Profil />} />
          </Routes>
        </MainLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;