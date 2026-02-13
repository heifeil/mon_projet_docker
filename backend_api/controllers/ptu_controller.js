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
    // On récupère l'ID, le Nom (pour snapshot), et le reste
    const { equipement_id, nom_equipement, etat_global, detail, comment, user_email } = req.body;
    const utilisateur = user_email || 'Système';

    try {
        // --- ÉTAPE 1 : Sauvegarde dans l'historique ---
        // On utilise 'equipement_id' comme clé étrangère
        // On sauvegarde 'nom_equipement' dans 'nom_equipement_snapshot' juste pour l'affichage futur
        await db.query(
            'INSERT INTO history_test_PTU (equipement_id, nom_equipement_snapshot, etat_global, detail_json, commentaire) VALUES (?, ?, ?, ?, ?)',
            [
                equipement_id, 
                nom_equipement, // Snapshot (texte libre)
                etat_global, 
                JSON.stringify(detail), 
                comment
            ]
        );

        // --- ÉTAPE 2 : Mise à jour de la table principale (pip_data) ---
        // On utilise WHERE id = ? ce qui est infaillible
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

        res.json({ success: true, message: "AC enregistré et statut de l'équipement mis à jour avec succès" });

    } catch (error) {
        console.error("Erreur SQL lors de la sauvegarde AC:", error);
        res.status(500).json({ message: "Erreur lors de la sauvegarde historique" });
    }
};