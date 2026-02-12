const db = require('../config/db');
const bcrypt = require('bcrypt'); // Assurez-vous d'utiliser bcrypt
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mon_super_secret_temporaire';

// --- INSCRIPTION (Adapté pour utiliser role_id par défaut) ---
exports.register = async (req, res) => {
    const { email, mot_de_passe, username } = req.body;

    if (!email || !mot_de_passe || !username) {
        return res.status(400).json({ message: "Champs requis manquants" });
    }

    try {
        const [rows] = await db.query('SELECT * FROM utilisateurs WHERE email = ? OR username = ?', [email, username]);
        if (rows.length > 0) return res.status(400).json({ message: "Compte déjà existant" });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(mot_de_passe, salt);
        
        // Récupérer l'ID du rôle Lecteur par défaut
        const [roleRows] = await db.query("SELECT id FROM user_roles WHERE nom = 'Lecteur'");
        const defaultRoleId = roleRows[0] ? roleRows[0].id : 1;

        await db.query(
            'INSERT INTO utilisateurs (username, email, mot_de_passe, role_id) VALUES (?, ?, ?, ?)',
            [username, email, hash, defaultRoleId]
        );

        res.status(201).json({ message: "Utilisateur créé avec succès !" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// --- CONNEXION (Hybride) ---
exports.login = async (req, res) => {
    const { login_input, mot_de_passe } = req.body;

    try {
        // ON JOINT LA TABLE DES ROLES POUR RECUPERER LES DROITS ET LE NOM DU ROLE
        const query = `
            SELECT u.*, r.nom as role_name, r.can_read, r.can_extract, r.can_write, r.is_admin, r.is_super_admin 
            FROM utilisateurs u 
            JOIN user_roles r ON u.role_id = r.id 
            WHERE u.email = ? OR u.username = ?
        `;
        const [users] = await db.query(query, [login_input, login_input]);
        
        if (users.length === 0) return res.status(401).json({ message: "Identifiants incorrects" });

        const utilisateur = users[0];
        const isMatch = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe);

        if (!isMatch) return res.status(401).json({ message: "Identifiants incorrects" });

        const token = jwt.sign(
            { id: utilisateur.id, role: utilisateur.role_name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Construction de l'objet renvoyé au frontend
        res.json({
            message: "Connexion réussie",
            token: token,
            user: {
                id: utilisateur.id,
                email: utilisateur.email,
                username: utilisateur.username,
                theme: utilisateur.theme,
                
                // NOUVEAUX CHAMPS IMPORTANTS
                role: utilisateur.role_name, // ex: "Admin" (pour l'affichage)
                role_id: utilisateur.role_id, // ex: 4 (pour la logique > <)

                permissions: {
                    can_read: !!utilisateur.can_read,
                    can_extract: !!utilisateur.can_extract,
                    can_write: !!utilisateur.can_write,
                    is_admin: !!utilisateur.is_admin,
                    is_super_admin: !!utilisateur.is_super_admin
                }
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur lors de la connexion" });
    }
};

// --- MISE À JOUR DU THÈME ---
exports.updateTheme = async (req, res) => {
    const { id, theme } = req.body;
    try {
        await db.query('UPDATE utilisateurs SET theme = ? WHERE id = ?', [theme, id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Erreur MAJ thème" });
    }
};

// --- CHANGER LE MOT DE PASSE ---
exports.updatePassword = async (req, res) => {
    const { id, current_password, new_password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM utilisateurs WHERE id = ?', [id]);
        if (users.length === 0) return res.status(404).json({ message: "Utilisateur introuvable" });
        
        const user = users[0];
        const isMatch = await bcrypt.compare(current_password, user.mot_de_passe);
        if (!isMatch) return res.status(401).json({ message: "Mot de passe actuel incorrect" });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(new_password, salt);

        await db.query('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?', [hash, id]);
        res.json({ success: true, message: "Mot de passe modifié" });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};