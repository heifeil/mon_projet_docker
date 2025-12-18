import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import './PIP.css'; // On réutilise le style CSS de PIP pour la cohérence (tableaux, cards...)

const Alarmes = () => {
  const [alarms, setAlarms] = useState([]);
  const [groupedAlarms, setGroupedAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // État pour savoir quelles lignes (IPs) sont ouvertes
  const [expandedIps, setExpandedIps] = useState([]);

  const fetchAlarmes = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/alarmes');
      const data = await res.json();
      setAlarms(data);
      groupData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Logique de regroupement : On garde 1 ligne par IP (la plus récente)
  // et on met tout l'historique dans une propriété .history
  const groupData = (rawParams) => {
    const map = new Map();

    rawParams.forEach(item => {
        if (!map.has(item.IP)) {
            // C'est la première fois qu'on voit cette IP (donc la plus récente car trié par DESC)
            map.set(item.IP, { 
                ...item, 
                history: [] // On prépare le tableau d'historique
            });
        }
        // On ajoute l'item dans l'historique de cette IP
        map.get(item.IP).history.push(item);
    });

    // On convertit la Map en Tableau
    setGroupedAlarms(Array.from(map.values()));
  };

  useEffect(() => {
    fetchAlarmes();
    const interval = setInterval(fetchAlarmes, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleRow = (ip) => {
    if (expandedIps.includes(ip)) {
        setExpandedIps(expandedIps.filter(i => i !== ip));
    } else {
        setExpandedIps([...expandedIps, ip]);
    }
  };

  // Helper pour badge
  const renderBadge = (etat) => {
      const isAlarme = etat === 'Alarme';
      return (
          <span className={`status-badge ${isAlarme ? 'badge-nok' : 'badge-ok'}`}>
              {isAlarme ? <AlertTriangle size={12} style={{marginRight:4}}/> : <CheckCircle size={12} style={{marginRight:4}}/>}
              {etat}
          </span>
      );
  };

  return (
    <div className="pip-container"> {/* On réutilise le conteneur PIP */}
      
      {/* Header simple */}
      <div className="toolbar" style={{ justifyContent: 'flex-start', gap: '15px' }}>
        <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Journal des Alarmes</h3>
        <button onClick={fetchAlarmes} className="btn-tool" title="Rafraîchir">
            <RefreshCw size={18} />
        </button>
      </div>

      <div className="table-full-wrapper">
        {loading && alarms.length === 0 ? (
            <div className="loading-state">Chargement...</div>
        ) : groupedAlarms.length === 0 ? (
            <div className="empty-state">Aucune alarme enregistrée.</div>
        ) : (
            <table className="full-width-table">
                <thead>
                    <tr>
                        <th style={{width: '40px'}}></th> {/* Flèche */}
                        <th>Date (Dernier évènement)</th>
                        <th>Nom Équipement</th>
                        <th>IP</th>
                        <th>Localisation</th>
                        <th>État Actuel</th>
                    </tr>
                </thead>
                <tbody>
                    {groupedAlarms.map((group) => {
                        const isExpanded = expandedIps.includes(group.IP);
                        
                        return (
                            <React.Fragment key={group.IP}>
                                {/* LIGNE PARENT (Dernier état) */}
                                <tr 
                                    onClick={() => toggleRow(group.IP)} 
                                    style={{ cursor: 'pointer', backgroundColor: isExpanded ? 'rgba(var(--primary-color), 0.05)' : 'transparent' }}
                                >
                                    <td style={{textAlign: 'center'}}>
                                        {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                    </td>
                                    <td>{format(new Date(group.date_heure), 'dd/MM/yyyy HH:mm:ss')}</td>
                                    <td>{group.nom}</td>
                                    <td>{group.IP}</td>
                                    <td>{group.localisation}</td>
                                    <td>{renderBadge(group.etat)}</td>
                                </tr>

                                {/* LIGNE ENFANT (Historique) */}
                                {isExpanded && (
                                    <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                                        <td colSpan="6" style={{ padding: '0 0 0 50px' }}>
                                            <div style={{ padding: '10px', borderLeft: '2px solid var(--border-color)' }}>
                                                <h4 style={{margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-main)', opacity: 0.7}}>
                                                    Historique des états pour {group.IP}
                                                </h4>
                                                <table style={{ width: '100%', fontSize: '0.85rem' }}>
                                                    <thead>
                                                        <tr style={{ textAlign: 'left', color: 'var(--text-main)', opacity: 0.6 }}>
                                                            <th style={{paddingBottom: 5}}>Date</th>
                                                            <th style={{paddingBottom: 5}}>État</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.history.map((hist) => (
                                                            <tr key={hist.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                                                <td style={{ padding: '4px 0', color: 'var(--text-main)' }}>
                                                                    {format(new Date(hist.date_heure), 'dd/MM/yyyy HH:mm:ss')}
                                                                </td>
                                                                <td style={{ padding: '4px 0' }}>
                                                                    {renderBadge(hist.etat)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        )}
      </div>
    </div>
  );
};

export default Alarmes;