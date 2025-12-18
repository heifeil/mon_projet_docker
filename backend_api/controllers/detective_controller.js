const db = require('../config/db');

exports.getDetectiveData = async (req, res) => {
    try {
        // 1. Récupérer les stats par utilisateur
        // CORRECTION : On cible la table 'utilisateurs' au lieu de 'users'
        // CORRECTION : On renomme 'date_creation' en 'created_at' via un alias pour ne pas casser le frontend
        const [usersStats] = await db.query(`
            SELECT 
                u.username, 
                u.email, 
                u.date_creation as created_at,
                (SELECT COUNT(*) FROM pip_data p WHERE p.DERNIERE_MODIF_PAR = u.username) as last_modifs_count,
                (SELECT COUNT(*) FROM detective d WHERE d.modifie_par = u.username) as total_modifs_count
            FROM utilisateurs u
            ORDER BY last_modifs_count DESC
        `);

        // 2. Récupérer l'historique des modifications
        const [history] = await db.query(`
            SELECT * FROM detective ORDER BY date_modif DESC LIMIT 100
        `);

        res.json({
            users: usersStats,
            history: history
        });

    } catch (error) {
        console.error("Erreur Detective:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};