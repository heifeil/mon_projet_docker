import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { format } from 'date-fns';
import { Search, History, User } from 'lucide-react';
import './Detective.css'; // On va créer ce fichier juste après

const Detective = () => {
  const [data, setData] = useState({ users: [], history: [] });
  const [loading, setLoading] = useState(true);

  // Couleurs pour le graphique
  const BAR_COLORS = ['var(--primary-color)', '#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/detective/stats');
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Erreur Detective", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="detective-loading">Chargement de l'enquête...</div>;

  return (
    <div className="detective-container">
      
      {/* HEADER */}
      <div className="detective-header">
        <h2><Search size={24} color="var(--primary-color)" /> Bureau d'Investigation</h2>
        <p>Suivi des modifications et analyse des actions utilisateurs.</p>
      </div>

      {/* SECTION HAUTE : TABLEAU USERS + GRAPHIQUE */}
      <div className="detective-top-grid">
        
        {/* 1. TABLEAU UTILISATEURS */}
        <div className="det-card">
          <h3><User size={18} /> Activité des Utilisateurs</h3>
          <div className="table-wrapper-det">
            <table className="det-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Email</th>
                  <th>Création</th>
                  <th title="Nombre d'équipements dont il est le dernier modificateur">Dernières Modifs</th>
                  <th title="Total historique">Total Modifs</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u, i) => (
                  <tr key={i}>
                    <td style={{fontWeight: 'bold'}}>{u.username}</td>
                    <td style={{fontSize: '0.8rem', opacity: 0.7}}>{u.email}</td>
                    <td>{u.created_at ? format(new Date(u.created_at), 'dd/MM/yyyy') : '-'}</td>
                    <td className="text-center highlight-val">{u.last_modifs_count}</td>
                    <td className="text-center">{u.total_modifs_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. GRAPHIQUE */}
        <div className="det-card">
          <h3>Répartition des "Dernières Modifications"</h3>
          <div className="chart-wrapper">
             {data.users.some(u => u.last_modifs_count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.users} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border-color)" opacity={0.3} />
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="username" 
                      tick={{fill: 'var(--text-main)', fontSize: 12}} 
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)'}}
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    />
                    <Bar dataKey="last_modifs_count" name="Dernières modifs" radius={[0, 4, 4, 0]} barSize={20}>
                      {data.users.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="empty-chart">Pas de données de modification disponibles</div>
             )}
          </div>
        </div>

      </div>

      {/* SECTION BASSE : HISTORIQUE COMPLET */}
      <div className="detective-bottom-section">
        <div className="det-card full-height">
          <h3><History size={18} /> Historique des modifications (Test Fonctionnement)</h3>
          <div className="table-wrapper-det">
             {data.history.length === 0 ? (
                <div className="empty-history">Aucune modification enregistrée dans l'historique.</div>
             ) : (
                <table className="det-table full-width">
                  <thead>
                    <tr>
                      <th style={{width: '150px'}}>Date & Heure</th>
                      <th>Équipement</th>
                      <th>Ancien État</th>
                      <th>Nouvel État</th>
                      <th>Modifié par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((row) => (
                      <tr key={row.id}>
                        <td className="date-cell">{format(new Date(row.date_modif), 'dd/MM/yyyy HH:mm')}</td>
                        <td style={{fontWeight: '500'}}>{row.equipement_nom || row.ip_equipement}</td>
                        <td className="old-val">{row.ancien_etat}</td>
                        <td className="new-val">{row.nouvel_etat}</td>
                        <td><span className="user-badge">{row.modifie_par}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Detective;