const db = require('../config/db');
const fs = require('fs');
const csv = require('csv-parser');
const ping = require('ping');
const si = require('systeminformation'); 

const CSV_PATH = '/app/csv_files/pip.csv'; // Chemin dans le conteneur

// --- 1. IMPORT DU CSV ET CRÉATION DE LA TABLE ---
exports.importCsvData = async (req, res) => {
    const results = [];
    const headers = [];

    console.log(`[DEBUG] Recherche du fichier CSV ici : ${CSV_PATH}`);

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`[ERREUR] Le fichier n'existe pas à l'emplacement : ${CSV_PATH}`);
        try {
            const files = fs.readdirSync('/app/csv_files');
            console.log('[DEBUG] Contenu du dossier /app/csv_files :', files);
        } catch (e) {
            console.log('[DEBUG] Le dossier /app/csv_files est inaccessible ou vide.');
        }
        return res ? res.status(404).json({ message: "Fichier pip.csv introuvable" }) : false;
    }

    fs.createReadStream(CSV_PATH)
        .pipe(csv({ separator: ';' })) 
        .on('headers', (headerList) => {
            headerList.forEach(h => headers.push(h));
        })
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            if (headers.length === 0) return res && res.status(400).json({ message: "CSV vide" });

            try {
                await db.query('DROP TABLE IF EXISTS pip_data');

                const columnsSql = headers.map(h => {
                    const cleanHeader = h.trim().replace(/\s+/g, '_'); 
                    return `\`${cleanHeader}\` VARCHAR(255)`;
                }).join(', ');

                const createTableSql = `CREATE TABLE pip_data (id INT AUTO_INCREMENT PRIMARY KEY, ${columnsSql})`;
                await db.query(createTableSql);

                for (const row of results) {
                    const values = headers.map(h => row[h]);
                    const placeholders = headers.map(() => '?').join(', ');
                    const cleanHeaders = headers.map(h => `\`${h.trim().replace(/\s+/g, '_')}\``).join(', ');
                    
                    await db.query(`INSERT INTO pip_data (${cleanHeaders}) VALUES (${placeholders})`, values);
                }

                console.log("Import CSV terminé avec succès.");
                if (res) res.json({ message: "Données importées et table recréée" });

            } catch (error) {
                console.error("Erreur import CSV:", error);
                if (res) res.status(500).json({ message: "Erreur lors de l'import" });
            }
        });
};

