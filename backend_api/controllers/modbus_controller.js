const db = require('../config/db');
const ModbusRTU = require('modbus-serial');

// --- 1. CONFIGURATION CRUD ---
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

// --- 2. LECTURE MODBUS TCP (Version Finale Standard ABCD) ---
exports.readPoint = async (req, res) => {
    const { ip, registre, type_donnee } = req.body;
    const client = new ModbusRTU();

    try {
        await client.connectTCP(ip, { port: 502 });
        client.setID(1);
        client.setTimeout(2000);

        const reg = parseInt(registre, 10);
        let value;

        switch (type_donnee) {
            case 'bool':
                const resBool = await client.readCoils(reg, 1);
                value = resBool.data[0] ? 'ON' : 'OFF';
                break;

            case 'int16':
                const resInt = await client.readHoldingRegisters(reg, 1);
                let valInt = resInt.data[0];
                if (valInt > 32767) valInt -= 65536;
                value = valInt;
                break;

            case 'uint16':
                const resUint = await client.readHoldingRegisters(reg, 1);
                value = resUint.data[0];
                break;

            case 'float':
                // TENTATIVE 1 : Holding Registers (FC03)
                let resModbus = await client.readHoldingRegisters(reg, 2);
                
                // Si FC03 est à 0, on tente Input Registers (FC04)
                if (resModbus.data[0] === 0 && resModbus.data[1] === 0) {
                    resModbus = await client.readInputRegisters(reg, 2);
                }
                
                // RECONSTRUCTION STANDARD ABCD (Poids fort en premier)
                const buffer = Buffer.alloc(4);
                buffer.writeUInt16BE(resModbus.data[0], 0); // data[0] = 0x41B1
                buffer.writeUInt16BE(resModbus.data[1], 2); // data[1] = 0x999A
                
                value = buffer.readFloatBE(0).toFixed(2);
                break;

            default:
                const resDef = await client.readHoldingRegisters(reg, 1);
                value = resDef.data[0];
        }

        client.close();
        res.json({ success: true, value: value });

    } catch (error) {
        console.error(`[MODBUS ERROR] IP: ${ip}, Reg: ${registre} ->`, error.message);
        if (client.isOpen) client.close();
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 3. ÉCRITURE MODBUS TCP (Version Standard ABCD) ---
exports.writePoint = async (req, res) => {
    const { ip, registre, type_donnee, value } = req.body;
    const client = new ModbusRTU();

    try {
        await client.connectTCP(ip, { port: 502 });
        client.setID(1);
        client.setTimeout(2000);

        const reg = parseInt(registre, 10);

        switch (type_donnee) {
            case 'bool':
                const isTrue = ['1', 'true', 'on', 'oui'].includes(String(value).toLowerCase());
                await client.writeCoil(reg, isTrue);
                break;

            case 'int16':
            case 'uint16':
                let val16 = parseInt(value, 10);
                if (val16 < 0) val16 += 65536;
                await client.writeRegister(reg, val16);
                break;

            case 'float':
                let numValue = parseFloat(value);
                const buffer = Buffer.alloc(4);
                buffer.writeFloatBE(numValue, 0);
                
                // Écriture Standard ABCD : Word 1 puis Word 2
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
        if (client.isOpen) client.close();
        res.status(500).json({ success: false, message: "Échec d'écriture" });
    }
};