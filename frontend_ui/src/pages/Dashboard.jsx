import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- RÉCUPÉRATION DES DONNÉES ---
  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/dashboard/stats');
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Erreur Dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); 
    return () => clearInterval(interval);
  }, []);

  // --- CONFIGURATION JAUGE ---
  const gaugeValue = data?.current?.taux_de_com || 0;
  const gaugeData = [
    { name: 'Valeur', value: gaugeValue },
    { name: 'Reste', value: 100 - gaugeValue }
  ];
  const GAUGE_COLORS = ['var(--primary-color)', 'var(--border-color)']; 

  if (loading) return <div className="dashboard-loading">Chargement...</div>;

  return (
    <div className="dashboard-container">
      
      {/* 1. JAUGE (Plus grosse) */}
      <div className="card gauge-card">
        <h3>Taux de communication</h3>
        <div className="gauge-wrapper">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="75%" 
                startAngle={180}
                endAngle={0}
                innerRadius={85}
                outerRadius={115}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                {gaugeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={GAUGE_COLORS[index]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          <div className="gauge-value">
            {gaugeValue.toFixed(0)}%
          </div>
          
          <div className="gauge-labels">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* 2. GRAPHIQUE (Avec Axe Y ajusté) */}
      <div className="card graph-card">
        <h3>Évolution du taux de communication</h3>
        <div className="graph-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            {/* J'ai mis left: 0 au lieu de -20 pour laisser la place à l'axe Y élargi */}
            <LineChart data={data?.history || []} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
              <XAxis 
                dataKey="date_releve" 
                tickFormatter={(tick) => format(new Date(tick), 'HH:mm')} 
                stroke="var(--border-color)"
                tick={{fill: 'var(--text-main)', fontSize: 12}}
              />
              {/* MODIFICATION : width={50} pour afficher "100" en entier */}
              <YAxis 
                domain={[0, 100]} 
                stroke="var(--border-color)"
                tick={{fill: 'var(--text-main)', fontSize: 12}}
                width={50}
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
                type="monotone" 
                dataKey="taux_de_com" 
                stroke="var(--primary-color)" 
                strokeWidth={3} 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="graph-axis-labels">
            <span>t-24h</span>
            <span>t-12h</span>
            <span>t0</span>
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

      {/* 5. ALARMES */}
      <div className="card alarms-card">
        <h3>Alarmes</h3>
        <div className="alarms-content">
           <div className="empty-alarms">
              <AlertTriangle size={40} style={{ opacity: 0.5, color: 'var(--text-main)' }} />
              <p>Aucune alarme active</p>
           </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;