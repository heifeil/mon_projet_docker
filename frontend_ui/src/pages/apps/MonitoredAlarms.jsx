import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, History, Activity } from 'lucide-react';
import { format } from 'date-fns';
import './MonitoredAlarms.css';

const MonitoredAlarms = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null); // ID de la carte ouverte

    const fetchData = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/monitored-alarms');
            if (res.ok) setData(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Rafraichissement auto
        return () => clearInterval(interval);
    }, []);

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (loading) return <div className="ma-loading">Chargement des alarmes...</div>;

    return (
        <div className="ma-container">
            <div className="ma-header">
                <h2><Activity color="var(--primary-color)"/> Alarmes Variables Suivies</h2>
                <span className="ma-subtitle">Surveillance des dépassements de seuils (Min/Max)</span>
            </div>

            <div className="ma-list">
                {data.length === 0 ? (
                    <div className="ma-empty">Aucune alarme enregistrée dans l'historique.</div>
                ) : (
                    data.map(item => (
                        <div key={item.point_id} className={`ma-card ${item.is_active ? 'active-alarm' : 'resolved'}`}>
                            
                            {/* EN-TÊTE DE LA CARTE (Toujours visible) */}
                            <div className="ma-card-main" onClick={() => toggleExpand(item.point_id)}>
                                <div className="ma-icon-status">
                                    {item.is_active ? 
                                        <AlertTriangle size={24} className="icon-blink" /> : 
                                        <CheckCircle size={24} />
                                    }
                                </div>

                                <div className="ma-info">
                                    <div className="ma-title">
                                        <h3>{item.nom}</h3>
                                        <span className="ma-ip">{item.ip}</span>
                                    </div>
                                    <div className="ma-status-text">
                                        {item.is_active ? (
                                            <span className="status-danger">
                                                DÉPASSEMENT {item.active_alarm_details?.type} 
                                                (Val: {item.active_alarm_details?.valeur} {item.unite})
                                            </span>
                                        ) : (
                                            <span className="status-ok">RAS - Dernière val: {item.derniere_valeur_live} {item.unite}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="ma-config">
                                    {item.config.min !== null && <span className="badge-seuil">Min: {item.config.min}</span>}
                                    {item.config.max !== null && <span className="badge-seuil">Max: {item.config.max}</span>}
                                </div>

                                <button className="ma-toggle-btn">
                                    {expandedId === item.point_id ? <ChevronUp /> : <ChevronDown />}
                                </button>
                            </div>

                            {/* ZONE DÉROULANTE (HISTORIQUE) */}
                            {expandedId === item.point_id && (
                                <div className="ma-history-dropdown">
                                    <h4><History size={16}/> Historique des événements</h4>
                                    <table className="ma-history-table">
                                        <thead>
                                            <tr>
                                                <th>État</th>
                                                <th>Type</th>
                                                <th>Valeur</th>
                                                <th>Début</th>
                                                <th>Fin</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {item.history.map(hist => (
                                                <tr key={hist.id} className={hist.etat === 'ACTIVE' ? 'row-active' : ''}>
                                                    <td>
                                                        <span className={`badge-etat ${hist.etat.toLowerCase()}`}>
                                                            {hist.etat === 'ACTIVE' ? 'EN COURS' : 'RÉSOLU'}
                                                        </span>
                                                    </td>
                                                    <td style={{fontWeight:'bold'}}>{hist.type}</td>
                                                    <td>{hist.valeur} {item.unite}</td>
                                                    <td>{format(new Date(hist.debut), 'dd/MM HH:mm:ss')}</td>
                                                    <td>
                                                        {hist.fin ? 
                                                            format(new Date(hist.fin), 'dd/MM HH:mm:ss') : 
                                                            <span className="text-active">Toujours active...</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MonitoredAlarms;
