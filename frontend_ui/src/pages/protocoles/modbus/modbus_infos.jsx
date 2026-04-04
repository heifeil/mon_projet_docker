import React, { useState, useEffect } from 'react';
import { Server, MapPin, Box, Layers, Cpu, Hash, Router, Save, Plus, Settings, Send, RefreshCw, X, Crosshair, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext'; 

const ModbusInfos = ({ equipment, onClose }) => {
  const { user } = useAuth();

  // États globaux
  const [points, setPoints] = useState([]);
  const [modbusTypes, setModbusTypes] = useState([]);
  
  // États pour l'Auto-Contrôle
  const [testResults, setTestResults] = useState({});
  const [globalComment, setGlobalComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(''); // NOUVEAU : État pour le pop-up discret

  // États pour le pilotage/lecture
  const [liveValues, setLiveValues] = useState({}); 
  const [writeValues, setWriteValues] = useState({}); 

  // Formulaire nouveau point
  const [newPoint, setNewPoint] = useState({ nom: '', mode: 'lecture', type_donnee: '', registre: '' });

  const val = (v) => v || '-';

  // 1. Initialisation
  useEffect(() => {
    fetchModbusTypes();
    fetchPoints();
  }, [equipment.id]);

  // Boucle de lecture temps réel
  useEffect(() => {
      // MODIFICATION : On ne garde que les points en lecture qui N'ONT PAS de résultat (OK/NOK) défini
      const lecturePoints = points.filter(p => p.mode === 'lecture' && !testResults[p.id]);
      if (lecturePoints.length === 0) return;

      readLiveValues(lecturePoints);

      const intervalId = setInterval(() => {
          readLiveValues(lecturePoints);
      }, 1000);

      return () => clearInterval(intervalId);
  }, [points, testResults]); // MODIFICATION : Ajout de testResults dans les dépendances

  const fetchModbusTypes = async () => {
    try {
        const res = await fetch('http://localhost:5000/api/modbus/types');
        if (!res.ok) throw new Error("Route introuvable");
        const data = await res.json();
        setModbusTypes(data);
    } catch (err) { 
        console.error("Erreur chargement des types Modbus :", err); 
    }
  };

  const fetchPoints = async () => {
    try {
        const res = await fetch(`http://localhost:5000/api/modbus/points/${equipment.id}`);
        const data = await res.json();
        setPoints(data);
    } catch (err) { console.error("Erreur chargement des points :", err); }
  };

  // 2. Lecture Modbus
  const readLiveValues = async (pointsList) => {
      await Promise.all(pointsList.map(async (pt) => {
          try {
              const res = await fetch('http://localhost:5000/api/modbus/read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ip: equipment.IP, registre: pt.registre, type_donnee: pt.type_donnee })
              });
              const result = await res.json();
              if (result.success) {
                  setLiveValues(prev => ({ ...prev, [pt.id]: result.value }));
              }
          } catch (e) {
              setLiveValues(prev => ({ ...prev, [pt.id]: 'Erreur' }));
          }
      }));
  };

  // 3. Écriture Modbus
  const handleWrite = async (point) => {
      const valToSend = writeValues[point.id];
      if (!valToSend) return alert("Saisissez une valeur avant d'envoyer.");

      try {
          const res = await fetch('http://localhost:5000/api/modbus/write', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ip: equipment.IP, registre: point.registre, type_donnee: point.type_donnee, value: valToSend })
          });
          const result = await res.json();
          if (result.success) alert(result.message);
          else alert("Erreur : " + result.message);
      } catch (e) { alert("Erreur réseau lors de l'envoi"); }
  };

  // 4. Ajouter un point
  const handleAddPoint = async () => {
      if (!newPoint.nom || !newPoint.type_donnee || newPoint.registre === '') {
          return alert("Veuillez remplir tous les champs (Nom, Mode, Type et Registre).");
      }

      try {
          const res = await fetch('http://localhost:5000/api/modbus/points', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ equipement_id: equipment.id, ...newPoint })
          });
          
          const result = await res.json();

          if (res.ok) {
              setNewPoint({ nom: '', mode: 'lecture', type_donnee: '', registre: '' });
              fetchPoints();
          } else {
              alert("Erreur du serveur : " + (result.message || "Impossible de créer le point."));
          }
      } catch (error) { 
          alert("Erreur réseau lors de la communication avec le backend."); 
      }
  };

  // 5. Historisation (AC)
  const handleResult = (id, status) => setTestResults(prev => ({ ...prev, [id]: status }));

  const handleSaveAC = async () => {
      // MODIFICATION : Suppression de window.confirm
      setSaving(true);

      const isGlobalOK = points.length > 0 && points.every(p => testResults[p.id] === 'OK');
      const payload = {
          equipement_id: equipment.id, 
          nom_equipement: equipment.NOM_EQUIPEMENT,
          etat_global: isGlobalOK ? 'OK' : 'NOK',
          detail: points.map(p => ({ nom: p.nom, resultat: testResults[p.id] || 'Non testé' })),
          comment: globalComment,
          user_email: user?.email || 'Utilisateur Inconnu'
      };

      try {
          const res = await fetch('http://localhost:5000/api/ptu/history', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(payload)
          });
          if(res.ok) {
              // MODIFICATION : Utilisation du toast plutôt que alert()
              setGlobalComment('');
              setTestResults({});
              
              setToastMessage("AC Sauvegardé avec succès !");
              setTimeout(() => {
                  setToastMessage('');
              }, 3000);
          }
      } catch (err) { 
          alert("Erreur de sauvegarde"); 
      } finally { 
          setSaving(false); 
      }
  };

  // Styles pour les lignes du bloc informations
  const infoRowStyle = { 
      display: 'flex', 
      justifyContent: 'space-between', 
      padding: '12px 0', 
      borderBottom: '1px dashed rgba(255,255,255,0.1)' 
  };
  const infoLabelStyle = { 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px', 
      color: '#aaa',
      fontSize: '0.9rem',
      fontWeight: '500'
  };
  const infoValueStyle = { 
      fontWeight: '600',
      fontSize: '0.95rem'
  };

  return (
    <div className="bacnet-tab-content" style={{ padding: '20px', overflowY: 'auto', position: 'relative' }}>
      
      {/* HEADER AVEC BOUTON FERMER UNIQUE EN HAUT */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
         <div>
             <h3 style={{ marginTop: 0, marginBottom: '10px', color: 'var(--primary-color)' }}>{val(equipment.NOM_EQUIPEMENT)}</h3>
             <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Server size={16} className="text-muted"/> <strong>{val(equipment.IP)}</strong></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Router size={16} className="text-muted"/> <strong>MAC : {val(equipment.MAC)}</strong></div>
             </div>
         </div>

         {onClose && (
            <button onClick={onClose} className="btn-tool" style={{ borderColor: 'var(--border-color)', opacity: 0.8 }}>
                <X size={18} />
            </button>
         )}
      </div>

      {/* BLOC INFORMATIONS */}
      <h4 style={{ margin: '0 0 10px 0', textTransform: 'uppercase', fontSize: '0.75rem', opacity: 0.6, letterSpacing: '1px' }}>
          Informations
      </h4>
      <div style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0 20px', marginBottom: '30px', border: '1px solid var(--border-color)' }}>
          <div style={infoRowStyle}>
              <span style={infoLabelStyle}><Layers size={16}/> Niveau</span>
              <span style={infoValueStyle}>{val(equipment.NIVEAU)}</span>
          </div>
          <div style={infoRowStyle}>
              <span style={infoLabelStyle}><Box size={16}/> Compartiment</span>
              <span style={infoValueStyle}>{val(equipment.COMPARTEMENT)}</span>
          </div>
          <div style={infoRowStyle}>
              <span style={infoLabelStyle}><Cpu size={16}/> Type</span>
              <span style={infoValueStyle}>{val(equipment.TYPE_EQUIPEMENT)}</span>
          </div>
          <div style={infoRowStyle}>
              <span style={infoLabelStyle}><Hash size={16}/> Lot</span>
              <span style={infoValueStyle}>{val(equipment.LOT)}</span>
          </div>
          <div style={infoRowStyle}>
              <span style={infoLabelStyle}><MapPin size={16}/> Localisation</span>
              <span style={infoValueStyle}>{val(equipment.LOCALISATION)}</span>
          </div>
          <div style={{ ...infoRowStyle, borderBottom: 'none' }}>
              <span style={infoLabelStyle}><Crosshair size={16}/> Position (X, Y)</span>
              <span style={infoValueStyle}>X: {val(equipment.X)}, Y: {val(equipment.Y)}</span>
          </div>
      </div>

      {/* TABLEAU DES POINTS */}
      <h4 style={{ margin: '20px 0 10px 0', textTransform: 'uppercase', fontSize: '0.75rem', opacity: 0.6, letterSpacing: '1px' }}>
          Points Pilotables (Modbus)
      </h4>
      
      <div className="ac-container">
          <table className="ac-table">
              <thead>
                  <tr>
                      <th>Point</th>
                      <th>Config</th>
                      <th>Valeur / Commande</th>
                      <th style={{textAlign:'right'}}>Auto-Contrôle</th>
                  </tr>
              </thead>
              <tbody>
                  {points.length === 0 && (
                      <tr><td colSpan="4" style={{textAlign:'center', opacity:0.5, padding:'20px'}}>Aucun point configuré.</td></tr>
                  )}
                  {points.map(row => (
                      <tr key={row.id} className={testResults[row.id] === 'OK' ? 'row-ok' : testResults[row.id] === 'NOK' ? 'row-nok' : ''}>
                          <td><strong>{row.nom}</strong></td>
                          
                          <td>
                              <span style={{display:'block', fontSize: '0.75rem', opacity: 0.8, textTransform:'uppercase'}}>{row.mode}</span>
                              <span className="unit-badge">R:{row.registre}</span>
                          </td>
                          
                          {/* CELLULE DYNAMIQUE SELON LE MODE */}
                          <td>
                              {row.mode === 'lecture' ? (
                                  <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                      <span style={{fontFamily:'monospace', fontSize:'1.1rem', minWidth: '40px'}}>
                                          {/* Si le test est fait, on affiche une opacité réduite pour montrer que la valeur est "figée" */}
                                          <span style={{ opacity: testResults[row.id] ? 0.5 : 1 }}>
                                            {liveValues[row.id] || '...'}
                                          </span>
                                      </span>
                                      <button className="btn-tool" onClick={() => readLiveValues([row])} disabled={!!testResults[row.id]} title="Forcer l'actualisation"><RefreshCw size={14}/></button>
                                  </div>
                              ) : (
                                  <div style={{display:'flex', gap:'5px'}}>
                                      <input 
                                          type="text" 
                                          className="input-ac" 
                                          placeholder="Valeur..."
                                          style={{width:'80px'}}
                                          value={writeValues[row.id] || ''}
                                          onChange={e => setWriteValues(prev => ({...prev, [row.id]: e.target.value}))}
                                      />
                                      <button className="btn-send" onClick={() => handleWrite(row)} title="Envoyer la commande"><Send size={14}/></button>
                                  </div>
                              )}
                          </td>

                          {/* CELLULE AUTO-CONTROLE */}
                          <td className="actions-cell">
                              <div className="result-buttons">
                                  <button className={`btn-result ok ${testResults[row.id] === 'OK' ? 'active' : ''}`} onClick={() => handleResult(row.id, 'OK')}>OK</button>
                                  <button className={`btn-result nok ${testResults[row.id] === 'NOK' ? 'active' : ''}`} onClick={() => handleResult(row.id, 'NOK')}>NOK</button>
                              </div>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>

          {/* ZONE COMMENTAIRE ET SAUVEGARDE */}
          <div className="ac-footer" style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
              <textarea 
                  placeholder="Commentaire global sur cet équipement..." 
                  value={globalComment} 
                  onChange={(e) => setGlobalComment(e.target.value)} 
                  rows="2" 
                  style={{ flex: 1 }}
              />
              <button className="btn-save-ac" onClick={handleSaveAC} disabled={saving || points.length === 0}>
                  {saving ? "Sauvegarde..." : <><Save size={18}/> Sauvegarder l'AC</>}
              </button>
          </div>
      </div>

      {/* FORMULAIRE D'AJOUT DE POINT */}
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(0,0,0,0.02)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Settings size={16} /> Créer un nouveau point
          </h4>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input 
                  type="text" 
                  className="input-ac" 
                  style={{flex: 1, minWidth: '150px'}} 
                  placeholder="Nom (ex: Température...)" 
                  value={newPoint.nom} 
                  onChange={e => setNewPoint({...newPoint, nom: e.target.value})} 
                  title="Nom du point à créer"
              />
              
              <select 
                  className="input-ac" 
                  value={newPoint.mode} 
                  onChange={e => setNewPoint({...newPoint, mode: e.target.value})}
                  title="Mode de communication"
              >
                  <option value="lecture">Lecture (Capteur)</option>
                  <option value="ecriture">Écriture (Commande)</option>
              </select>

              <select 
                  className="input-ac" 
                  value={newPoint.type_donnee} 
                  onChange={e => setNewPoint({...newPoint, type_donnee: e.target.value})}
                  title="Type de variable Modbus"
              >
                  <option value="" disabled>-- Type de variable --</option>
                  {modbusTypes.map(t => (
                      <option key={t.code_technique} value={t.code_technique}>
                          {t.nom_affiche}
                      </option>
                  ))}
              </select>

              <input 
                  type="number" 
                  className="input-ac" 
                  style={{width: '100px'}} 
                  placeholder="N° Registre" 
                  value={newPoint.registre} 
                  onChange={e => setNewPoint({...newPoint, registre: e.target.value})} 
                  title="Adresse du registre Modbus"
              />
              
              <button className="btn-send" style={{padding: '6px 12px', minWidth: '90px'}} onClick={handleAddPoint}>
                  <Plus size={16} /> Créer
              </button>
          </div>
      </div>

      {/* NOUVEAU : POP-UP TOAST DE SUCCÈS DISCRET */}
      {toastMessage && (
          <div style={{
              position: 'fixed',
              bottom: '30px',
              right: '30px',
              backgroundColor: '#00C49F',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: 'bold',
              zIndex: 9999,
              animation: 'fadeIn 0.3s ease-in-out'
          }}>
              <CheckCircle size={20} />
              {toastMessage}
          </div>
      )}

    </div>
  );
};

export default ModbusInfos;