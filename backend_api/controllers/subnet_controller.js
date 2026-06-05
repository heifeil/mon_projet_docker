const db = require('../config/db');
const https = require('https');
const ping = require('ping'); 
require('dotenv').config(); 

// --- HELPER 0 : Fonction de Ping ICMP ---
async function pingDevice(ip) {
    try {
        let res = await ping.promise.probe(ip, { timeout: 2 });
        return res.alive; 
    } catch (err) {
        return false;
    }
}

// --- HELPER 1 : Fonction pour tester l'URL (Requête GET) ---
function testUrl(url) {
    return new Promise((resolve, reject) => {
        const user = process.env.REST_USER || '';
        const pass = process.env.REST_PASS || '';

        const authBase64 = Buffer.from(`${user}:${pass}`).toString('base64');

        const req = https.get(url, { 
            rejectUnauthorized: false,
            timeout: 3000,
            headers: {
                'Authorization': `Basic ${authBase64}`
            }
        }, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                resolve(true); 
            } else {
                reject(new Error(`Status ${res.statusCode}`)); 
            }
        });
        
        req.on('error', (err) => reject(err));
        req.on('timeout', () => { 
            req.destroy(); 
            reject(new Error('Timeout')); 
        });
    });
}

// --- NOUVEAU HELPER 1.5 : Fonction pour déclencher une action (Requête POST) ---
function postUrl(url) {
    return new Promise((resolve, reject) => {
        const user = process.env.REST_USER || '';
        const pass = process.env.REST_PASS || '';
        const authBase64 = Buffer.from(`${user}:${pass}`).toString('base64');

        // Notez l'utilisation de https.request au lieu de https.get pour pouvoir forcer la méthode POST
        const options = {
            method: 'POST',
            rejectUnauthorized: false,
            timeout: 3000,
            headers: {
                'Authorization': `Basic ${authBase64}`,
                'Content-Length': 0 // Indique à l'automate qu'on envoie juste un ordre vide
            }
        };

        const req = https.request(url, options, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                resolve(true); 
            } else {
                reject(new Error(`Status ${res.statusCode}`)); 
            }
        });
        
        req.on('error', (err) => reject(err));
        req.on('timeout', () => { 
            req.destroy(); 
            reject(new Error('Timeout')); 
        });

        // Crucial pour le POST : On clôture et envoie la requête
        req.end();
    });
}

// --- HELPER 2 : Fonction pour lire un fichier JSON en REST (Requête GET) ---
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const user = process.env.REST_USER || '';
        const pass = process.env.REST_PASS || '';
        const authBase64 = Buffer.from(`${user}:${pass}`).toString('base64');

        const req = https.get(url, { 
            rejectUnauthorized: false, 
            timeout: 5000, 
            headers: { 'Authorization': `Basic ${authBase64}` }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error("Erreur de parsing JSON"));
                    }
                } else {
                    reject(new Error(`Status ${res.statusCode}`)); 
                }
            });
        });
        
        req.on('error', (err) => reject(err));
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

// --- HELPER 3 : Logique de version V1/V2 ---
async function getRestVersion(ip) {
    if (!ip) return null;
    try {
        await testUrl(`https://${ip}/api/rest/v1/protocols/bacnet`);
        return '1';
    } catch (err1) {
        try {
            await testUrl(`https://${ip}/api/rest/`);
            return '2';
        } catch (err2) {
            console.log(`[Subnet] Echec API REST pour ${ip} : ${err2.message}`);
            return null;
        }
    }
}

// --- HELPER 4 : Pause (pour attendre la fin du Discovery) ---
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// --- CONTROLEURS ---

