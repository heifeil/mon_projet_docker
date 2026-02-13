import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, User, Calendar, CheckCircle, XCircle, Shield, Clock } from 'lucide-react';
import './Detective.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Detective = () => {
    const [data, setData] = useState({ users: [], history: [] });
    const [loading, setLoading] = useState(true);

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

    if (loading) return <div className="detective-loading">Chargement de l'enquête...</div>;

    // Préparation des données pour le camembert (on enlève ceux qui ont 0 modifs pour faire propre)
    const pieData = data.users
        .filter(u => u.modif_count > 0)
        .map(u => ({ name: u.username, value: u.modif_count }));

    // Fonction pour styliser le badge selon le nom du rôle (français)
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
            
            {/* HEADER */}
            <div className="detective-header">
                <h2><Search size={24} color="var(--primary-color)" /> Bureau d'Investigation</h2>
                <p>Audit des comptes utilisateurs et suivi des validations fonctionnelles.</p>
            </div>

            {/* SECTION HAUTE : TABLEAU USERS + GRAPHIQUE */}
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
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
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
                                    <th>Date</th>
                                    <th>Équipement</th>
                                    <th>IP</th>
                                    <th>Résultat</th>
                                    <th>Validé par</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.history.map((row) => (
                                    <tr key={row.id}>
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
                                ))}
                                {data.history.length === 0 && (
                                    <tr><td colSpan="5" className="text-center">Aucun historique récent</td></tr>
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