import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Search, LayoutDashboard, Activity } from 'lucide-react'; // Ajout de Activity
import Detective from './apps/Detective'; 
import VariableMonitor from './apps/VariableMonitor'; // Import de la nouvelle app
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
      roleRequired: 'admin', // Visible uniquement par les admins
      description: "Investigation et analyse de logs"
    },
    {
      id: 'variables',
      name: 'Suivi de Variables',
      icon: <Activity size={32} />,
      roleRequired: 'all', // Visible par tout le monde (User + Admin)
      description: "Lecture temps réel Modbus/BacNET"
    }
  ];

  // Fonction pour rendre l'application active
  const renderActiveApp = () => {
    switch (activeApp) {
      case 'detective':
        return <Detective />;
      case 'variables':
        return <VariableMonitor />;
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
              // Si le rôle requis est 'admin' et que l'utilisateur n'est pas admin, on ne l'affiche pas.
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