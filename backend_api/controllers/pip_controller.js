const db = require('../config/db');
const fs = require('fs');
const csv = require('csv-parser');
const ping = require('ping');
const si = require('systeminformation'); // IMPORT NÉCESSAIRE

const CSV_PATH = '/app/csv_files/pip.csv'; // Chemin dans le conteneur

// --- 1. IMPORT DU CSV ET CRÉATION DE LA TABLE ---
exports.importCsvData = async (req, res) => {
    const results = [];
    const headers = [];

    console.log(`[DEBUG] Recherche du fichier CSV ici : ${CSV_PATH}`);

    // Lecture du fichier
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
        .pipe(csv({ separator: ';' })) // SEPARATEUR POINT-VIRGULE
        .on('headers', (headerList) => {
            headerList.forEach(h => headers.push(h));
        })
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            if (headers.length === 0) return res && res.status(400).json({ message: "CSV vide" });

            try {
                // A. Supprimer l'ancienne table si elle existe
                await db.query('DROP TABLE IF EXISTS pip_data');

                // B. Construire la requête CREATE TABLE dynamiquement
                // On remplace les espaces par des underscores pour les noms de colonnes SQL
                const columnsSql = headers.map(h => {
                    const cleanHeader = h.trim().replace(/\s+/g, '_'); 
                    return `\`${cleanHeader}\` VARCHAR(255)`;
                }).join(', ');

                // On ajoute une colonne ID technique
                const createTableSql = `CREATE TABLE pip_data (id INT AUTO_INCREMENT PRIMARY KEY, ${columnsSql})`;
                await db.query(createTableSql);

                // C. Insérer les données
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

// --- 3. TÂCHE AUTOMATIQUE : PING & INDICATEURS ---
exports.runPingTask = async () => {
    console.log("--- Démarrage de la tâche PING & INDICATEURS ---");
    
    try {
        const [tables] = await db.query("SHOW TABLES LIKE 'pip_data'");
        if (tables.length === 0) return console.log("Table pip_data inexistante, pas de ping.");

        const [rows] = await db.query('SELECT id, IP FROM pip_data');
        if (rows.length === 0) return;

        // VARIABLES POUR LES STATISTIQUES
        let totalEquipements = 0;
        let nbReponseOK = 0;
        let sommeLatence = 0;
        let sommePertePaquets = 0;

        // 1. BOUCLE DE PING
        for (const row of rows) {
            if (!row.IP) continue;
            totalEquipements++;

            // On ping (timeout 2s)
            // ping.promise.probe retourne un objet avec : alive (bool), time (ms), packetLoss (%)
            const res = await ping.promise.probe(row.IP, { timeout: 2 });
            
            const etat = res.alive ? 'OK' : 'NOK';
            
            // Mise à jour BDD PIP_DATA
            await db.query('UPDATE pip_data SET ETAT_COM = ? WHERE id = ?', [etat, row.id]);

            // Accumulation des stats
            if (res.alive) {
                nbReponseOK++;
                // res.time peut être 'unknown', on s'assure que c'est un nombre
                const latence = parseFloat(res.time) || 0;
                sommeLatence += latence;
            }

            // res.packetLoss est une string "0.000", on convertit
            const perte = parseFloat(res.packetLoss) || 0;
            sommePertePaquets += perte;
        }

        // 2. CALCULS DES RÉSULTATS
        const tauxCom = totalEquipements > 0 ? (nbReponseOK / totalEquipements) * 100 : 0;
        const delaiMoyen = nbReponseOK > 0 ? Math.round(sommeLatence / nbReponseOK) : 0;
        const moyennePerte = totalEquipements > 0 ? (sommePertePaquets / totalEquipements) : 0;

        // 3. RÉCUPÉRATION DES INFOS SYSTÈME (CPU / RÉSEAU)
        // Note: Dans Docker, cela remonte les stats du conteneur, ce qui est une bonne approximation
        const cpuLoad = await si.currentLoad();
        const networkStats = await si.networkStats();

        const utilisationCpu = cpuLoad.currentLoad || 0; // Pourcentage CPU actuel
        
        // Pour la bande passante, on va faire une estimation basée sur le trafic TX (transmission) en octets/sec
        // Si networkStats est un tableau (plusieurs interfaces), on prend la première (eth0)
        const netStat = Array.isArray(networkStats) && networkStats.length > 0 ? networkStats[0] : {};
        
        // Estimation arbitraire pour l'exercice : 100% = 10Mo/s (soit 10*1024*1024 octets)
        const debitMaxEstime = 10 * 1024 * 1024; 
        const debitActuel = netStat.tx_sec || 0;
        let utilisationBP = (debitActuel / debitMaxEstime) * 100;
        if(utilisationBP > 100) utilisationBP = 100; // Cap à 100

        // 4. ENREGISTREMENT DANS LA TABLE INDICATEURS
        const insertQuery = `
            INSERT INTO indicateurs 
            (taux_de_com, delai_rep, perte_paquets, utilisation_bande_passante, utilisation_cpu) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        await db.query(insertQuery, [
            tauxCom.toFixed(2),      // Float (2 décimales)
            delaiMoyen,              // Int
            moyennePerte.toFixed(2), // Float
            utilisationBP.toFixed(2),// Float
            utilisationCpu.toFixed(2)// Float
        ]);

        console.log(`[STATS] Com: ${tauxCom.toFixed(1)}% | Latence: ${delaiMoyen}ms | CPU: ${utilisationCpu.toFixed(1)}%`);
        console.log("--- Tâche PING terminée ---");

    } catch (error) {
        console.error("Erreur Cron Ping/Stats:", error);
    }
};

// --- 4. DÉCLENCHER LE PING GLOBAL MANUELLEMENT ---
exports.forcePing = async (req, res) => {
    // On répond tout de suite au frontend pour ne pas bloquer l'interface
    res.json({ message: "Scan de ping lancé en arrière-plan..." });
    
    // On lance la tâche lourde
    await exports.runPingTask();
};

// --- 5. PING SUR UN SEUL ÉQUIPEMENT ---
exports.pingSingleDevice = async (req, res) => {
    const { id, ip } = req.body;

    if (!id || !ip) {
        return res.status(400).json({ success: false, message: "ID ou IP manquant" });
    }

    try {
        // 1. On effectue le ping (timeout 2s)
        const result = await ping.promise.probe(ip, { timeout: 2 });
        const etat = result.alive ? 'OK' : 'NOK';

        // 2. On met à jour la base de données pour cette ligne spécifique
        await db.query('UPDATE pip_data SET ETAT_COM = ? WHERE id = ?', [etat, id]);

        // 3. On renvoie le nouvel état au frontend
        res.json({ success: true, id: id, newStatus: etat });

    } catch (error) {
        console.error("Erreur Ping Unitaire:", error);
        res.status(500).json({ success: false, message: "Erreur lors du ping" });
    }
};