import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, User, Calendar, CheckCircle, XCircle, Shield, Clock, Download, ChevronDown, ChevronUp } from 'lucide-react';
import './Detective.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Detective = () => {
    const [data, setData] = useState({ users: [], history: [] });
    const [loading, setLoading] = useState(true);
    
    // NOUVEAU : État pour gérer les lignes déroulées (accordéon)
    const [expandedRows, setExpandedRows] = useState({});

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    useEffect(() => {
        fetch('http://localhost:5000/api/detective/stats')
            .then(res => res.json())
            .then(result => {
                setData(result);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    // --- NOUVEAU : GESTION DU CLIC SUR UNE LIGNE (ACCORDÉON) ---
    const toggleRow = async (row) => {
        const isExpanded = !!expandedRows[row.id];
        
        if (isExpanded) {
            // Si c'est déjà ouvert, on ferme
            const newExpanded = { ...expandedRows };
            delete newExpanded[row.id];
            setExpandedRows(newExpanded);
        } else {
            // Si c'est fermé, on ouvre ET on cherche les détails dans la BDD
            try {
                const res = await fetch(`http://localhost:5000/api/ptu/history/${row.id}`);
                const historyData = await res.json();
                setExpandedRows(prev => ({ ...prev, [row.id]: historyData }));
            } catch (err) {
                console.error("Erreur chargement détails:", err);
            }
        }
    };

    // --- NOUVEAU : EXPORT CSV D'UN ÉQUIPEMENT SPÉCIFIQUE ---
    const downloadCSV = (equipement_nom, historyArray, e) => {
        e.stopPropagation(); // Empêche la ligne de se refermer quand on clique sur le bouton
        if (!historyArray || historyArray.length === 0) return alert("Aucune donnée à extraire.");

        const headers = ["Date", "Etat Global", "Détails (Points de test)", "Commentaire", "Utilisateur"];
        const csvRows = [headers.join(';')];

        historyArray.forEach(h => {
            const date = formatDate(h.date_test);
            const etat = h.etat_global || '';
            
            // Formatage propre du JSON des détails (ex: "Température: OK | Vitesse: NOK")
            let detailStr = '';
            try {
                if (h.detail_json) {
                    const parsed = JSON.parse(h.detail_json);
                    detailStr = parsed.map(d => `${d.nom}: ${d.resultat}`).join(' | ');
                }
            } catch(err) { 
                detailStr = h.detail_json || ''; 
            }
            
            // Nettoyage du commentaire pour ne pas casser le CSV (enlève les sauts de ligne et les ;)
            const comment = (h.commentaire || '').replace(/[\n\r]+/g, ' ').replace(/;/g, ',');
            const user = h.user_email || '';

            csvRows.push([date, etat, detailStr, comment, user].join(';'));
        });

        // Génération du fichier
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AC_${equipement_nom.replace(/\s+/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="detective-loading">Chargement de l'enquête...</div>;

    const pieData = data.users
        .filter(u => u.modif_count > 0)
        .map(u => ({ name: u.username, value: u.modif_count }));

    const getRoleClass = (roleName) => {
        if (!roleName) return 'user';
        const r = roleName.toLowerCase();
        if (r.includes('super')) return 'superadmin';
        if (r.includes('admin')) return 'admin';
        if (r.includes('opérateur')) return 'operator';
        return 'user';
    };

    return (
        <div className="detective-container">
            
            <div className="detective-header">
                <h2><Search size={24} color="var(--primary-color)" /> Bureau d'Investigation</h2>
                <p>Audit des comptes utilisateurs et suivi des validations fonctionnelles.</p>
            </div>

            <div className="detective-top-grid">
                {/* 1. TABLEAU UTILISATEURS */}
                <div className="detective-card">
                    <h3><User size={18} /> Comptes & Activité</h3>
                    <div className="table-wrapper-det">
                        <table className="detective-table">
                            <thead>
                                <tr>
                                    <th>Utilisateur</th>
                                    <th>Rôle</th>
                                    <th>Créé le</th>
                                    <th className="text-center">Modifs (AC)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.users.map((u) => (
                                    <tr key={u.id}>
                                        <td>
                                            <div style={{fontWeight:'bold'}}>{u.username}</div>
                                            <div style={{fontSize:'0.75rem', opacity:0.6}}>{u.email}</div>
                                        </td>
                                        <td>
                                            <span className={`role-badge ${getRoleClass(u.role)}`}>
                                                {u.role || 'Lecteur'}
                                            </span>
                                        </td>
                                        <td>{formatDate(u.date_creation)}</td>
                                        <td className="text-center">
                                            {u.modif_count > 0 ? (
                                                <strong style={{color:'var(--primary-color)'}}>{u.modif_count}</strong>
                                            ) : (
                                                <span style={{opacity:0.3}}>-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. GRAPHIQUE CAMEMBERT */}
                <div className="detective-card">
                    <h3>Répartition des Actions</h3>
                    <div className="chart-wrapper">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-chart">Aucune activité enregistrée</div>
                        )}
                    </div>
                </div>
            </div>

            {/* SECTION BASSE : HISTORIQUE COMPLET */}
            <div className="detective-bottom-section">
                <div className="detective-card full-height">
                    <h3><Clock size={18} /> Historique des Tests Fonctionnels (Dernières validations)</h3>
                    <div className="table-wrapper-det">
                         <table className="detective-table full-width">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}></th> {/* Colonne pour la flèche */}
                                    <th>Dernier Test</th>
                                    <th>Équipement</th>
                                    <th>IP</th>
                                    <th>Dernier Résultat</th>
                                    <th>Dernier Utilisateur</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.history.map((row) => {
                                    const isExpanded = !!expandedRows[row.id];
                                    const details = expandedRows[row.id]; // Le tableau renvoyé par le backend

                                    return (
                                        <React.Fragment key={row.id}>
                                            {/* LIGNE PRINCIPALE (Cliquable) */}
                                            <tr 
                                                onClick={() => toggleRow(row)} 
                                                style={{ cursor: 'pointer', backgroundColor: isExpanded ? 'rgba(0,0,0,0.1)' : 'transparent' }}
                                                title="Cliquez pour voir tout l'historique de cet équipement"
                                            >
                                                <td style={{ textAlign: 'center', opacity: 0.5 }}>
                                                    {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                                </td>
                                                <td className="date-cell">{formatDate(row.DERNIERE_MODIF_LE)}</td>
                                                <td style={{fontWeight:'500'}}>{row.NOM_EQUIPEMENT}</td>
                                                <td>{row.IP}</td>
                                                <td>
                                                    {row.TEST_FONCTIONNEMENT === 'OK' ? (
                                                        <span className="badge-ok"><CheckCircle size={14}/> OK</span>
                                                    ) : (
                                                        <span className="badge-nok"><XCircle size={14}/> NOK</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="user-badge">{row.DERNIERE_MODIF_PAR}</span>
                                                </td>
                                            </tr>

                                            {/* LIGNE DÉROULÉE (L'Accordéon) */}
                                            {isExpanded && details && (
                                                <tr>
                                                    <td colSpan="6" style={{ padding: '0' }}>
                                                        <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '15px 20px', borderBottom: '1px solid var(--border-color)', borderLeft: '3px solid var(--primary-color)' }}>
                                                            
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#aaa' }}>
                                                                    Historique complet : {row.NOM_EQUIPEMENT}
                                                                </h4>
                                                                <button className="btn-tool" onClick={(e) => downloadCSV(row.NOM_EQUIPEMENT, details, e)}>
                                                                    <Download size={14} /> Exporter .csv
                                                                </button>
                                                            </div>

                                                            {details.length > 0 ? (
                                                                <table className="detective-table full-width" style={{ fontSize: '0.85rem', backgroundColor: 'transparent' }}>
                                                                    <thead>
                                                                        <tr style={{ opacity: 0.7 }}>
                                                                            <th>Date du Test</th>
                                                                            <th>Résultat Global</th>
                                                                            <th>Utilisateur</th>
                                                                            <th>Commentaire</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {details.map(d => (
                                                                            <tr key={d.id} style={{ backgroundColor: 'transparent' }}>
                                                                                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(d.date_test)}</td>
                                                                                <td>
                                                                                    <strong style={{ color: d.etat_global === 'OK' ? '#00C49F' : '#FF8042' }}>
                                                                                        {d.etat_global}
                                                                                    </strong>
                                                                                </td>
                                                                                <td>{d.user_email || 'Système'}</td>
                                                                                <td style={{ fontStyle: 'italic', opacity: 0.8 }}>{d.commentaire || '-'}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            ) : (
                                                                <p style={{ margin: 0, opacity: 0.5, fontSize: '0.85rem' }}>Aucun historique détaillé trouvé.</p>
                                                            )}

                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {data.history.length === 0 && (
                                    <tr><td colSpan="6" className="text-center">Aucun historique récent</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Detective;