// --- 2. RÉCUPÉRER LES DONNÉES (Pour le Frontend) ---
exports.getPipData = async (req, res) => {
    try {
        const [tables] = await db.query("SHOW TABLES LIKE 'pip_data'");
        if (tables.length === 0) return res.json({ columns: [], rows: [] });

        const [rows] = await db.query('SELECT * FROM pip_data');
        if (rows.length === 0) return res.json({ columns: [], rows: [] });

        const columns = Object.keys(rows[0]).filter(k => k !== 'id');
        res.json({ columns, rows });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- 3. TÂCHE AUTOMATIQUE : PING & INDICATEURS & ALARMES ---
exports.runPingTask = async () => {
    console.log("--- Démarrage de la tâche PING & ALARMES ---");
    
    try {
        const [tables] = await db.query("SHOW TABLES LIKE 'pip_data'");
        if (tables.length === 0) return console.log("Table pip_data inexistante, pas de ping.");

        // MODIF : On récupère aussi NOM, LOCALISATION et ETAT_COM pour les alarmes
        const [rows] = await db.query('SELECT id, NOM_EQUIPEMENT, IP, LOCALISATION, ETAT_COM FROM pip_data');
        if (rows.length === 0) return;

        let totalEquipements = 0;
        let nbReponseOK = 0;
        let sommeLatence = 0;
        let sommePertePaquets = 0;

        for (const row of rows) {
            if (!row.IP) continue;
            totalEquipements++;

            const oldEtat = row.ETAT_COM; // État avant le ping

            // Ping
            const res = await ping.promise.probe(row.IP, { timeout: 2 });
            const newEtat = res.alive ? 'OK' : 'NOK';
            
            // --- LOGIQUE ALARME ---
            // On déclenche si l'état change et que l'ancien état existait (non null)
            if (oldEtat && oldEtat !== newEtat) {
                let messageAlarme = '';
                
                if (oldEtat === 'OK' && newEtat === 'NOK') {
                    messageAlarme = 'Alarme';
                } else if (oldEtat === 'NOK' && newEtat === 'OK') {
                    messageAlarme = 'Retour à la normale';
                }

                if (messageAlarme) {
                    await db.query(
                        `INSERT INTO alarmes (nom, IP, localisation, etat) VALUES (?, ?, ?, ?)`,
                        [row.NOM_EQUIPEMENT, row.IP, row.LOCALISATION, messageAlarme]
                    );
                    console.log(`[ALARME] ${row.IP} : ${messageAlarme}`);
                }
            }
            // ----------------------

            // Mise à jour BDD PIP_DATA
            await db.query('UPDATE pip_data SET ETAT_COM = ? WHERE id = ?', [newEtat, row.id]);

            // Stats
            if (res.alive) {
                nbReponseOK++;
                const latence = parseFloat(res.time) || 0;
                sommeLatence += latence;
            }
            const perte = parseFloat(res.packetLoss) || 0;
            sommePertePaquets += perte;
        }

        // --- CALCULS INDICATEURS ---
        const tauxCom = totalEquipements > 0 ? (nbReponseOK / totalEquipements) * 100 : 0;
        const delaiMoyen = nbReponseOK > 0 ? Math.round(sommeLatence / nbReponseOK) : 0;
        const moyennePerte = totalEquipements > 0 ? (sommePertePaquets / totalEquipements) : 0;

        // Infos Système
        const cpuLoad = await si.currentLoad();
        const networkStats = await si.networkStats();

        const utilisationCpu = cpuLoad.currentLoad || 0;
        const netStat = Array.isArray(networkStats) && networkStats.length > 0 ? networkStats[0] : {};
        
        const debitMaxEstime = 10 * 1024 * 1024; // 10 Mo/s pour test
        const debitActuel = netStat.tx_sec || 0;
        let utilisationBP = (debitActuel / debitMaxEstime) * 100;
        if(utilisationBP > 100) utilisationBP = 100;

        // Enregistrement Indicateurs
        const insertQuery = `
            INSERT INTO indicateurs 
            (taux_de_com, delai_rep, perte_paquets, utilisation_bande_passante, utilisation_cpu) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        await db.query(insertQuery, [
            tauxCom.toFixed(2),      
            delaiMoyen,              
            moyennePerte.toFixed(2), 
            utilisationBP.toFixed(2),
            utilisationCpu.toFixed(2)
        ]);

        console.log(`[STATS] Com: ${tauxCom.toFixed(1)}% | Latence: ${delaiMoyen}ms | CPU: ${utilisationCpu.toFixed(1)}%`);
        console.log("--- Tâche PING terminée ---");

    } catch (error) {
        console.error("Erreur Cron Ping/Stats:", error);
    }
};

// --- 4. DÉCLENCHER LE PING GLOBAL MANUELLEMENT ---
exports.forcePing = async (req, res) => {
    res.json({ message: "Scan de ping lancé en arrière-plan..." });
    await exports.runPingTask();
};

// --- 5. PING SUR UN SEUL ÉQUIPEMENT ---
exports.pingSingleDevice = async (req, res) => {
    const { id, ip } = req.body;

    if (!id || !ip) {
        return res.status(400).json({ success: false, message: "ID ou IP manquant" });
    }

    try {
        // 1. Récupérer l'ancien état pour comparer
        const [rows] = await db.query('SELECT NOM_EQUIPEMENT, LOCALISATION, ETAT_COM FROM pip_data WHERE id = ?', [id]);
        
        let oldEtat = null;
        let nomEquip = 'Inconnu';
        let loc = 'Inconnue';

        if (rows.length > 0) {
            oldEtat = rows[0].ETAT_COM;
            nomEquip = rows[0].NOM_EQUIPEMENT;
            loc = rows[0].LOCALISATION;
        }

        // 2. Ping
        const result = await ping.promise.probe(ip, { timeout: 2 });
        const newEtat = result.alive ? 'OK' : 'NOK';

        // 3. Détection Alarme (Même logique que le Cron)
        if (oldEtat && oldEtat !== newEtat) {
             let messageAlarme = '';
             if (oldEtat === 'OK' && newEtat === 'NOK') messageAlarme = 'Alarme';
             else if (oldEtat === 'NOK' && newEtat === 'OK') messageAlarme = 'Retour à la normale';

             if (messageAlarme) {
                 await db.query(
                    `INSERT INTO alarmes (nom, IP, localisation, etat) VALUES (?, ?, ?, ?)`,
                    [nomEquip, ip, loc, messageAlarme]
                 );
                 console.log(`[ALARME UNITAIRE] ${ip} : ${messageAlarme}`);
             }
        }

        // 4. Update PIP_DATA
        await db.query('UPDATE pip_data SET ETAT_COM = ? WHERE id = ?', [newEtat, id]);

        res.json({ success: true, id: id, newStatus: newEtat });

    } catch (error) {
        console.error("Erreur Ping Unitaire:", error);
        res.status(500).json({ success: false, message: "Erreur lors du ping" });
    }
};