import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
// 1. AJOUT DE AlertTriangle DANS LES IMPORTS
import { ArrowLeft, Search, LayoutDashboard, Activity, AlertTriangle } from 'lucide-react'; 
import Detective from './apps/Detective'; 
import VariableMonitor from './apps/VariableMonitor'; 
// 2. IMPORT DU NOUVEAU COMPOSANT
import MonitoredAlarms from './apps/MonitoredAlarms';
import './Admin.css';

const Admin = () => {
  const { user } = useAuth();
  const [activeApp, setActiveApp] = useState(null);

  // Liste des applications disponibles
  const apps = [
    {
      id: 'detective',
      name: 'Détective',
      icon: <Search size={32} />,
      roleRequired: 'admin', 
      description: "Investigation et analyse de logs"
    },
    {
      id: 'variables',
      name: 'Suivi de Variables',
      icon: <Activity size={32} />,
      roleRequired: 'all', 
      description: "Lecture temps réel Modbus/BacNET"
    },
    // 3. AJOUT DE LA NOUVELLE APPLICATION DANS LA LISTE
    {
      id: 'monitored-alarms',
      name: 'Alarmes Variables',
      icon: <AlertTriangle size={32} />, // Icône d'alerte
      roleRequired: 'all', // Visible par tout le monde
      description: "Historique des seuils (Min/Max)"
    }
  ];

  // Fonction pour rendre l'application active
  const renderActiveApp = () => {
    switch (activeApp) {
      case 'detective':
        return <Detective />;
      case 'variables':
        return <VariableMonitor />;
      // 4. AJOUT DU RENDU DE L'APPLICATION
      case 'monitored-alarms':
        return <MonitoredAlarms />;
      default:
        return <div>Application introuvable</div>;
    }
  };

  return (
    <div className="admin-container">
      
      {/* HEADER DE LA PAGE ADMIN */}
      <div className="admin-header">
        <div className="header-left">
          {activeApp ? (
            // Mode App ouverte : Bouton retour
            <button onClick={() => setActiveApp(null)} className="back-button">
              <ArrowLeft size={20} />
              <span>Retour au Menu</span>
            </button>
          ) : (
            // Mode Launcher : Titre
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LayoutDashboard size={24} color="var(--primary-color)" />
              Applications
            </h2>
          )}
        </div>
        
        {/* Titre de l'app en cours (si ouverte) */}
        {activeApp && <h3 className="app-title-display">{apps.find(a => a.id === activeApp)?.name}</h3>}
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="admin-content">
        {activeApp ? (
          // VUE APPLICATION
          <div className="app-view-wrapper">
            {renderActiveApp()}
          </div>
        ) : (
          // VUE LAUNCHER (Grille d'icônes)
          <div className="apps-grid">
            {apps.map((app) => {
              // Vérification des droits
              if (app.roleRequired === 'admin' && user?.role !== 'admin') return null;

              return (
                <button 
                  key={app.id} 
                  className="app-tile" 
                  onClick={() => setActiveApp(app.id)}
                >
                  <div className="app-icon-wrapper">
                    {app.icon}
                  </div>
                  <div className="app-info">
                    <span className="app-name">{app.name}</span>
                    <span className="app-desc">{app.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;