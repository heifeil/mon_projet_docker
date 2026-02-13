import React, { useState, useEffect } from 'react';
import { RefreshCw, Upload, Search, Activity, Settings, CheckSquare, Square, Zap, Loader, X, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; 
import './PIP.css';

// Import du composant BACnet
import BacnetIndex from './protocoles/bacnet/bacnet_index'; 

const PIP = () => {
  const { user } = useAuth();
  
  // --- ÉTATS ---
  const [availableColumns, setAvailableColumns] = useState([]);
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [pingingIds, setPingingIds] = useState([]); 
  const [showColMenu, setShowColMenu] = useState(false);
  const [visibleCols, setVisibleCols] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  // CONSTANTES
  const MANDATORY_COLUMN = 'ETAT_COM';
  const FORBIDDEN_COLS = ['id', 'TEST_FONCTIONNEMENT', 'DERNIERE_MODIF_LE', 'DERNIERE_MODIF_PAR'];
  const DEFAULT_TARGETS = ["NIVEAU", "COMPARTEMENT", "LOT", "NOM_EQUIPEMENT", "LOCALISATION", "PROTOCOLE", "IP", "MAC"]; 

  // --- CHARGEMENT DES DONNÉES ---
  const fetchData = async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/pip/data');
      const result = await res.json();
      
      // Sécurisation si le backend renvoie n'importe quoi
      const allCols = result.columns || [];
      const rows = result.rows || [];

      setAvailableColumns(allCols);
      setData(rows);

      if (isFirstLoad && allCols.length > 0) {
        const defaults = allCols.filter(col => DEFAULT_TARGETS.includes(col));
        if (defaults.length > 0) setVisibleCols(defaults);
        else setVisibleCols(allCols.filter(c => !FORBIDDEN_COLS.includes(c)));
      }
    } catch (err) { 
        console.error("Erreur chargement PIP", err); 
    } finally { 
        setLoading(false); 
    }
  };

  // --- ACTIONS ---
  
  // IMPORT (Administrateurs seulement)
  const handleImport = async () => {
    if(!window.confirm("⚠️ ATTENTION : Cela va ÉCRASER toute la base de données actuelle avec le fichier CSV du serveur.\n\nContinuer ?")) return;
    try {
      const res = await fetch('http://localhost:5000/api/pip/import', { method: 'POST' });
      if(res.ok) {
          alert("Import réussi !");
          fetchData(true); 
      } else {
          alert("Erreur lors de l'import serveur.");
      }
    } catch (err) { alert("Erreur réseau import"); }
  };

  // EXPORT (Utilisateurs autorisés)
  const handleExport = async () => {
    if(!window.confirm("Télécharger le fichier .csv et mettre à jour le fichier source sur le serveur ?")) return;
    
    try {
        const response = await fetch('http://localhost:5000/api/pip/export', { method: 'GET' });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "pip.csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            alert("✅ Export réussi ! Fichier téléchargé.");
        } else {
            alert("❌ Erreur serveur lors de l'export.");
        }
    } catch (error) {
        console.error("Erreur export:", error);
        alert("Erreur de connexion.");
    }
  };

  const handleForcePing = async () => {
    setIsScanning(true);
    try {
      await fetch('http://localhost:5000/api/pip/scan', { method: 'POST' });
      // On attend un peu que le backend traite quelques pings avant de rafraichir
      setTimeout(async () => {
         await fetchData(false);
         setIsScanning(false);
         alert("Scan lancé en arrière-plan.");
      }, 1000);
    } catch (err) { 
      console.error(err);
      alert("Erreur lancement scan");
      setIsScanning(false);
    }
  };

  const handleSinglePing = async (row, e) => {
    e.stopPropagation(); 
    if (!row.IP) return alert("Pas d'IP");
    setPingingIds(prev => [...prev, row.id]);

    try {
        const response = await fetch('http://localhost:5000/api/pip/ping-one', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: row.id, ip: row.IP })
        });
        const res = await response.json();
        if (res.success) {
            // Mise à jour optimiste du tableau local
            setData(prevData => prevData.map(item => item.id === row.id ? { ...item, ETAT_COM: res.newStatus } : item));
        } else { 
            alert("Erreur: " + res.message); 
        }
    } catch (err) { console.error(err); } 
    finally { setPingingIds(prev => prev.filter(id => id !== row.id)); }
  };

  const toggleColumn = (col) => {
    if (visibleCols.includes(col)) setVisibleCols(visibleCols.filter(c => c !== col));
    else setVisibleCols([...visibleCols, col]);
  };

  const handleRowClick = (row) => {
      if (row.PROTOCOLE && row.PROTOCOLE.toUpperCase().includes('BACNET')) {
          setSelectedEquipment(row);
      }
  };

  const handleClosePanel = () => {
      setSelectedEquipment(null);
  };

  useEffect(() => {
    fetchData(true);
    // Rafraichissement auto toutes les 60s
    const interval = setInterval(() => fetchData(false), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = (colName, value) => {
    setFilters(prev => ({ ...prev, [colName]: value.toLowerCase() }));
  };

  // --- LOGIQUE D'AFFICHAGE ---
  let finalDisplayColumns = [];
  if (selectedEquipment) {
      finalDisplayColumns = ['NOM_EQUIPEMENT', 'PROTOCOLE', 'IP', 'ETAT_COM'];
  } else {
      finalDisplayColumns = [...visibleCols];
      if (!finalDisplayColumns.includes(MANDATORY_COLUMN) && availableColumns.includes(MANDATORY_COLUMN)) {
        finalDisplayColumns.push(MANDATORY_COLUMN);
      }
  }

  const filteredData = data.filter(row => {
    if (row.PROTOCOLE === 'Subnet') return false;
    return finalDisplayColumns.every(col => {
      const filterValue = filters[col] || "";
      const cellValue = String(row[col] || "").toLowerCase();
      return cellValue.includes(filterValue);
    });
  });

  const renderCell = (col, value) => {
    if (col === MANDATORY_COLUMN) {
      const statusClass = value === 'OK' ? 'badge-ok' : value === 'NOK' ? 'badge-nok' : 'badge-neutral';
      return <span className={`status-badge ${statusClass}`}>{value || '-'}</span>;
    }
    return value;
  };

  // DROITS
  const canExtract = user && (user.can_extract === 1 || user.can_extract === true || user.is_admin === 1);
  const isAdmin = user && (user.role === 'Admin' || user.role === 'Super Admin' || user.is_admin === 1);

  return (
    <div className="pip-wrapper-flex">
      
      {/* --- TABLEAU GAUCHE --- */}
      <div className={`pip-container ${selectedEquipment ? 'shrunk' : 'full-width'}`}>
        
        {/* BARRE D'OUTILS */}
        <div className="toolbar">
          
          {/* Groupe Gauche : Actions courantes */}
          <div className="toolbar-group">
            <button onClick={() => fetchData(false)} className="btn-tool" title="Rafraîchir les données">
                <RefreshCw size={18} />
            </button>
            
            <button onClick={handleForcePing} className="btn-tool primary-tool" disabled={isScanning} title="Lancer un Ping sur tout le parc">
              {isScanning ? <><Loader size={18} className="spin" /> Scan...</> : <><Activity size={18} /> Scanner</>}
            </button>

            {/* BOUTON D'EXPORT (Visible si droit ok) */}
            {canExtract && (
                <button onClick={handleExport} className="btn-tool" title="Télécharger le tableau en CSV">
                    <Download size={18} /> Extraire (.csv)
                </button>
            )}
          </div>

          {/* Groupe Droite : Config & Admin */}
          <div className="toolbar-group">
            {!selectedEquipment && (
              <div className="col-selector-wrapper">
                <button className={`btn-tool ${showColMenu ? 'active' : ''}`} onClick={() => setShowColMenu(!showColMenu)}>
                  <Settings size={18} /> Colonnes
                </button>
                {showColMenu && (
                  <div className="col-dropdown">
                    <h4>Colonnes visibles</h4>
                    {availableColumns.map(col => {
                      if (col === MANDATORY_COLUMN || FORBIDDEN_COLS.includes(col)) return null; 
                      const isChecked = visibleCols.includes(col);
                      return (
                          <div key={col} className="col-option" onClick={() => toggleColumn(col)}>
                              {isChecked ? <CheckSquare size={16} color="var(--primary-color)"/> : <Square size={16}/>}
                              <span>{col.replace(/_/g, ' ')}</span>
                          </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            
            {/* BOUTON IMPORT (Admin seulement, en rouge) */}
            {isAdmin && (
              <button onClick={handleImport} className="btn-tool danger-tool" title="Importer un fichier CSV (Écrase la base)">
                  <Upload size={18} /> Importer
              </button>
            )}
          </div>
        </div>

        {/* CONTENU TABLEAU */}
        <div className="table-full-wrapper">
          {loading ? (
            <div className="loading-state"><Loader size={40} className="spin" /><br/>Chargement des données...</div>
          ) : data.length === 0 ? (
            <div className="empty-state">Aucune donnée trouvée ou erreur serveur (Vérifiez le backend).</div>
          ) : (
            <table className="full-width-table">
              <thead>
                <tr>
                  <th style={{width: '50px', textAlign: 'center'}}>#</th>
                  {finalDisplayColumns.map(col => (
                    <th key={col} data-col={col}>
                      <div className="th-label">{col.replace(/_/g, ' ')}</div>
                      <div className="search-box compact">
                        <Search size={12} className="search-icon"/>
                        <input type="text" onChange={(e) => handleFilterChange(col, e.target.value)} placeholder="..." />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => {
                  const isPinging = pingingIds.includes(row.id);
                  const isClickable = row.PROTOCOLE && row.PROTOCOLE.toUpperCase().includes('BACNET');
                  const isSelected = selectedEquipment && selectedEquipment.id === row.id;

                  return (
                    <tr 
                        key={index} 
                        onClick={() => handleRowClick(row)}
                        className={`${isClickable ? 'row-clickable' : ''} ${isSelected ? 'row-selected' : ''}`}
                    >
                      <td style={{textAlign: 'center'}}>
                          <button 
                              className="btn-mini-ping" 
                              onClick={(e) => handleSinglePing(row, e)}
                              disabled={isPinging || !row.IP}
                              title={row.IP ? `Pinger ${row.IP}` : "Pas d'IP"}
                          >
                              {isPinging ? <Loader size={14} className="spin" /> : <Zap size={14} />}
                          </button>
                      </td>
                      {finalDisplayColumns.map(col => (
                        <td key={col} data-col={col}>{renderCell(col, row[col])}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- PANNEAU DROIT (BACNET) --- */}
      {selectedEquipment && (
        <div className="pip-panel-right">
            <div className="panel-header-mobile">
                <button onClick={handleClosePanel} className="close-panel-btn"><X size={24} /></button>
                <span>{selectedEquipment.NOM_EQUIPEMENT}</span>
            </div>
            
            <BacnetIndex equipment={selectedEquipment} onClose={handleClosePanel} />
        </div>
      )}

    </div>
  );
};

export default PIP;