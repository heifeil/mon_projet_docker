const db = require('../config/db');
const fs = require('fs');
const csv = require('csv-parser');
const ping = require('ping');

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

// --- 3. TÂCHE AUTOMATIQUE : PING ---
exports.runPingTask = async () => {
    console.log("--- Démarrage de la tâche PING ---");
    
    try {
        const [tables] = await db.query("SHOW TABLES LIKE 'pip_data'");
        if (tables.length === 0) return console.log("Table pip_data inexistante, pas de ping.");

        const [rows] = await db.query('SELECT id, IP FROM pip_data');

        for (const row of rows) {
            if (!row.IP) continue;

            const res = await ping.promise.probe(row.IP, { timeout: 2 });
            const etat = res.alive ? 'OK' : 'NOK';

            await db.query('UPDATE pip_data SET ETAT_COM = ? WHERE id = ?', [etat, row.id]);
        }
        console.log("--- Tâche PING terminée ---");

    } catch (error) {
        console.error("Erreur Cron Ping:", error);
    }
};

// --- 4. DÉCLENCHER LE PING GLOBAL MANUELLEMENT ---
exports.forcePing = async (req, res) => {
    // On répond tout de suite au frontend pour ne pas bloquer l'interface
    res.json({ message: "Scan de ping lancé en arrière-plan..." });
    
    // On lance la tâche lourde
    await exports.runPingTask();
};

// --- 5. PING SUR UN SEUL ÉQUIPEMENT (NOUVEAU) ---
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