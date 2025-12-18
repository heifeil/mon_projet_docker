const db = require('../config/db');

exports.getAlarmes = async (req, res) => {
    try {
        // On récupère tout, trié du plus récent au plus vieux
        const [rows] = await db.query('SELECT * FROM alarmes ORDER BY date_heure DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};