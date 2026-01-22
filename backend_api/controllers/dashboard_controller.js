const db = require('../config/db');

// 1. Récupérer les statistiques globales (Jauge + Graphique + Indicateurs)
exports.getDashboardStats = async (req, res) => {
    try {
        // A. Dernier relevé (Temps réel)
        const [latest] = await db.query(
            'SELECT * FROM indicateurs ORDER BY date_releve DESC LIMIT 1'
        );

        // B. Historique 24h (Graphique)
        // On récupère les points pour tracer la courbe
        const [history] = await db.query(`
            SELECT taux_de_com, date_releve 
            FROM indicateurs 
            WHERE date_releve >= NOW() - INTERVAL 24 HOUR 
            ORDER BY date_releve ASC
        `);

        // C. Calcul évolution (Comparaison avec la première valeur de l'historique)
        let evolution = 0;
        if (latest.length > 0 && history.length > 0) {
            const oldValue = history[0].taux_de_com;
            const newValue = latest[0].taux_de_com;
            evolution = (newValue - oldValue).toFixed(1);
        }

        res.json({
            current: latest.length > 0 ? latest[0] : null,
            history: history,
            evolution: evolution
        });

    } catch (error) {
        console.error("Erreur Dashboard:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// 2. Récupérer UNIQUEMENT les alarmes actives (Correction Colonnes)
exports.getActiveAlarmsWidget = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, nom as message, nom as NOM_EQUIPEMENT, IP, date_heure as date_debut
            FROM alarmes 
            WHERE etat = 'Alarme' 
            ORDER BY date_heure DESC 
            LIMIT 5
        `);
        
        res.json(rows);
    } catch (err) {
        console.error("Erreur widget alarmes:", err);
        res.status(500).json({ message: "Erreur widget alarmes" });
    }
};