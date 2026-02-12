import React, { useState } from 'react';
import { X, Activity, Info, Sliders, Link, Map } from 'lucide-react';

// Import des sous-composants
import BacnetInfos from './bacnet_infos';
import BacnetCommandes from './bacnet_commandes';
import BacnetChaine from './bacnet_chaine';
import BacnetPlan from './bacnet_plan';

// On peut importer un CSS spécifique ou utiliser PIP.css
import '../../PIP.css'; 

const BacnetIndex = ({ equipment, onClose }) => {
    // État pour gérer l'onglet actif (par défaut 'infos')
    const [activeTab, setActiveTab] = useState('infos');

    // Fonction pour rendre le contenu selon l'onglet
    const renderContent = () => {
        switch (activeTab) {
            case 'infos': return <BacnetInfos equipment={equipment} />;
            case 'commandes': return <BacnetCommandes equipment={equipment} />;
            case 'chaine': return <BacnetChaine equipment={equipment} />;
            case 'plan': return <BacnetPlan equipment={equipment} />;
            default: return <BacnetInfos equipment={equipment} />;
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* 1. HEADER (Titre + Bouton Fermer) */}
            <div className="bacnet-header">
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                   <Activity color="var(--primary-color)" />
                   <h2 style={{margin:0, fontSize:'1.2rem'}}>Interface BACnet</h2>
                </div>
                <button onClick={onClose} className="btn-close-desktop">
                    <X size={24} />
                </button>
            </div>

            {/* 2. BANDEAU DE NAVIGATION (Onglets) */}
            <div className="bacnet-nav-tabs">
                <button 
                    className={`nav-tab ${activeTab === 'infos' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('infos')}
                >
                    <Info size={16}/> Infos
                </button>
                <button 
                    className={`nav-tab ${activeTab === 'commandes' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('commandes')}
                >
                    <Sliders size={16}/> Commandes
                </button>
                <button 
                    className={`nav-tab ${activeTab === 'chaine' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('chaine')}
                >
                    <Link size={16}/> Chaîne
                </button>
                <button 
                    className={`nav-tab ${activeTab === 'plan' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('plan')}
                >
                    <Map size={16}/> Plan
                </button>
            </div>

            {/* 3. ZONE DE CONTENU DYNAMIQUE */}
            <div className="bacnet-content-wrapper">
                {renderContent()}
            </div>
        </div>
    );
};

export default BacnetIndex;