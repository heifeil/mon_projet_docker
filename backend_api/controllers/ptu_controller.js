const db = require('../config/db');

// 1. Récupérer la liste des points de test
exports.getTests = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM test_PTU');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Erreur récupération tests" });
    }
};

// 2. Simuler l'écriture d'une valeur
exports.writePoint = async (req, res) => {
    const { id, value } = req.body;
    console.log(`[BACnet WRITE] Point ID ${id} -> Valeur: ${value}`);
    res.json({ success: true, message: `Valeur ${value} envoyée` });
};

// 3. Sauvegarder l'AC et mettre à jour l'équipement (VERSION ID)
exports.saveHistory = async (req, res) => {
    // On récupère les données du frontend
    const { equipement_id, nom_equipement, etat_global, detail, comment, user_email } = req.body;
    
    // On stocke l'email (ou un fallback) pour mettre à jour pip_data ensuite
    const utilisateur = user_email || 'Système';

    try {
        // --- ÉTAPE 1 : Sauvegarde dans l'historique ---
        // Conforme à la table history_test_PTU de votre init.sql (pas de colonne user_email ici)
        await db.query(
            `INSERT INTO history_test_PTU 
            (equipement_id, nom_equipement_snapshot, etat_global, detail_json, commentaire) 
            VALUES (?, ?, ?, ?, ?)`,
            [
                equipement_id, 
                nom_equipement, 
                etat_global, 
                JSON.stringify(detail), 
                comment
            ]
        );

        // --- ÉTAPE 2 : Mise à jour de la table principale (pip_data) ---
        // On cible l'équipement via son ID pour mettre à jour son statut, la date et le traceur (utilisateur)
        await db.query(
            `UPDATE pip_data 
             SET TEST_FONCTIONNEMENT = ?, 
                 DERNIERE_MODIF_PAR = ?, 
                 DERNIERE_MODIF_LE = NOW() 
             WHERE id = ?`,
            [
                etat_global, 
                utilisateur, 
                equipement_id
            ]
        );

        // Si tout s'est bien passé, on renvoie un succès (code 201)
        res.status(201).json({ success: true, message: "AC enregistré et statut de l'équipement mis à jour avec succès" });

    } catch (error) {
        console.error("Erreur SQL lors de la sauvegarde AC:", error);
        res.status(500).json({ message: "Erreur lors de la sauvegarde" });
    }
};

// Récupérer l'historique détaillé d'un équipement spécifique
exports.getHistoryByEquipment = async (req, res) => {
    const { equipement_id } = req.params;
    try {
        const [rows] = await db.query(
            'SELECT * FROM history_test_PTU WHERE equipement_id = ? ORDER BY date_test DESC', 
            [equipement_id]
        );
        res.json(rows);
    } catch (error) {
        console.error("Erreur récupération historique détaillé:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};