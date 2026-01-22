const db = require('../config/db');

exports.getGroupedAlarms = async (req, res) => {
    try {
        // 1. Récupérer toutes les alarmes avec les infos de la variable associée
        // On trie par date décroissante pour avoir les événements récents en premier
        const [rows] = await db.query(`
            SELECT 
                ma.id as alarm_id,
                ma.type_seuil,
                ma.valeur,
                ma.date_debut,
                ma.date_fin,
                ma.etat,
                mp.id as point_id,
                mp.nom,
                mp.ip_address,
                mp.unite,
                mp.seuil_min,
                mp.seuil_max,
                mp.derniere_valeur
            FROM monitored_alarms ma
            JOIN monitored_points mp ON ma.point_id = mp.id
            ORDER BY ma.date_debut DESC
        `);

        // 2. Regroupement par Variable (Point)
        const grouped = {};

        rows.forEach(row => {
            // Si la variable n'est pas encore dans l'objet, on l'initialise
            if (!grouped[row.point_id]) {
                grouped[row.point_id] = {
                    point_id: row.point_id,
                    nom: row.nom,
                    ip: row.ip_address,
                    unite: row.unite,
                    config: { min: row.seuil_min, max: row.seuil_max },
                    derniere_valeur_live: row.derniere_valeur,
                    is_active: false, // Sera mis à true si une alarme active est trouvée
                    active_alarm_details: null,
                    history: []
                };
            }

            // Ajouter l'alarme à l'historique
            grouped[row.point_id].history.push({
                id: row.alarm_id,
                type: row.type_seuil,
                valeur: row.valeur,
                debut: row.date_debut,
                fin: row.date_fin,
                etat: row.etat
            });

            // Si cette alarme spécifique est ACTIVE, la variable passe en statut global ALARME
            if (row.etat === 'ACTIVE') {
                grouped[row.point_id].is_active = true;
                grouped[row.point_id].active_alarm_details = {
                    type: row.type_seuil,
                    valeur: row.valeur,
                    debut: row.date_debut
                };
            }
        });

        // 3. Convertir l'objet en tableau pour le frontend
        // On trie pour mettre les variables en alarme active tout en haut
        const result = Object.values(grouped).sort((a, b) => {
            if (a.is_active === b.is_active) return 0;
            return a.is_active ? -1 : 1;
        });

        res.json(result);

    } catch (error) {
        console.error("Erreur alarmes groupées:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};