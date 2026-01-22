const db = require('../config/db');
const ModbusRTU = require("modbus-serial");
const bacnet = require("node-bacnet");

// Client BacNET global
const bacnetClient = new bacnet({ apduTimeout: 6000 });

// --- CRUD CONFIGURATION (API) ---

exports.getProtocolTypes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM protocol_types ORDER BY protocole, nom_affiche');
        res.json(rows);
    } catch (err) { res.status(500).json({message: err.message}); }
};

exports.getAutomataTargets = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM pip_data WHERE IP IS NOT NULL AND IP != ''`);
        const targets = rows.map(row => ({
            id: row.id,
            NOM_EQUIPEMENT: row.NOM_EQUIPEMENT || row.nom_equipement || 'Équipement Inconnu',
            IP: row.IP || row.ip,
            PROTOCOLE: row.PROTOCOLE || row.protocole || 'modbus', 
            DEVICE_ID: row.DEVICE_ID || row.device_id || 1 
        }));
        targets.sort((a, b) => a.NOM_EQUIPEMENT.localeCompare(b.NOM_EQUIPEMENT));
        res.json(targets);
    } catch (err) { res.json([]); }
};

exports.getPoints = async (req, res) => {
    try {
        // On sélectionne toutes les colonnes, y compris unite, seuil_min, seuil_max
        const [rows] = await db.query(`SELECT mp.*, pt.nom_affiche FROM monitored_points mp LEFT JOIN protocol_types pt ON mp.type_donnee = pt.code_technique`);
        res.json(rows);
    } catch (err) { res.status(500).json({message: err.message}); }
};

exports.addPoint = async (req, res) => {
    // AJOUT : unite, min, max
    const { nom, protocole, ip, deviceId, adresse, type, vitesse, cree_par, unite, min, max } = req.body;
    
    if (!cree_par || cree_par === 'Inconnu' || cree_par.trim() === '') {
        return res.status(401).json({ message: "Action non autorisée." });
    }
    
    // Conversion des chaînes vides en NULL pour SQL
    const valMin = (min === '' || min === undefined) ? null : min;
    const valMax = (max === '' || max === undefined) ? null : max;

    try {
        await db.query(
            `INSERT INTO monitored_points 
            (nom, protocole, ip_address, device_id, adresse_variable, type_donnee, vitesse_lecture, cree_par, unite, seuil_min, seuil_max) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nom, protocole, ip, deviceId || 1, adresse, type, vitesse || 5000, cree_par, unite || '', valMin, valMax]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({message: err.message}); }
};

exports.getHistory = async (req, res) => {
    const { id } = req.params;
    const { range } = req.query; 

    try {
        let query = 'SELECT * FROM points_history WHERE point_id = ?';
        let params = [id];

        if (range === '15m') query += ' AND timestamp >= NOW() - INTERVAL 15 MINUTE';
        else if (range === '1h') query += ' AND timestamp >= NOW() - INTERVAL 1 HOUR';
        else if (range === '8h') query += ' AND timestamp >= NOW() - INTERVAL 8 HOUR';
        else if (range === '24h') query += ' AND timestamp >= NOW() - INTERVAL 24 HOUR';
        
        query += ' ORDER BY timestamp ASC';

        if (range === 'all') query += ' LIMIT 2000';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) { res.status(500).json({message: err.message}); }
};

exports.exportHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const [pointInfo] = await db.query('SELECT nom FROM monitored_points WHERE id = ?', [id]);
        if (pointInfo.length === 0) return res.status(404).send("Variable introuvable");
        const nomVariable = pointInfo[0].nom.replace(/[^a-z0-9]/gi, '_'); 
        const [rows] = await db.query('SELECT valeur, timestamp FROM points_history WHERE point_id = ? ORDER BY timestamp DESC', [id]);
        let csvContent = "Date;Heure;Valeur\n";
        rows.forEach(row => {
            const dateObj = new Date(row.timestamp);
            const valStr = row.valeur.replace('.', ','); 
            csvContent += `${dateObj.toLocaleDateString('fr-FR')};${dateObj.toLocaleTimeString('fr-FR')};${valStr}\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="historique_${nomVariable}.csv"`);
        res.status(200).send(csvContent);
    } catch (err) { res.status(500).send(err.message); }
};

exports.deletePoint = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM monitored_points WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({message: err.message}); }
};

// --- MOTEUR DE LECTURE (POLLING) ---

