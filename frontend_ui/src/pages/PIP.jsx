import React, { useState, useEffect } from 'react';
import { RefreshCw, Upload, Search, Activity, Settings, CheckSquare, Square, Zap, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './PIP.css';

const PIP = () => {
  const { user } = useAuth(); // Pour vérifier le rôle admin
  
  // --- ÉTATS ---
  const [availableColumns, setAvailableColumns] = useState([]); // Toutes les colonnes du CSV
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  
  // État pour le scan global (bouton Scanner)
  const [isScanning, setIsScanning] = useState(false);

  // État pour gérer les pings unitaires en cours (liste des ID qui chargent)
  const [pingingIds, setPingingIds] = useState([]); 

  // Gestion de l'affichage des colonnes
  const [showColMenu, setShowColMenu] = useState(false);
  const [visibleCols, setVisibleCols] = useState([]);

  // CONSTANTES
  const MANDATORY_COLUMN = 'ETAT_COM';

  // LISTE NOIRE : Ces colonnes ne seront JAMAIS affichées ni proposées dans le menu
  const FORBIDDEN_COLS = [
    'id', 
    'TEST_FONCTIONNEMENT', 
    'DERNIERE_MODIF_LE', 
    'DERNIERE_MODIF_PAR'
  ];

  // Colonnes affichées par défaut lors du premier chargement
  const DEFAULT_TARGETS = [
    "NIVEAU", "COMPARTEMENT", "LOT", "NOM_EQUIPEMENT", 
    "LOCALISATION", "PROTOCOLE", "IP", "MAC"
  ]; 

  // --- CHARGEMENT DES DONNÉES ---
  const fetchData = async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/pip/data');
      const result = await res.json();
      
      const allCols = result.columns || [];
      setAvailableColumns(allCols);
      setData(result.rows || []);

      if (isFirstLoad && allCols.length > 0) {
        const defaults = allCols.filter(col => DEFAULT_TARGETS.includes(col));
        
        if (defaults.length > 0) {
            setVisibleCols(defaults);
        } else {
             setVisibleCols(allCols.filter(c => !FORBIDDEN_COLS.includes(c)));
        }
      }

    } catch (err) {
      console.error("Erreur chargement PIP", err);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---
  const handleImport = async () => {
    if(!window.confirm("Attention : La table actuelle sera écrasée par le contenu du fichier CSV. Continuer ?")) return;
    try {
      await fetch('http://localhost:5000/api/pip/import', { method: 'POST' });
      fetchData(true); 
    } catch (err) { alert("Erreur lors de l'import"); }
  };

  // MODIFICATION ICI : Gestion du scan global sans popup
  const handleForcePing = async () => {
    // 1. Activer l'état de chargement du bouton
    setIsScanning(true);

    try {
      // 2. Lancer la requête
      await fetch('http://localhost:5000/api/pip/scan', { method: 'POST' });
      
      // Note : On a retiré le alert("Scan global lancé...") ici.
      
      // 3. Attendre un peu (2s) pour laisser le temps au backend de traiter quelques pings
      // puis rafraîchir les données.
      setTimeout(async () => {
         await fetchData(false);
         // 4. Désactiver l'état de chargement
         setIsScanning(false);
      }, 2000);

    } catch (err) { 
      console.error(err);
      alert("Erreur lancement scan"); // On garde l'alerte uniquement en cas d'erreur
      setIsScanning(false);
    }
  };

  // PING UNITAIRE
  const handleSinglePing = async (row) => {
    if (!row.IP) return alert("Pas d'IP définie pour cet équipement.");

    setPingingIds(prev => [...prev, row.id]);

    try {
        const response = await fetch('http://localhost:5000/api/pip/ping-one', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: row.id, ip: row.IP })
        });
        const res = await response.json();

        if (res.success) {
            setData(prevData => prevData.map(item => 
                item.id === row.id ? { ...item, ETAT_COM: res.newStatus } : item
            ));
        } else {
            alert("Erreur: " + res.message);
        }
    } catch (err) {
        console.error(err);
        alert("Erreur lors du ping unitaire");
    } finally {
        setPingingIds(prev => prev.filter(id => id !== row.id));
    }
  };

  const toggleColumn = (col) => {
    if (visibleCols.includes(col)) {
      setVisibleCols(visibleCols.filter(c => c !== col));
    } else {
      setVisibleCols([...visibleCols, col]);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = (colName, value) => {
    setFilters(prev => ({ ...prev, [colName]: value.toLowerCase() }));
  };

  const finalDisplayColumns = [...visibleCols];
  if (!finalDisplayColumns.includes(MANDATORY_COLUMN) && availableColumns.includes(MANDATORY_COLUMN)) {
    finalDisplayColumns.push(MANDATORY_COLUMN);
  }

  const filteredData = data.filter(row => {
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

  return (
    <div className="pip-container">
      
      {/* BARRE D'OUTILS */}
      <div className="toolbar">
        <div className="toolbar-group">
          <button onClick={() => fetchData(false)} className="btn-tool" title="Rafraîchir les données">
            <RefreshCw size={18} />
          </button>
          
          {/* MODIFICATION DU BOUTON SCANNER */}
          <button 
            onClick={handleForcePing} 
            className="btn-tool primary-tool"
            disabled={isScanning} // Désactivé pendant le scan
            style={{ minWidth: '100px', justifyContent: 'center' }} // Pour éviter que le bouton change de taille
          >
            {isScanning ? (
                <>
                  <Loader size={18} className="spin" /> Scan...
                </>
            ) : (
                <>
                  <Activity size={18} /> Scanner
                </>
            )}
          </button>
        </div>

        <div className="toolbar-group">
          <div className="col-selector-wrapper">
            <button 
              className={`btn-tool ${showColMenu ? 'active' : ''}`} 
              onClick={() => setShowColMenu(!showColMenu)}
              title="Sélectionner les colonnes"
            >
              <Settings size={18} /> Colonnes
            </button>

            {showColMenu && (
              <div className="col-dropdown">
                <h4>Afficher / Masquer</h4>
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

          {user?.role === 'admin' && (
            <button onClick={handleImport} className="btn-tool danger-tool">
              <Upload size={18} /> CSV
            </button>
          )}
        </div>
      </div>

      {/* TABLEAU */}
      <div className="table-full-wrapper">
        {loading && data.length === 0 ? (
          <div className="loading-state">Chargement...</div>
        ) : (
          <table className="full-width-table">
            <thead>
              <tr>
                {/* Colonne Ping Fixe */}
                <th style={{width: '50px', textAlign: 'center'}}></th>

                {finalDisplayColumns.map(col => (
                  <th key={col} data-col={col}>
                    <div className="th-label">{col.replace(/_/g, ' ')}</div>
                    <div className="search-box compact">
                      <Search size={12} className="search-icon"/>
                      <input 
                        type="text" 
                        onChange={(e) => handleFilterChange(col, e.target.value)}
                        placeholder="Filtrer"
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, index) => {
                const isPinging = pingingIds.includes(row.id);
                return (
                  <tr key={index}>
                    <td style={{textAlign: 'center'}}>
                        <button 
                            className="btn-mini-ping" 
                            onClick={() => handleSinglePing(row)}
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
  );
};

export default PIP;