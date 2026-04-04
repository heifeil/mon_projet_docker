const db = require('../config/db');
const ModbusRTU = require('modbus-serial'); // Import de la vraie librairie

// --- 1. CONFIGURATION CRUD CLASSIQUE ---

exports.getPointsByEquipment = async (req, res) => {
    const { equipement_id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM pilotage_modbus WHERE equipement_id = ?', [equipement_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

exports.addPoint = async (req, res) => {
    const { equipement_id, nom, mode, type_donnee, registre } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO pilotage_modbus (equipement_id, nom, mode, type_donnee, registre) VALUES (?, ?, ?, ?, ?)',
            [equipement_id, nom, mode, type_donnee, registre]
        );
        res.json({ success: true, id: result.insertId, message: "Point ajouté" });
    } catch (error) {
        console.error("Erreur ajout point modbus:", error);
        res.status(500).json({ message: "Erreur lors de l'ajout" });
    }
};

exports.getModbusTypes = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT nom_affiche, code_technique FROM protocol_types WHERE protocole = 'modbus'");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// --- 2. VRAIE LECTURE MODBUS TCP ---

exports.readPoint = async (req, res) => {
    const { ip, registre, type_donnee } = req.body;
    const client = new ModbusRTU();

    try {
        // Paramètres de connexion (Port 502 standard Modbus TCP)
        await client.connectTCP(ip, { port: 502 });
        client.setID(1); // ID d'esclave par défaut (souvent 1 ou 255 en TCP)
        client.setTimeout(2000); // Timeout de 2 secondes

        const reg = parseInt(registre, 10);
        let value;

        // Lecture selon le type de donnée configuré
        switch (type_donnee) {
            case 'bool':
                // Fonction 01 : Read Coils
                const resBool = await client.readCoils(reg, 1);
                value = resBool.data[0] ? 'ON' : 'OFF';
                break;

            case 'int16':
                // Fonction 03 : Read Holding Registers
                const resInt = await client.readHoldingRegisters(reg, 1);
                let valInt = resInt.data[0];
                // Conversion en signé (complément à 2)
                if (valInt > 32767) valInt -= 65536; 
                value = valInt;
                break;

            case 'uint16':
                // Fonction 03 : Read Holding Registers
                const resUint = await client.readHoldingRegisters(reg, 1);
                value = resUint.data[0];
                break;

            case 'float':
                // Fonction 03 : Read Holding Registers (2 registres = 32 bits)
                const resFloat = await client.readHoldingRegisters(reg, 2);
                
                // Reconstruction du Float32 (Big Endian standard ABCD)
                const buffer = Buffer.alloc(4);
                buffer.writeUInt16BE(resFloat.data[0], 0); // Mot de poids fort
                buffer.writeUInt16BE(resFloat.data[1], 2); // Mot de poids faible
                value = buffer.readFloatBE(0).toFixed(2); // Arrondi à 2 décimales
                break;

            default:
                // Fallback (uint16 par défaut)
                const resDef = await client.readHoldingRegisters(reg, 1);
                value = resDef.data[0];
        }

        client.close(); // TOUJOURS FERMER LE PORT
        res.json({ success: true, value: value });

    } catch (error) {
        console.error(`[MODBUS LECTURE ERROR] IP: ${ip}, Reg: ${registre} ->`, error.message);
        if (client.isOpen) client.close(); // Fermer en cas d'erreur réseau
        res.status(500).json({ success: false, message: "Échec de lecture" });
    }
};

// --- 3. VRAIE ÉCRITURE MODBUS TCP ---

exports.writePoint = async (req, res) => {
    const { ip, registre, type_donnee, value } = req.body;
    const client = new ModbusRTU();

    try {
        await client.connectTCP(ip, { port: 502 });
        client.setID(1);
        client.setTimeout(2000);

        const reg = parseInt(registre, 10);

        // Écriture selon le type de donnée
        switch (type_donnee) {
            case 'bool':
                // Fonction 05 : Write Single Coil
                // On accepte true, '1', 'ON', 'true'
                const isTrue = ['1', 'true', 'on', 'oui'].includes(String(value).toLowerCase());
                await client.writeCoil(reg, isTrue);
                break;

            case 'int16':
            case 'uint16':
                // Fonction 06 : Write Single Register
                let val16 = parseInt(value, 10);
                if (isNaN(val16)) throw new Error("Valeur invalide");
                // Modbus transporte de l'entier non-signé. Si c'est du négatif, on convertit.
                if (val16 < 0) val16 += 65536; 
                await client.writeRegister(reg, val16);
                break;

            case 'float':
                // Fonction 16 : Write Multiple Registers (pour un Float 32 bits)
                let numValue = parseFloat(value);
                if (isNaN(numValue)) throw new Error("Valeur float invalide");

                // Découpage du Float32 en 2 registres de 16 bits (Big Endian ABCD)
                const buffer = Buffer.alloc(4);
                buffer.writeFloatBE(numValue, 0);
                const word1 = buffer.readUInt16BE(0);
                const word2 = buffer.readUInt16BE(2);
                
                await client.writeRegisters(reg, [word1, word2]);
                break;

            default:
                await client.writeRegister(reg, parseInt(value, 10));
        }

        client.close();
        res.json({ success: true, message: "Commande envoyée" });

    } catch (error) {
        console.error(`[MODBUS ECRITURE ERROR] IP: ${ip}, Reg: ${registre} ->`, error.message);
        if (client.isOpen) client.close();
        res.status(500).json({ success: false, message: "Échec d'écriture" });
    }
};