exports.getSubnetData = async (req, res) => {
    try {
        const query = `
            SELECT 
                s.*, 
                p.NOM_EQUIPEMENT 
            FROM SCAN_SUBNET s
            JOIN pip_data p ON s.equipement_id = p.id
            ORDER BY s.date_scan DESC
        `;
        
        const [rows] = await db.query(query);
        res.json({ success: true, rows: rows });
    } catch (error) {
        console.error("Erreur récupération Subnet:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

exports.amorceSubnet = async (req, res) => {
    try {
        await db.query('DELETE FROM SCAN_SUBNET');

        const insertQuery = `
            INSERT INTO SCAN_SUBNET (equipement_id)
            SELECT p1.id 
            FROM pip_data p1
            WHERE p1.PROTOCOLE = 'BACNET IP' 
              AND p1.NOM_EQUIPEMENT LIKE '%PTU%'
              AND EXISTS (
                  SELECT 1 
                  FROM pip_data p2 
                  WHERE p2.IP = p1.IP 
                    AND UPPER(p2.PROTOCOLE) = 'SUBNET'
              )
        `;
        const [insertResult] = await db.query(insertQuery);

        const [rows] = await db.query(`
            SELECT s.id, p.IP 
            FROM SCAN_SUBNET s
            JOIN pip_data p ON s.equipement_id = p.id
        `);

        const checkPromises = rows.map(async (row) => {
            const version = await getRestVersion(row.IP);
            if (version) {
                await db.query('UPDATE SCAN_SUBNET SET Version_REST = ? WHERE id = ?', [version, row.id]);
            }
        });

        await Promise.all(checkPromises);

        res.json({
            success: true,
            message: "Amorce terminée.",
            lignesAjoutees: insertResult.affectedRows
        });

    } catch (error) {
        console.error("Erreur amorce Subnet:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de l'amorce" });
    }
};

exports.scanSubnet = async (req, res) => {
    try {
        const [targets] = await db.query(`
            SELECT s.id, s.Version_REST, p.IP 
            FROM SCAN_SUBNET s
            JOIN pip_data p ON s.equipement_id = p.id
            WHERE s.Version_REST IS NOT NULL
        `);

        const ALL_COLS = [
            'DALI1', 'DALI2', 'DALI3', 'DALI4',
            'BLIND1', 'BLIND2', 'BLIND3', 'BLIND4',
            'MC1', 'MC2', 'MC3', 'MC4', 'MC5'
        ];

        const scanPromises = targets.map(async (target) => {
            const ip = target.IP;
            const version = target.Version_REST;
            
            console.log(`\n=========================================`);
            console.log(`[SCAN] Analyse pour IP: ${ip} (Version REST: ${version})`);
            console.log(`=========================================`);

            // --- 0. LANCEMENT DU DISCOVERY ---
            try {
                let discoveryUrl = '';
                if (version === '1') {
                    discoveryUrl = `https://${ip}/api/rest/v1/info/extension-management/discovery/start`;
                } else if (version === '2') {
                    discoveryUrl = `https://${ip}/api/rest/v2/services/subnet/discovery/start`;
                }
                
                console.log(`[Discovery] Lancement de la découverte sur ${ip}...`);
                
                // Utilisation de la nouvelle fonction postUrl qui fait un vrai POST
                await postUrl(discoveryUrl); 
                
                // On attend 2 secondes que l'automate trouve ses équipements physiques
                await delay(2000); 
                console.log(`[Discovery] Terminé pour ${ip}.`);
            } catch (err) {
                console.log(`[Discovery] Erreur (ou timeout) lors du lancement sur ${ip} :`, err.message);
            }

            // --- 1. LECTURE DU PIP (Attendu) ---
            const [pipRows] = await db.query(`SELECT TYPE_EQUIPEMENT, NUMERO FROM pip_data WHERE IP = ? AND UPPER(PROTOCOLE) = 'SUBNET'`, [ip]);
            const expected = {};
            
            pipRows.forEach(row => {
                const typeEquip = row.TYPE_EQUIPEMENT || '';
                const num = row.NUMERO; 
                if (!num) return;

                const tqLower = typeEquip.toLowerCase();
                let type = '';
                
                if (tqLower.includes('light') || tqLower.includes('dali')) type = 'DALI';
                else if (tqLower.includes('blind')) type = 'BLIND';
                else if (tqLower.includes('multi') || tqLower.includes('sensor')) type = 'MC';

                if (type) expected[`${type}${num}`] = typeEquip; 
            });

            // --- 2. LECTURE REST (Réel) ---
            const actual = {};
            let isComOk = false;

            try {
                let restData = [];
                let rawResponse = null;

                if (version === '1') {
                    const url = `https://${ip}/api/rest/v1/info/extension-management/extensions?$expand=*($levels=3)&encode=json`;
                    rawResponse = await fetchJson(url);
                    restData = Array.isArray(rawResponse) ? rawResponse : (rawResponse.body || rawResponse.items || []);
                } else if (version === '2') {
                    const url = `https://${ip}/api/rest/v2/services/subnet/devices?$select=*($select=modules($select=*($select=key,module-type,name,discovered-module-type)))`;
                    rawResponse = await fetchJson(url);
                    if (rawResponse.items && rawResponse.items.length > 0) {
                        restData = rawResponse.items[0].modules || [];
                    } else {
                        restData = rawResponse.modules || [];
                    }
                }

                if (!Array.isArray(restData)) {
                    restData = [];
                }

                isComOk = true;

                for (let i = 0; i < restData.length; i++) {
                    let mod = restData[i];
                    const modelTypeHex = mod.modelType || mod['module-type'] || mod.modelTypeHex || mod.discoveredModuleType;
                    
                    let modelNumber = mod.modelNumber;
                    if (modelNumber === undefined) modelNumber = mod['model-number'];
                    
                    let position = -1;
                    if (mod.index !== undefined && mod.index !== null) {
                        position = parseInt(mod.index) + 1; 
                    } else if (mod.key !== undefined && mod.key !== null) {
                        position = parseInt(mod.key); 
                    }

                    if (modelTypeHex && modelNumber !== undefined) {
                        const [templateRows] = await db.query(
                            `SELECT extensionName FROM module_extension_template WHERE modelTypeHex = ? AND modelNumber = ? LIMIT 1`,
                            [modelTypeHex, modelNumber]
                        );

                        if (templateRows.length > 0) {
                            const extName = templateRows[0].extensionName;
                            
                            // LE PREMIER ÉQUIPEMENT EST L'AUTOMATE
                            if (i === 0) {
                                actual['EQUIPEMENT'] = extName;
                            } else {
                                const extLower = extName.toLowerCase();
                                let type = '';
                                
                                if (extLower.includes('light') || extLower.includes('dali')) type = 'DALI';
                                else if (extLower.includes('blind')) type = 'BLIND';
                                else if (extLower.includes('multi') || extLower.includes('sensor')) type = 'MC';

                                if (type && position > 0) {
                                    actual[`${type}${position}`] = extName;
                                }
                            }
                        }
                    }
                }
                
                console.log(`[Pratique] Équipements réels traduits :`, actual);

            } catch (err) {
                console.log(`[Erreur REST] Impossible de lire pour ${ip}:`, err.message);
                isComOk = false;
            }

            // --- 3. COMPARAISON ET FORMATAGE BDD ---
            const updateFields = {};
            
            if (isComOk) {
                updateFields['EQUIPEMENT'] = actual['EQUIPEMENT'] || 'Inconnu';
            } else {
                updateFields['EQUIPEMENT'] = 'Erreur REST';
            }

            ALL_COLS.forEach(col => {
                const expName = expected[col];
                const actName = actual[col];

                if (expName && actName) {
                    updateFields[col] = 'Fonctionnel';
                } else if (expName && !actName) {
                    updateFields[col] = 'Manque';
                } else if (!expName && actName) {
                    updateFields[col] = 'En trop';
                } else {
                    updateFields[col] = 'Non attendu';
                }
            });

            const setClause = Object.keys(updateFields).map(k => `${k} = ?`).join(', ');
            const values = Object.values(updateFields);
            values.push(target.id); 

            await db.query(`UPDATE SCAN_SUBNET SET ${setClause} WHERE id = ?`, values);
        });

        await Promise.all(scanPromises);
        res.json({ success: true, message: "Scan et comparaison terminés !" });

    } catch (error) {
        console.error("Erreur globale Scan Subnet:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors du scan" });
    }
};