const readModbus = async (point) => {
    const client = new ModbusRTU();
    try {
        await client.connectTCP(point.ip_address, { port: 502 });
        client.setID(parseInt(point.device_id));
        client.setTimeout(2000);
        let val = null;
        const addr = parseInt(point.adresse_variable);
        const type = point.type_donnee.toLowerCase();

        if (type === 'bool' || type === 'boolean' || type === 'coil') {
            try {
                const data = await client.readCoils(addr, 1);
                val = data.data[0]; 
            } catch (errCoil) {
                const data = await client.readDiscreteInputs(addr, 1);
                val = data.data[0];
            }
        } else if (type === 'float' || type === 'float32' || type === 'real') {
            const data = await client.readHoldingRegisters(addr, 2);
            val = data.buffer.readFloatBE(0);
            val = parseFloat(val.toFixed(2));
        } else if (type === 'int16' || type === 'int') {
             const data = await client.readHoldingRegisters(addr, 1);
             val = data.buffer.readInt16BE(0); 
        } else {
            const data = await client.readHoldingRegisters(addr, 1);
            val = data.data[0];
        }
        client.close();
        return val;
    } catch (e) {
        console.error(`[ERREUR MODBUS] ${point.nom} (${point.ip_address}):`, e.message);
        return null;
    }
};

const readBacnet = (point) => {
    return new Promise((resolve) => {
        const objectType = point.bacnet_object_id !== null ? point.bacnet_object_id : 0;
        const instance = parseInt(point.adresse_variable);
        bacnetClient.readProperty(point.ip_address, { type: objectType, instance: instance }, 85, (err, value) => {
            if (err) resolve(null);
            else resolve(value && value.values && value.values[0] ? value.values[0].value : null);
        });
    });
};

// --- LOGIQUE D'ALARME ---
const checkThresholds = async (point, value) => {
    // Si pas de seuils configurés, on sort
    if (point.seuil_min === null && point.seuil_max === null) return;

    const val = parseFloat(value);
    if (isNaN(val)) return; // On ne traite pas les booléens (ON/OFF)

    let alarmType = null;
    if (point.seuil_min !== null && val < point.seuil_min) alarmType = 'MIN';
    if (point.seuil_max !== null && val > point.seuil_max) alarmType = 'MAX';

    // Vérifier si une alarme est DÉJÀ active pour ce point
    const [activeAlarms] = await db.query(
        "SELECT id, type_seuil FROM monitored_alarms WHERE point_id = ? AND etat = 'ACTIVE'", 
        [point.id]
    );

    // CAS A : Une anomalie est détectée
    if (alarmType) {
        // Si aucune alarme active, ou si le type d'alarme a changé (ex: passe de MIN à MAX)
        if (activeAlarms.length === 0 || activeAlarms[0].type_seuil !== alarmType) {
            // Si une autre alarme existait (ex: MIN alors qu'on est maintenant MAX), on la ferme
            if (activeAlarms.length > 0) {
                await db.query("UPDATE monitored_alarms SET etat = 'RESOLVED', date_fin = NOW() WHERE id = ?", [activeAlarms[0].id]);
            }
            // Création de la nouvelle alarme
            console.log(`[ALARME] ${point.nom} dépassement ${alarmType} (Val: ${val})`);
            await db.query(
                "INSERT INTO monitored_alarms (point_id, type_seuil, valeur, etat) VALUES (?, ?, ?, 'ACTIVE')",
                [point.id, alarmType, val]
            );
        }
    } 
    // CAS B : Retour à la normale
    else {
        if (activeAlarms.length > 0) {
            console.log(`[ALARME] ${point.nom} retour à la normale.`);
            await db.query("UPDATE monitored_alarms SET etat = 'RESOLVED', date_fin = NOW() WHERE id = ?", [activeAlarms[0].id]);
        }
    }
};

exports.startPolling = () => {
    console.log("--- Démarrage du moteur de lecture de variables + Alarmes ---");
    
    setInterval(async () => {
        try {
            const [points] = await db.query(`
                SELECT mp.*, pt.nb_registres, pt.bacnet_object_id 
                FROM monitored_points mp
                LEFT JOIN protocol_types pt ON mp.type_donnee = pt.code_technique
            `);
            const now = new Date();

            for (const point of points) {
                const lastUpdate = point.dernier_update ? new Date(point.dernier_update) : new Date(0);
                const diff = now - lastUpdate;

                if (diff >= point.vitesse_lecture) {
                    let value = null;

                    if (point.protocole === 'modbus') {
                        value = await readModbus(point);
                    } else if (point.protocole === 'bacnet') {
                        value = await readBacnet(point);
                    }

                    if (value !== null) {
                        // 1. Vérification des Seuils (Alarmes)
                        await checkThresholds(point, value);

                        // 2. Formatage & Enregistrement
                        let strVal = value.toString();
                        
                        const type = point.type_donnee ? point.type_donnee.toLowerCase() : '';
                        const isBoolean = type === 'bool' || type === 'boolean' || type === 'coil';

                        if (isBoolean) {
                            if (value === true || value === 1) strVal = "ON";
                            if (value === false || value === 0) strVal = "OFF";
                        }

                        await db.query('UPDATE monitored_points SET derniere_valeur = ?, dernier_update = NOW() WHERE id = ?', [strVal, point.id]);
                        await db.query('INSERT INTO points_history (point_id, valeur) VALUES (?, ?)', [point.id, strVal]);
                    }
                }
            }
        } catch (error) {
            console.error("Erreur cycle lecture :", error.message);
        }
    }, 1000); 
};