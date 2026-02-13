import React, { useState, useEffect } from 'react';
import { Server, MapPin, Box, Layers, Cpu, Hash, Router, Crosshair, CheckCircle, XCircle, Save, Send } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext'; 

const BacnetInfos = ({ equipment }) => {
  const { user } = useAuth(); 

  // --- ÉTATS ---
  const [tests, setTests] = useState([]); 
  const [testValues, setTestValues] = useState({}); 
  const [testResults, setTestResults] = useState({}); 
  const [globalComment, setGlobalComment] = useState('');
  const [saving, setSaving] = useState(false);

  // Utilitaire d'affichage
  const val = (v) => v || '-';

  // Chargement initial des tests
  useEffect(() => {
    fetch('http://localhost:5000/api/ptu')
      .then(res => res.json())
      .then(data => setTests(data))
      .catch(err => console.error("Erreur chargement tests", err));
  }, []);

  // --- ACTIONS ---

  const handleInputChange = (id, value) => {
    setTestValues(prev => ({ ...prev, [id]: value }));
  };

  const handleSendValue = async (testRow) => {
    const valueToSend = testValues[testRow.id];
    if (valueToSend === undefined || valueToSend === '') return alert("Veuillez saisir une valeur");

    try {
        const res = await fetch('http://localhost:5000/api/ptu/write', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: testRow.id, value: valueToSend })
        });
        const result = await res.json();
        if(result.success) alert(`Succès : ${result.message}`);
    } catch (err) {
        alert("Erreur lors de l'envoi");
    }
  };

  const handleBoolSend = async (id, boolValue) => {
      handleInputChange(id, boolValue);
      console.log(`Envoi immédiat Bool ${boolValue} pour ID ${id}`);
  };

  const handleResult = (id, status) => {
      setTestResults(prev => ({ ...prev, [id]: status }));
  };

  // --- SAUVEGARDE ET MISE À JOUR GLOBALE (VIA ID) ---
  const handleSaveAC = async () => {
      if(!window.confirm("Valider et archiver cet Auto-Contrôle ? Cela mettra à jour l'état global.")) return;
      setSaving(true);

      const isGlobalOK = tests.length > 0 && tests.every(t => testResults[t.id] === 'OK');
      
      const payload = {
          // 1. CLÉ TECHNIQUE (ID INT) - Pour la liaison BDD solide
          equipement_id: equipment.id, 

          // 2. NOM POUR AFFICHAGE (SNAPSHOT) - Pour lire l'historique sans jointure complexe
          nom_equipement: equipment.NOM_EQUIPEMENT,
          
          etat_global: isGlobalOK ? 'OK' : 'NOK',
          detail: tests.map(t => ({
              nom: t.nom,
              resultat: testResults[t.id] || 'Non testé'
          })),
          comment: globalComment,
          user_email: user?.email || 'Utilisateur Inconnu'
      };

      try {
          const res = await fetch('http://localhost:5000/api/ptu/history', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(payload)
          });
          const ret = await res.json();
          if(ret.success) {
              alert("AC Sauvegardé avec succès !");
              setGlobalComment('');
              setTestResults({});
              setTestValues({});
          }
      } catch (err) {
          console.error(err);
          alert("Erreur sauvegarde");
      } finally {
          setSaving(false);
      }
  };

  // --- RENDU DES CONTRÔLES ---
  const renderControls = (row) => {
      if (!row.is_writable) {
          return (
              <div className="control-group">
                  <div className="value-display-readonly" title="Valeur en temps réel (Lecture seule)">
                      <span className="value-placeholder">---</span>
                      {row.unit && <span className="unit-label">{row.unit}</span>}
                  </div>
              </div>
          );
      }

      if (row.is_binary) {
          return (
              <div className="control-group">
                  <button className="btn-bool true" onClick={() => handleBoolSend(row.id, 'True')}>True</button>
                  <button className="btn-bool false" onClick={() => handleBoolSend(row.id, 'False')}>False</button>
              </div>
          );
      }

      if (row.is_enum) {
          return (
              <div className="control-group">
                  <input 
                    type="number" 
                    placeholder="Val (Int)" 
                    className="input-ac"
                    onChange={(e) => handleInputChange(row.id, e.target.value)}
                  />
                  <button className="btn-send" onClick={() => handleSendValue(row)}><Send size={14}/></button>
              </div>
          );
      }

      if (row.is_analog) {
          return (
              <div className="control-group">
                  <input 
                    type="number" 
                    placeholder={`Val (${row.unit || ''})`} 
                    className="input-ac"
                    onChange={(e) => handleInputChange(row.id, e.target.value)}
                  />
                  <button className="btn-send" onClick={() => handleSendValue(row)}><Send size={14}/></button>
              </div>
          );
      }
      return <span>Type inconnu</span>;
  };

  return (
    <div className="bacnet-tab-content">
      <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
         <h3 style={{ marginTop: 0, marginBottom: '10px', color: 'var(--primary-color)', fontSize: '1.1rem' }}>
            {val(equipment.NOM_EQUIPEMENT)}
         </h3>
         <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={16} className="text-muted"/> <span className="text-muted">IP :</span> <strong>{val(equipment.IP)}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Router size={16} className="text-muted"/> <span className="text-muted">MAC :</span> <strong>{val(equipment.MAC)}</strong>
            </div>
         </div>
      </div>

      <h4 style={{ margin: '0 0 10px 0', textTransform: 'uppercase', fontSize: '0.75rem', opacity: 0.6, letterSpacing: '1px' }}>Informations</h4>
      <div className="info-grid">
        <div className="info-item"><label style={{display:'flex', alignItems:'center', gap:'8px'}}><Layers size={14}/> Niveau</label> <span>{val(equipment.NIVEAU)}</span></div>
        <div className="info-item"><label style={{display:'flex', alignItems:'center', gap:'8px'}}><Box size={14}/> Compartiment</label> <span>{val(equipment.COMPARTEMENT)}</span></div>
        <div className="info-item"><label style={{display:'flex', alignItems:'center', gap:'8px'}}><Cpu size={14}/> Type</label> <span>{val(equipment.TYPE_EQUIPEMENT)}</span></div>
        <div className="info-item"><label style={{display:'flex', alignItems:'center', gap:'8px'}}><Hash size={14}/> Lot</label> <span>{val(equipment.LOT)}</span></div>
        <div className="info-item"><label style={{display:'flex', alignItems:'center', gap:'8px'}}><MapPin size={14}/> Localisation</label> <span>{val(equipment.LOCALISATION)}</span></div>
        <div className="info-item"><label style={{display:'flex', alignItems:'center', gap:'8px'}}><Crosshair size={14}/> Position (X, Y)</label> <span>X: {val(equipment.POS_X)}, Y: {val(equipment.POS_Y)}</span></div>
      </div>

      <h4 style={{ marginTop: '25px', marginBottom: '10px', textTransform: 'uppercase', fontSize: '0.75rem', opacity: 0.6, letterSpacing: '1px' }}>
          Auto-Contrôle (AC)
      </h4>
      
      <div className="ac-container">
          <table className="ac-table">
              <thead>
                  <tr>
                      <th>Point de Test</th>
                      <th>Commandes / Valeurs</th>
                      <th style={{textAlign:'right'}}>État</th>
                  </tr>
              </thead>
              <tbody>
                  {tests.map(row => (
                      <tr key={row.id} className={testResults[row.id] === 'OK' ? 'row-ok' : testResults[row.id] === 'NOK' ? 'row-nok' : ''}>
                          <td>
                              <strong>{row.nom}</strong>
                              {row.unit && <span className="unit-badge">{row.unit}</span>}
                          </td>
                          <td>{renderControls(row)}</td>
                          <td className="actions-cell">
                              <div className="result-buttons">
                                  <button 
                                    className={`btn-result ok ${testResults[row.id] === 'OK' ? 'active' : ''}`}
                                    onClick={() => handleResult(row.id, 'OK')}
                                  >OK</button>
                                  <button 
                                    className={`btn-result nok ${testResults[row.id] === 'NOK' ? 'active' : ''}`}
                                    onClick={() => handleResult(row.id, 'NOK')}
                                  >NOK</button>
                              </div>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>

          <div className="ac-footer">
              <textarea 
                placeholder="Commentaire global sur cet AC..." 
                value={globalComment}
                onChange={(e) => setGlobalComment(e.target.value)}
                rows="3"
              />
              <button className="btn-save-ac" onClick={handleSaveAC} disabled={saving}>
                  {saving ? <><Save size={18} className="spin"/> Sauvegarde...</> : <><Save size={18}/> Sauvegarder l'AC</>}
              </button>
          </div>
      </div>
    </div>
  );
};

export default BacnetInfos;