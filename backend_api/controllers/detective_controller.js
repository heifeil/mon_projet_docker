const db = require('../config/db');

exports.getDetectiveData = async (req, res) => {
    try {
        // --- REQUÊTE 1 : UTILISATEURS + RÔLE (Via Jointure) + COMPTEUR ---
        const [usersStats] = await db.query(`
            SELECT 
                u.id,
                u.username, 
                u.email, 
                r.nom as role, -- ICI : On récupère le nom du rôle via la jointure
                u.date_creation,
                (SELECT COUNT(*) FROM pip_data p WHERE p.DERNIERE_MODIF_PAR = u.email) as modif_count
            FROM utilisateurs u
            LEFT JOIN user_roles r ON u.role_id = r.id -- LA JOINTURE CORRECTIVE
            ORDER BY modif_count DESC
        `);

        // --- REQUÊTE 2 : HISTORIQUE DES TESTS ---
        const [history] = await db.query(`
            SELECT 
                id, 
                NOM_EQUIPEMENT, 
                IP, 
                TEST_FONCTIONNEMENT, 
                DERNIERE_MODIF_PAR, 
                DERNIERE_MODIF_LE
            FROM pip_data
            WHERE TEST_FONCTIONNEMENT IS NOT NULL 
              AND TEST_FONCTIONNEMENT != ''
            ORDER BY DERNIERE_MODIF_LE DESC
            LIMIT 100
        `);

        res.json({
            users: usersStats,
            history: history
        });

    } catch (error) {
        console.error("Erreur Detective:", error);
        res.status(500).json({ message: "Erreur lors de la récupération des données" });
    }
};