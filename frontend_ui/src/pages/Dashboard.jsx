import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [activeAlarms, setActiveAlarms] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- RÉCUPÉRATION DES DONNÉES ---
  const fetchStats = async () => {
    try {
      // 1. Stats KPI (Jauge, Graphes)
      const resStats = await fetch('http://localhost:5000/api/dashboard/stats');
      if (resStats.ok) setData(await resStats.json());

      // 2. Alarmes Actives (Widget liste rouge)
      const resAlarms = await fetch('http://localhost:5000/api/dashboard/active-alarms');
      if (resAlarms.ok) setActiveAlarms(await resAlarms.json());

    } catch (err) {
      console.error("Erreur Dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Rafraichissement toutes les 5 secondes pour la réactivité
    const interval = setInterval(fetchStats, 5000); 
    return () => clearInterval(interval);
  }, []);

  // --- CONFIGURATION JAUGE ---
  const gaugeValue = data?.current?.taux_de_com || 0;
  const gaugeData = [
    { name: 'Valeur', value: gaugeValue },
    { name: 'Reste', value: 100 - gaugeValue }
  ];
  const GAUGE_COLORS = ['var(--primary-color)', 'var(--border-color)']; 

  if (loading) return <div className="dashboard-loading">Chargement du tableau de bord...</div>;

  return (
    <div className="dashboard-container">
      
      {/* 1. JAUGE */}
      <div className="card gauge-card">
        <h3>Taux de communication</h3>
        <div className="gauge-wrapper">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={gaugeData} cx="50%" cy="75%" 
                startAngle={180} endAngle={0}
                innerRadius={85} outerRadius={115}
                paddingAngle={0} dataKey="value" stroke="none"
              >
                {gaugeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={GAUGE_COLORS[index]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="gauge-value">{gaugeValue.toFixed(0)}%</div>
          <div className="gauge-labels"><span>0%</span><span>100%</span></div>
        </div>
      </div>

      {/* 2. GRAPHIQUE */}
      <div className="card graph-card">
        <h3>Évolution du taux de communication</h3>
        <div className="graph-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.history || []} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
              <XAxis 
                dataKey="date_releve" 
                tickFormatter={(tick) => format(new Date(tick), 'HH:mm')} 
                stroke="var(--border-color)"
                tick={{fill: 'var(--text-main)', fontSize: 12}}
              />
              <YAxis 
                domain={[0, 100]} 
                stroke="var(--border-color)"
                tick={{fill: 'var(--text-main)', fontSize: 12}}
                width={35}
              />
              <Tooltip 
                contentStyle={{
                    backgroundColor: 'var(--header-bg)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-main)'
                }}
                labelFormatter={(label) => format(new Date(label), 'dd/MM HH:mm')}
              />
              <Line 
                type="monotone" dataKey="taux_de_com" 
                stroke="var(--primary-color)" strokeWidth={3} dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. ÉVOLUTION */}
      <div className="card evo-card">
        <span className="card-label">Évolution (24h) :</span>
        <span className={`evo-value ${data?.evolution >= 0 ? 'pos' : 'neg'}`}>
          {data?.evolution > 0 ? '+' : ''}{data?.evolution || 0}
        </span>
      </div>

      {/* 4. INDICATEURS */}
      <div className="card indicators-card">
        <h3>Indicateurs</h3>
        <ul className="indicators-list">
          <li><span>Délai Rép. :</span><span className="val-theme">{data?.current?.delai_rep || 0}ms</span></li>
          <li><span>Perte paquets :</span><span className="val-theme">{data?.current?.perte_paquets || 0}%</span></li>
          <li><span>Bande Passante :</span><span className="val-theme">{data?.current?.utilisation_bande_passante || 0}%</span></li>
          <li><span>CPU Serveur :</span><span className="val-theme">{data?.current?.utilisation_cpu || 0}%</span></li>
        </ul>
      </div>

      {/* 5. ALARMES (WIDGET DYNAMIQUE) */}
      <div className="card alarms-card">
        <div className="dash-card-header">
            <h3>Alarmes en cours</h3>
            {activeAlarms.length > 0 && <span className="badge-count">{activeAlarms.length}</span>}
        </div>
        
        <div className="alarms-content">
           {activeAlarms.length === 0 ? (
               <div className="empty-alarms">
                  <CheckCircle size={40} color="#2ecc71" style={{marginBottom: 10}} />
                  <p>Aucune alarme active.<br/>Tout fonctionne !</p>
               </div>
           ) : (
               <ul className="alarm-list">
                   {activeAlarms.map(alarm => (
                       <li key={alarm.id} className="alarm-item">
                           <div className="alarm-info">
                               <span className="alarm-equip">{alarm.NOM_EQUIPEMENT}</span>
                               <span className="alarm-ip">{alarm.IP}</span>
                           </div>
                           <div className="alarm-meta">
                               <span className="alarm-msg">{alarm.message}</span>
                               <span className="alarm-time">
                                   {format(new Date(alarm.date_debut), 'HH:mm:ss')}
                               </span>
                           </div>
                       </li>
                   ))}
               </ul>
           )}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;