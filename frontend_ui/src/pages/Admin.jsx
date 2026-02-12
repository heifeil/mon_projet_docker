import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Search, LayoutDashboard, Activity, AlertTriangle } from 'lucide-react'; 
import Detective from './apps/Detective'; 
import VariableMonitor from './apps/VariableMonitor'; 
import MonitoredAlarms from './apps/MonitoredAlarms'; 
import './Admin.css';

const Admin = () => {
  const { user } = useAuth();
  const [activeApp, setActiveApp] = useState(null);

  // --- CONFIGURATION DES APPS AVEC NIVEAU MINIMUM REQUIS (ID) ---
  // 1=Lecteur, 2=Lecteur Avancé, 3=Opérateur, 4=Admin, 5=Super Admin
  const apps = [
    {
      id: 'detective',
      name: 'Détective',
      icon: <Search size={32} />,
      minRoleId: 4, // Requis : Admin (4) ou Super Admin (5)
      description: "Investigation et analyse de logs"
    },
    {
      id: 'variables',
      name: 'Suivi de Variables',
      icon: <Activity size={32} />,
      minRoleId: 1, // Requis : Tout le monde
      description: "Lecture temps réel Modbus/BacNET"
    },
    {
      id: 'monitored-alarms',
      name: 'Alarmes Variables',
      icon: <AlertTriangle size={32} />,
      minRoleId: 1, // Requis : Tout le monde
      description: "Historique des seuils (Min/Max)"
    }
  ];

  const renderActiveApp = () => {
    switch (activeApp) {
      case 'detective': return <Detective />;
      case 'variables': return <VariableMonitor />;
      case 'monitored-alarms': return <MonitoredAlarms />;
      default: return <div>Application introuvable</div>;
    }
  };

  return (
    <div className="admin-container">
      
      {/* HEADER */}
      <div className="admin-header">
        <div className="header-left">
          {activeApp ? (
            <button onClick={() => setActiveApp(null)} className="back-button">
              <ArrowLeft size={20} />
              <span>Retour au Menu</span>
            </button>
          ) : (
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LayoutDashboard size={24} color="var(--primary-color)" />
              Applications
            </h2>
          )}
        </div>
        {activeApp && <h3 className="app-title-display">{apps.find(a => a.id === activeApp)?.name}</h3>}
      </div>

      {/* CONTENU */}
      <div className="admin-content">
        {activeApp ? (
          <div className="app-view-wrapper">
            {renderActiveApp()}
          </div>
        ) : (
          <div className="apps-grid">
            {apps.map((app) => {
              // --- SÉCURITÉ : VÉRIFICATION DU ROLE_ID ---
              const userRoleId = user?.role_id || 0;

              // Si le niveau de l'utilisateur est inférieur au niveau requis, on n'affiche pas le bouton
              if (userRoleId < app.minRoleId) {
                return null; 
              }

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