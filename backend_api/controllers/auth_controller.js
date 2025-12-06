const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mon_super_secret_temporaire';

// --- INSCRIPTION ---
exports.register = async (req, res) => {
    // On récupère maintenant 'username' en plus
    const { email, mot_de_passe, username, role } = req.body;

    if (!email || !mot_de_passe || !username) {
        return res.status(400).json({ message: "Identifiant, Email et mot de passe requis" });
    }

    try {
        // Vérifier si email OU username existe déjà
        const [rows] = await db.query('SELECT * FROM utilisateurs WHERE email = ? OR username = ?', [email, username]);
        if (rows.length > 0) {
            return res.status(400).json({ message: "Cet email ou cet identifiant est déjà pris" });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(mot_de_passe, salt);
        const userRole = role || 'user'; 
        
        // Insertion avec le username
        await db.query(
            'INSERT INTO utilisateurs (username, email, mot_de_passe, role) VALUES (?, ?, ?, ?)',
            [username, email, hash, userRole]
        );

        res.status(201).json({ message: "Utilisateur créé avec succès !" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur lors de l'inscription" });
    }
};

// --- CONNEXION (Hybride) ---
exports.login = async (req, res) => {
    // On renomme 'email' en 'login_input' pour être plus clair (ça peut être l'un ou l'autre)
    const { login_input, mot_de_passe } = req.body;

    try {
        // LA CLÉ EST ICI : On cherche dans email OU dans username
        const query = 'SELECT * FROM utilisateurs WHERE email = ? OR username = ?';
        const [users] = await db.query(query, [login_input, login_input]);
        
        if (users.length === 0) {
            return res.status(401).json({ message: "Identifiant ou mot de passe incorrect" });
        }

        const utilisateur = users[0];
        const isMatch = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe);

        if (!isMatch) {
            return res.status(401).json({ message: "Identifiant ou mot de passe incorrect" });
        }

        const token = jwt.sign(
            { id: utilisateur.id, role: utilisateur.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: "Connexion réussie",
            token: token,
            user: {
                id: utilisateur.id,
                email: utilisateur.email,
                username: utilisateur.username, // On renvoie aussi le pseudo
                role: utilisateur.role,
                theme: utilisateur.theme
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur lors de la connexion" });
    }
};

// --- MISE À JOUR DU THÈME ---
exports.updateTheme = async (req, res) => {
    const { id, theme } = req.body; // On reçoit l'ID user et le nouveau thème

    try {
        await db.query('UPDATE utilisateurs SET theme = ? WHERE id = ?', [theme, id]);
        //res.json({ success: true, message: "Thème mis à jour" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la mise à jour du thème" });
    }
};


// --- CHANGER LE MOT DE PASSE ---
exports.updatePassword = async (req, res) => {
    const { id, current_password, new_password } = req.body;

    try {
        // 1. Récupérer l'utilisateur pour avoir son mot de passe actuel crypté
        const [users] = await db.query('SELECT * FROM utilisateurs WHERE id = ?', [id]);
        
        if (users.length === 0) return res.status(404).json({ message: "Utilisateur introuvable" });
        const user = users[0];

        // 2. Vérifier que l'ancien mot de passe est bon
        const isMatch = await bcrypt.compare(current_password, user.mot_de_passe);
        if (!isMatch) {
            return res.status(401).json({ message: "Le mot de passe actuel est incorrect" });
        }

        // 3. Crypter le NOUVEAU mot de passe
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(new_password, salt);

        // 4. Mise à jour
        await db.query('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?', [hash, id]);

        res.json({ success: true, message: "Mot de passe modifié avec succès" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};