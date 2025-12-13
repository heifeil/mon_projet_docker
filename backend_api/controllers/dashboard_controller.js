const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    try {
        // 1. Récupérer le DERNIER relevé (Temps réel)
        const [latest] = await db.query(
            'SELECT * FROM indicateurs ORDER BY date_releve DESC LIMIT 1'
        );

        // 2. Récupérer l'historique des 24 dernières heures (Pour le graph)
        // On prend un point toutes les 10-15min environ pour ne pas surcharger le graph si bcp de données
        const [history] = await db.query(`
            SELECT taux_de_com, date_releve 
            FROM indicateurs 
            WHERE date_releve >= NOW() - INTERVAL 24 HOUR 
            ORDER BY date_releve ASC
        `);

        // 3. Calcul de l'évolution (Comparaison avec il y a 24h ou le point le plus vieux)
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