import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Activity, Server, Clock, Database, History, Trash2, User, Download, Lock, X } from 'lucide-react'; 
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import './VariableMonitor.css'; 

const VariableMonitor = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState([]);
  const [automataList, setAutomataList] = useState([]); 
  const [allTypes, setAllTypes] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [historyData, setHistoryData] = useState([]);
  const [selectedPointHistory, setSelectedPointHistory] = useState(null);
  const [historyRange, setHistoryRange] = useState('1h'); 

  // Mise à jour du state initial pour inclure unite, min, max
  const [newPoint, setNewPoint] = useState({
    nom: '', protocole: 'modbus', ip: '', deviceId: 1, adresse: '', vitesse: 2000, type: '',
    unite: '', min: '', max: '' 
  });

  const fetchPoints = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/variables');
      const data = await res.json();
      setPoints(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchDependencies = async () => {
    try {
        const resAuto = await fetch('http://localhost:5000/api/variables/targets');
        setAutomataList(await resAuto.json());
        const resTypes = await fetch('http://localhost:5000/api/variables/types');
        const typesData = await resTypes.json();
        setAllTypes(typesData);
        const defModbus = typesData.find(t => t.protocole === 'modbus')?.code_technique;
        if(defModbus) setNewPoint(prev => ({ ...prev, type: defModbus }));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchPoints();
    fetchDependencies();
    const interval = setInterval(fetchPoints, 2000); 
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id) => {
      if (!window.confirm("Arrêter le suivi de cette variable ?")) return;
      try {
          await fetch(`http://localhost:5000/api/variables/${id}`, { method: 'DELETE' });
          fetchPoints();
      } catch (err) { console.error("Erreur suppression", err); }
  };

  const handleExportCsv = async () => {
      if (!selectedPointHistory) return;
      try {
          const response = await fetch(`http://localhost:5000/api/variables/${selectedPointHistory.id}/export`);
          if (response.ok) {
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `historique_${selectedPointHistory.nom}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
          }
      } catch (err) { console.error("Erreur export", err); }
  };

  const handleAutomataSelect = (e) => {
      const selectedId = e.target.value;
      if (!selectedId) return;
      const equip = automataList.find(a => a.id.toString() === selectedId);
      if (equip) {
          let proto = 'modbus';
          if (equip.PROTOCOLE && equip.PROTOCOLE.toLowerCase().includes('bacnet')) proto = 'bacnet';
          const defType = allTypes.find(t => t.protocole === proto)?.code_technique || '';
          setNewPoint(prev => ({
              ...prev, ip: equip.IP, deviceId: equip.DEVICE_ID || 1, 
              protocole: proto, type: defType, nom: `${equip.NOM_EQUIPEMENT} - ` 
          }));
      }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!user) {
        alert("Vous devez être connecté.");
        return;
    }
    const payload = { ...newPoint, cree_par: user.email }; 
    const res = await fetch('http://localhost:5000/api/variables', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
    });
    if (res.ok) {
        setNewPoint({ ...newPoint, nom: '', adresse: '', min: '', max: '', unite: '' }); 
        fetchPoints();
    } else {
        alert("Erreur: Impossible de créer la variable (Non autorisé)");
    }
  };

  const fetchHistoryData = async (point, range) => {
      try {
          const res = await fetch(`http://localhost:5000/api/variables/${point.id}/history?range=${range}`);
          const data = await res.json();
          
          const formatted = data.map(d => {
            let valNumerique = 0;
            if (d.valeur === "ON") valNumerique = 1;
            else if (d.valeur === "OFF") valNumerique = 0;
            else valNumerique = parseFloat(d.valeur);

            const dateFormat = (range === '24h' || range === 'all' || range === '8h') ? 'dd/MM HH:mm' : 'HH:mm:ss';

            return {
                time: format(new Date(d.timestamp), dateFormat),
                val: isNaN(valNumerique) ? 0 : valNumerique
            };
          });
          setHistoryData(formatted);
      } catch (err) { console.error(err); }
  };

  const showHistory = async (point) => {
    setSelectedPointHistory(point);
    setHistoryRange('1h'); 
    fetchHistoryData(point, '1h');
  };

  const handleRangeChange = (range) => {
      setHistoryRange(range);
      if(selectedPointHistory) fetchHistoryData(selectedPointHistory, range);
  };

  const availableTypes = allTypes.filter(t => t.protocole === newPoint.protocole);
  const isSelectedBoolean = selectedPointHistory 
    && ['bool', 'coil', 'boolean'].includes(selectedPointHistory.type_donnee?.toLowerCase());

  return (
    <div className="vm-container">
      <div className="vm-sidebar">
        {user ? (
            <>
                <h3><Plus size={20}/> Nouvelle Variable</h3>
                <div className="vm-form-group">
                    <label>Choisir un équipement (PIP)</label>
                    <select onChange={handleAutomataSelect} defaultValue="">
                        <option value="" disabled>-- Sélectionner --</option>
                        {automataList.map(auto => (<option key={auto.id} value={auto.id}>{auto.NOM_EQUIPEMENT} ({auto.IP})</option>))}
                    </select>
                </div>
                <hr className="vm-divider" />
                <form onSubmit={handleAdd} className="vm-form">
                    <label>Nom de la variable</label>
                    <input type="text" value={newPoint.nom} onChange={e=>setNewPoint({...newPoint, nom: e.target.value})} required placeholder="Ex: Température" />
                    
                    <div className="form-row">
                        <div><label>IP</label><input type="text" value={newPoint.ip} onChange={e=>setNewPoint({...newPoint, ip: e.target.value})} required /></div>
                        <div><label>Protocole</label><select value={newPoint.protocole} onChange={e => { const nextProto = e.target.value; const defType = allTypes.find(t => t.protocole === nextProto)?.code_technique || ''; setNewPoint({...newPoint, protocole: nextProto, type: defType}); }}><option value="modbus">Modbus</option><option value="bacnet">BacNET</option></select></div>
                    </div>
                    
                    <div className="form-row"><div><label>{newPoint.protocole === 'modbus' ? 'Unit/Slave ID' : 'Device ID'}</label><input type="number" value={newPoint.deviceId} onChange={e=>setNewPoint({...newPoint, deviceId: e.target.value})} /></div></div>
                    
                    <label className="highlight-label">{newPoint.protocole === 'modbus' ? 'Adresse Registre' : 'Numéro d\'Instance'}</label>
                    <input type="text" className="highlight-input" value={newPoint.adresse} onChange={e=>setNewPoint({...newPoint, adresse: e.target.value})} required />
                    
                    {/* NOUVEAUX CHAMPS : TYPE + UNITE */}
                    <div className="form-row">
                        <div style={{flex: 2}}><label>Type Donnée</label><select value={newPoint.type} onChange={e=>setNewPoint({...newPoint, type: e.target.value})} required>{availableTypes.map(t => (<option key={t.id} value={t.code_technique}>{t.nom_affiche}</option>))}</select></div>
                        <div style={{flex: 1}}><label>Unité</label><input type="text" placeholder="°C" value={newPoint.unite} onChange={e=>setNewPoint({...newPoint, unite: e.target.value})} /></div>
                    </div>

                    {/* NOUVEAUX CHAMPS : SEUILS */}
                    <div className="form-row">
                        <div><label>Seuil Min</label><input type="number" step="any" placeholder="Min" value={newPoint.min} onChange={e=>setNewPoint({...newPoint, min: e.target.value})} /></div>
                        <div><label>Seuil Max</label><input type="number" step="any" placeholder="Max" value={newPoint.max} onChange={e=>setNewPoint({...newPoint, max: e.target.value})} /></div>
                    </div>

                    <div className="form-row">
                        <div><label>Scan (ms)</label><input type="number" step="100" value={newPoint.vitesse} onChange={e=>setNewPoint({...newPoint, vitesse: e.target.value})} /></div>
                    </div>
                    <button type="submit">Lancer le suivi</button>
                </form>
            </>
        ) : (
            <div className="vm-login-required"><Lock size={48} color="var(--primary-color)" style={{opacity:0.5}} /><p>Authentification requise</p><span>Vous devez être connecté.</span></div>
        )}
      </div>

      <div className="vm-main">
        <div className="vm-header">
           <h2><Activity color="var(--primary-color)"/> Suivi Temps Réel</h2>
        </div>
        <div className="vm-grid">
            {points.map(p => (
                <div key={p.id} className="vm-card">
                    <div className="vm-card-header">
                        <div className="vm-header-info">
                            <span className="vm-name" title={p.nom}>{p.nom}</span>
                            <span className={`vm-proto ${p.protocole}`}>{p.protocole}</span>
                        </div>
                        {(user?.email === p.cree_par || user?.role === 'admin') && (
                            <button className="delete-btn" onClick={() => handleDelete(p.id)} title="Supprimer"><Trash2 size={16} /></button>
                        )}
                    </div>
                    <div className="vm-card-body">
                        {/* AFFICHAGE VALEUR AVEC UNITE */}
                        <div className="vm-value">
                            {p.derniere_valeur !== null ? (
                                <>
                                    {p.derniere_valeur}
                                    {p.unite && <span style={{fontSize: '0.5em', marginLeft: '5px', color: 'var(--text-main)', opacity: 0.6}}>{p.unite}</span>}
                                </>
                            ) : <span className="loading-dots">...</span>}
                        </div>
                        <div className="vm-details"><span><Server size={12}/> {p.ip_address}</span><span><Database size={12}/> {p.adresse_variable}</span></div>
                        <div className="vm-type-badge">{p.nom_affiche}</div>
                    </div>
                    <div className="vm-card-footer">
                        <div className="vm-creator" title={`Créé par ${p.cree_par}`}><User size={12}/> {p.cree_par ? p.cree_par.split('@')[0] : 'Inconnu'}</div>
                        <span className="last-up"><Clock size={12}/> {p.dernier_update ? format(new Date(p.dernier_update), 'HH:mm:ss') : '-'}</span>
                        <button onClick={() => showHistory(p)}><History size={14}/></button>
                    </div>
                </div>
            ))}
        </div>

        {selectedPointHistory && (
            <div className="vm-history-panel">
                <div className="vm-history-header">
                    <h3>Historique : {selectedPointHistory.nom}</h3>
                    <div className="vm-history-toolbar">
                        <div className="filter-group">
                            {['15m', '1h', '8h', '24h', 'all'].map(range => (
                                <button key={range} className={`filter-btn ${historyRange === range ? 'active' : ''}`} onClick={() => handleRangeChange(range)}>
                                    {range === 'all' ? 'Toujours' : range}
                                </button>
                            ))}
                        </div>
                        <div className="actions-group">
                            <button onClick={handleExportCsv} className="action-btn csv-btn" title="Télécharger CSV"><Download size={14}/> CSV</button>
                            <button onClick={() => setSelectedPointHistory(null)} className="action-btn close-btn" title="Fermer"><X size={14} /> Fermer</button>
                        </div>
                    </div>
                </div>
                <div className="vm-chart-wrapper">
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={historyData}>
                            <XAxis dataKey="time" stroke="var(--text-main)" fontSize={12} />
                            <YAxis 
                                stroke="var(--text-main)" fontSize={12} 
                                domain={isSelectedBoolean ? [0, 1] : ['auto', 'auto']}
                                ticks={isSelectedBoolean ? [0, 1] : null}
                                tickFormatter={(tick) => isSelectedBoolean ? (tick === 1 ? 'ON' : 'OFF') : tick}
                            />
                            <Tooltip contentStyle={{backgroundColor: 'var(--header-bg)', color: 'var(--text-main)'}}/>
                            <Line type={isSelectedBoolean ? "step" : "monotone"} dataKey="val" stroke="var(--primary-color)" strokeWidth={3} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default VariableMonitor;