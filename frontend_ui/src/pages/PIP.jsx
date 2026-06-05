import React, { useState, useEffect } from 'react';
import { RefreshCw, Upload, Search, Activity, Settings, CheckSquare, Square, Zap, Loader, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; 
import './PIP.css';

const PIP = () => {
  const { user } = useAuth();
  
  const [availableColumns, setAvailableColumns] = useState([]);
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [pingingIds, setPingingIds] = useState([]); 
  const [showColMenu, setShowColMenu] = useState(false);
  const [visibleCols, setVisibleCols] = useState([]);

  // --- NOUVEAU : État pour gérer la notification (Toast) ---
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });

  const MANDATORY_COLUMN = 'ETAT_COM';
  const FORBIDDEN_COLS = ['id', 'TEST_FONCTIONNEMENT', 'DERNIERE_MODIF_LE', 'DERNIERE_MODIF_PAR'];
  const DEFAULT_TARGETS = ["NIVEAU", "COMPARTEMENT", "LOT", "NOM_EQUIPEMENT", "LOCALISATION", "PROTOCOLE", "IP", "MAC"]; 

  // --- NOUVEAU : Fonction d'affichage du Toast ---
  const showToast = (message, type = 'success') => {
      setToast({ visible: true, message, type });
      setTimeout(() => {
          setToast({ visible: false, message: '', type: '' });
      }, 3000);
  };

  const fetchData = async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/pip/data');
      const result = await res.json();
      
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

  const handleImport = async () => {
    // On garde le confirm() car on a besoin de la réponse de l'utilisateur
    if(!window.confirm("⚠️ ATTENTION : Cela va ÉCRASER toute la base de données actuelle avec le fichier CSV du serveur.\n\nContinuer ?")) return;
    try {
      const res = await fetch('http://localhost:5000/api/pip/import', { method: 'POST' });
      if(res.ok) {
          showToast("Import réussi !", "success");
          fetchData(true); 
      } else { 
          showToast("Erreur lors de l'import serveur.", "error"); 
      }
    } catch (err) { 
        showToast("Erreur réseau lors de l'import.", "error"); 
    }
  };

  const handleExport = async () => {
    // On garde le confirm() pour validation
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
            showToast("Export réussi ! Fichier téléchargé.", "success");
        } else { 
            showToast("Erreur serveur lors de l'export.", "error"); 
        }
    } catch (error) { 
        showToast("Erreur de connexion.", "error"); 
    }
  };

  const handleForcePing = async () => {
    setIsScanning(true);
    try {
      await fetch('http://localhost:5000/api/pip/scan', { method: 'POST' });
      setTimeout(async () => {
         await fetchData(false);
         setIsScanning(false);
         showToast("Scan lancé en arrière-plan.", "success");
      }, 1000);
    } catch (err) { 
        setIsScanning(false); 
        showToast("Erreur lors du lancement du scan.", "error");
    }
  };

  const handleSinglePing = async (row, e) => {
    e.stopPropagation(); 
    if (!row.IP) return showToast("Impossible de pinger : Pas d'IP configurée.", "error");
    
    setPingingIds(prev => [...prev, row.id]);

    try {
        const response = await fetch('http://localhost:5000/api/pip/ping-one', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: row.id, ip: row.IP })
        });
        const res = await response.json();
        if (res.success) {
            setData(prevData => prevData.map(item => item.id === row.id ? { ...item, ETAT_COM: res.newStatus } : item));
        }
    } catch (err) { 
        console.error(err); 
    } finally { 
        setPingingIds(prev => prev.filter(id => id !== row.id)); 
    }
  };

  const toggleColumn = (col) => {
    if (visibleCols.includes(col)) setVisibleCols(visibleCols.filter(c => c !== col));
    else setVisibleCols([...visibleCols, col]);
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = (colName, value) => {
    setFilters(prev => ({ ...prev, [colName]: value.toLowerCase() }));
  };

  let finalDisplayColumns = [...visibleCols];
  if (!finalDisplayColumns.includes(MANDATORY_COLUMN) && availableColumns.includes(MANDATORY_COLUMN)) {
    finalDisplayColumns.push(MANDATORY_COLUMN);
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

  const canExtract = user && (Boolean(user.can_extract) === true || user.role === 'Admin' || user.role === 'Super Admin' || Boolean(user.is_admin) === true);
  const isAdmin = user && (user.role === 'Admin' || user.role === 'Super Admin' || Boolean(user.is_admin) === true);

  return (
    <div className="pip-wrapper-flex">
      <div className="pip-container full-width">
        <div className="toolbar">
          <div className="toolbar-group">
            <button onClick={() => fetchData(false)} className="btn-tool" title="Rafraîchir les données">
                <RefreshCw size={18} />
            </button>
            <button onClick={handleForcePing} className="btn-tool primary-tool" disabled={isScanning}>
              {isScanning ? <><Loader size={18} className="spin" /> Scan...</> : <><Activity size={18} /> Scanner</>}
            </button>
            {canExtract && (
                <button onClick={handleExport} className="btn-tool" title="Télécharger le tableau en CSV">
                    <Download size={18} /> Extraire (.csv)
                </button>
            )}
          </div>

          <div className="toolbar-group">
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
            
            {isAdmin && (
              <button onClick={handleImport} className="btn-tool danger-tool" title="Importer un fichier CSV (Écrase la base)">
                  <Upload size={18} /> Importer
              </button>
            )}
          </div>
        </div>

        <div className="table-full-wrapper">
          {loading ? (
            <div className="loading-state"><Loader size={40} className="spin" /></div>
          ) : data.length === 0 ? (
            <div className="empty-state">Aucune donnée trouvée.</div>
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

                  return (
                    <tr key={index}>
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

      {/* --- AFFICHAGE DU TOAST (Pop-up en bas à droite) --- */}
      {toast.visible && (
          <div className={`toast-notification ${toast.type}`}>
              {toast.message}
          </div>
      )}
    </div>
  );
};

export default PIP;