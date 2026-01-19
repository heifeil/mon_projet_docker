const db = require('../config/db');
const ModbusRTU = require("modbus-serial");
const bacnet = require("node-bacnet");

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
    } catch (err) { 
        console.error("Erreur récupération automates:", err.message);
        res.json([]); 
    }
};

exports.getPoints = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT mp.*, pt.nom_affiche 
            FROM monitored_points mp
            LEFT JOIN protocol_types pt ON mp.type_donnee = pt.code_technique
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({message: err.message}); }
};

exports.addPoint = async (req, res) => {
    const { nom, protocole, ip, deviceId, adresse, type, vitesse, cree_par } = req.body;
    try {
        await db.query(
            `INSERT INTO monitored_points (nom, protocole, ip_address, device_id, adresse_variable, type_donnee, vitesse_lecture, cree_par) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nom, protocole, ip, deviceId || 1, adresse, type, vitesse || 5000, cree_par]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({message: err.message}); }
};

exports.getHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM points_history WHERE point_id = ? ORDER BY timestamp DESC LIMIT 50', [id]);
        res.json(rows);
    } catch (err) { res.status(500).json({message: err.message}); }
};

// EXPORT CSV (Ajouté)
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

// --- MOTEUR DE LECTURE ---

const readModbus = async (point) => {
    const client = new ModbusRTU();
    try {
        await client.connectTCP(point.ip_address, { port: 502 });
        client.setID(point.device_id);
        client.setTimeout(2000);
        let val = null;
        const addr = parseInt(point.adresse_variable);
        
        if (point.type_donnee === 'bool') {
            const data = await client.readCoils(addr, 1);
            val = data.data[0]; 
        } else if (point.type_donnee === 'float') {
            const data = await client.readHoldingRegisters(addr, 2);
            val = data.buffer.readFloatBE(0).toFixed(2);
        } else {
            const data = await client.readHoldingRegisters(addr, 1);
            val = data.data[0];
        }
        client.close();
        return val;
    } catch (e) { return null; }
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

exports.startPolling = () => {
    console.log("--- Démarrage du moteur de lecture de variables ---");
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
                if ((now - lastUpdate) >= point.vitesse_lecture) {
                    let value = null;
                    if (point.protocole === 'modbus') value = await readModbus(point);
                    else if (point.protocole === 'bacnet') value = await readBacnet(point);

                    if (value !== null) {
                        let strVal = value.toString();
                        if (value === true) strVal = "ON";
                        if (value === false) strVal = "OFF";
                        await db.query('UPDATE monitored_points SET derniere_valeur = ?, dernier_update = NOW() WHERE id = ?', [strVal, point.id]);
                        await db.query('INSERT INTO points_history (point_id, valeur) VALUES (?, ?)', [point.id, strVal]);
                    }
                }
            }
        } catch (error) {
            console.error("Erreur cycle lecture (BDD indisponible ?):", error.message);
        }
    }, 1000); 
};