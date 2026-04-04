import React, { useState, useEffect } from 'react';
import { RefreshCw, Upload, Search, Activity, Settings, CheckSquare, Square, Zap, Loader, X, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; // Ajustez le chemin selon votre arborescence

// --- CORRECTION DES CHEMINS ICI (../ au lieu de ./) ---
import '../PIP.css'; 

// Import des composants protocoles
import BacnetIndex from '../protocoles/bacnet/bacnet_index'; 
import ModbusIndex from '../protocoles/modbus/modbus_index'; 

const Autocontroles = () => {
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

  // --- SÉCURITÉ : RESTRICTION D'ACCÈS ---
  // Si l'utilisateur a le role_id 1 (Lecteur) ou 2 (Lecteur Avancé), on bloque.
  if (user && (user.role_id === 1 || user.role_id === 2)) {
      return (
          <div className="empty-state" style={{ color: 'red', marginTop: '50px' }}>
              Vous n'avez pas les droits nécessaires pour accéder à l'application Autocontrôles.
          </div>
      );
  }

  // CONSTANTES
  const MANDATORY_COLUMN = 'ETAT_COM';
  const FORBIDDEN_COLS = ['id', 'TEST_FONCTIONNEMENT', 'DERNIERE_MODIF_LE', 'DERNIERE_MODIF_PAR'];
  const DEFAULT_TARGETS = ["NIVEAU", "COMPARTEMENT", "LOT", "NOM_EQUIPEMENT", "LOCALISATION", "PROTOCOLE", "IP", "MAC"]; 

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
        console.error("Erreur chargement", err); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleForcePing = async () => {
    setIsScanning(true);
    try {
      await fetch('http://localhost:5000/api/pip/scan', { method: 'POST' });
      setTimeout(async () => {
         await fetchData(false);
         setIsScanning(false);
      }, 1000);
    } catch (err) { setIsScanning(false); }
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
            setData(prevData => prevData.map(item => item.id === row.id ? { ...item, ETAT_COM: res.newStatus } : item));
        }
    } catch (err) { console.error(err); } 
    finally { setPingingIds(prev => prev.filter(id => id !== row.id)); }
  };

  const toggleColumn = (col) => {
    if (visibleCols.includes(col)) setVisibleCols(visibleCols.filter(c => c !== col));
    else setVisibleCols([...visibleCols, col]);
  };

  // CLIC SUR LA LIGNE POUR OUVRIR LE PANNEAU
  const handleRowClick = (row) => {
      const protocole = row.PROTOCOLE ? row.PROTOCOLE.toUpperCase() : '';
      if (protocole.includes('BACNET')) {
          setSelectedEquipment({ ...row, panel_type: 'BACNET' });
      } else if (protocole.includes('MODBUS')) {
          setSelectedEquipment({ ...row, panel_type: 'MODBUS' });
      }
  };

  const handleClosePanel = () => setSelectedEquipment(null);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = (colName, value) => {
    setFilters(prev => ({ ...prev, [colName]: value.toLowerCase() }));
  };

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

  return (
    <div className="pip-wrapper-flex">
      
      {/* TABLEAU GAUCHE */}
      <div className={`pip-container ${selectedEquipment ? 'shrunk' : 'full-width'}`}>
        
        <div className="toolbar">
          <div className="toolbar-group">
            <button onClick={() => fetchData(false)} className="btn-tool" title="Rafraîchir les données"><RefreshCw size={18} /></button>
            <button onClick={handleForcePing} className="btn-tool primary-tool" disabled={isScanning}>
              {isScanning ? <Loader size={18} className="spin" /> : <Activity size={18} />} Scanner
            </button>
          </div>

          <div className="toolbar-group">
            {!selectedEquipment && (
              <div className="col-selector-wrapper">
                <button className={`btn-tool ${showColMenu ? 'active' : ''}`} onClick={() => setShowColMenu(!showColMenu)}>
                  <Settings size={18} /> Colonnes
                </button>
                {showColMenu && (
                  <div className="col-dropdown">
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
          </div>
        </div>

        <div className="table-full-wrapper">
          {loading ? (
            <div className="loading-state"><Loader size={40} className="spin" /></div>
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
                  const protocole = row.PROTOCOLE ? row.PROTOCOLE.toUpperCase() : '';
                  const isClickable = protocole.includes('BACNET') || protocole.includes('MODBUS');
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

      {/* PANNEAU DROIT DYNAMIQUE */}
      {selectedEquipment && (
        <div className="pip-panel-right">
            <div className="panel-header-mobile">
                <button onClick={handleClosePanel} className="close-panel-btn"><X size={24} /></button>
                <span>{selectedEquipment.NOM_EQUIPEMENT}</span>
            </div>
            
            {selectedEquipment.panel_type === 'BACNET' && <BacnetIndex equipment={selectedEquipment} onClose={handleClosePanel} />}
            {selectedEquipment.panel_type === 'MODBUS' && <ModbusIndex equipment={selectedEquipment} onClose={handleClosePanel} />}
        </div>
      )}

    </div>
  );
};

export default Autocontroles;