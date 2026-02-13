CREATE DATABASE IF NOT EXISTS app_db;
USE app_db;

-- =============================================
-- 1. GESTION DES RÔLES ET UTILISATEURS
-- =============================================

-- A. Table des Rôles (Nouvelle table)
DROP TABLE IF EXISTS utilisateurs; -- On doit supprimer utilisateurs avant roles car elle contient la FK
DROP TABLE IF EXISTS user_roles;

CREATE TABLE user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL UNIQUE,
    can_read BOOLEAN DEFAULT TRUE,
    can_extract BOOLEAN DEFAULT FALSE,
    can_write BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_super_admin BOOLEAN DEFAULT FALSE
);

-- Insertion des rôles définis
INSERT INTO user_roles (nom, can_read, can_extract, can_write, is_admin, is_super_admin) VALUES 
('Lecteur',         TRUE,  FALSE, FALSE, FALSE, FALSE),
('Lecteur Avancé',  TRUE,  TRUE,  FALSE, FALSE, FALSE),
('Opérateur',       TRUE,  TRUE,  TRUE,  FALSE, FALSE),
('Admin',           TRUE,  TRUE,  TRUE,  TRUE,  FALSE),
('Super Admin',     TRUE,  TRUE,  TRUE,  TRUE,  TRUE);

-- B. Table Utilisateurs (Modifiée)
CREATE TABLE utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,       
    username VARCHAR(50) NOT NULL UNIQUE,   
    email VARCHAR(255) NOT NULL UNIQUE,    
    mot_de_passe VARCHAR(255) NOT NULL,
    role_id INT NOT NULL DEFAULT 1, -- Par défaut ID 1 = Lecteur
    theme ENUM('Spie Batignolles', 'Clair', 'Sombre') DEFAULT 'Spie Batignolles',
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES user_roles(id)
);

-- Insertion de l'utilisateur admin / SBEadmin.01
INSERT INTO utilisateurs (username, email, mot_de_passe, role_id, theme) 
VALUES (
    'admin', 
    'admin@spiebatignolles.fr', 
    -- REMPLACEZ LA CHAINE CI-DESSOUS PAR VOTRE HASH BCRYPT GÉNÉRÉ :
    '$2b$10$1z3iPtybLF5TrPbbQ64/..XTFUAZ61Dln4GE0so4hMhky/nM4.6u.', 
    (SELECT id FROM user_roles WHERE nom = 'Super Admin'), 
    'Sombre'
);

-- =============================================
-- 2. AUTRES TABLES (Inchangées ou avec ajustements mineurs)
-- =============================================

-- Table Indicateurs
DROP TABLE IF EXISTS indicateurs;
CREATE TABLE indicateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    taux_de_com FLOAT,
    delai_rep INT,
    perte_paquets FLOAT,
    utilisation_bande_passante FLOAT,
    utilisation_cpu FLOAT,
    date_releve TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Alarmes (Générales)
DROP TABLE IF EXISTS alarmes;
CREATE TABLE alarmes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100),
    IP VARCHAR(45),
    localisation VARCHAR(255),
    date_heure TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    etat VARCHAR(50)
);

-- Table Detective
DROP TABLE IF EXISTS detective;
CREATE TABLE detective (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipement_nom VARCHAR(255),
    ip_equipement VARCHAR(50),
    ancien_etat VARCHAR(255),
    nouvel_etat VARCHAR(255),
    modifie_par VARCHAR(100),
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Types Protocoles
DROP TABLE IF EXISTS protocol_types;
CREATE TABLE protocol_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    protocole ENUM('modbus', 'bacnet') NOT NULL,
    nom_affiche VARCHAR(50) NOT NULL,
    code_technique VARCHAR(50) NOT NULL,
    nb_registres INT DEFAULT 0,
    bacnet_object_id INT DEFAULT NULL
);

INSERT INTO protocol_types (protocole, nom_affiche, code_technique, nb_registres, bacnet_object_id) VALUES 
('modbus', 'Int 16 (Signé)', 'int16', 1, NULL),
('modbus', 'UInt 16 (Non signé)', 'uint16', 1, NULL),
('modbus', 'Float 32 (Réel)', 'float', 2, NULL),
('modbus', 'Booléen (Coil)', 'bool', 1, NULL),
('bacnet', 'Analog Input (AI)', 'analog-input', 0, 0),
('bacnet', 'Binary Input (BI)', 'binary-input', 0, 3),
('bacnet', 'Multi-state Input (MSI)', 'multi-state-input', 0, 13),
('bacnet', 'Analog Output (AO)', 'analog-output', 0, 1),
('bacnet', 'Binary Output (BO)', 'binary-output', 0, 4),
('bacnet', 'Multi-state Output (MSO)', 'multi-state-output', 0, 14),
('bacnet', 'Analog Value (AV)', 'analog-value', 0, 2),
('bacnet', 'Binary Value (BV)', 'binary-value', 0, 5),
('bacnet', 'Multi-state Value (MSV)', 'multi-state-value', 0, 19);

-- Table Points Surveillés
DROP TABLE IF EXISTS monitored_points;
CREATE TABLE monitored_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    protocole ENUM('modbus', 'bacnet') NOT NULL,
    ip_address VARCHAR(50) NOT NULL,
    device_id INT DEFAULT 1,
    adresse_variable VARCHAR(50) NOT NULL,
    type_donnee VARCHAR(50) NOT NULL,
    vitesse_lecture INT DEFAULT 5000,
    derniere_valeur VARCHAR(255),
    dernier_update TIMESTAMP NULL,
    cree_par VARCHAR(100),
    unite VARCHAR(20) DEFAULT '',
    seuil_min FLOAT DEFAULT NULL,
    seuil_max FLOAT DEFAULT NULL
);

-- Table Alarmes Variables
DROP TABLE IF EXISTS monitored_alarms;
CREATE TABLE monitored_alarms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    point_id INT NOT NULL,
    type_seuil VARCHAR(10),
    valeur_declenchement FLOAT, -- j'ai renommé 'valeur' pour éviter la confusion
    date_debut DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_fin DATETIME DEFAULT NULL,
    etat VARCHAR(20) DEFAULT 'ACTIVE',
    FOREIGN KEY (point_id) REFERENCES monitored_points(id) ON DELETE CASCADE
);

-- Table Historique
DROP TABLE IF EXISTS points_history;
CREATE TABLE points_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    point_id INT,
    valeur VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (point_id) REFERENCES monitored_points(id) ON DELETE CASCADE
);



-- =============================================
-- Table de Test PTU (Ventilo-convecteurs)
-- =============================================

DROP TABLE IF EXISTS test_PTU;

CREATE TABLE test_PTU (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    is_binary BOOLEAN DEFAULT FALSE,  -- Pour les On/Off
    is_analog BOOLEAN DEFAULT FALSE,  -- Pour les valeurs chiffrées (0-100%, Température...)
    is_enum BOOLEAN DEFAULT FALSE,    -- Pour les listes (ex: Vitesse 1, 2, 3)
    is_writable BOOLEAN DEFAULT FALSE,-- Si on peut piloter ce point
    unit VARCHAR(20) DEFAULT NULL,    -- Unité (%, °C, etc.)
    min FLOAT DEFAULT NULL,           -- Minimum (si analogique)
    max FLOAT DEFAULT NULL,           -- Maximum (si analogique)
    etat VARCHAR(255) DEFAULT NULL,   -- Valeur actuelle (stockée en texte pour flexibilité)
    comment TEXT DEFAULT NULL         -- Commentaire libre
);

-- Insertion des données initiales
INSERT INTO test_PTU (nom, is_binary, is_analog, is_enum, is_writable, unit, min, max, etat, comment) VALUES 
('Vitesse Soufflage', FALSE, FALSE, TRUE,  TRUE,  NULL, NULL, NULL, NULL, NULL),
('Vanne Chaude',      FALSE, TRUE,  FALSE, TRUE,  '%',  0,    100,  NULL, NULL),
('Vanne Froide',      FALSE, TRUE,  FALSE, TRUE,  '%',  0,    100,  NULL, NULL),
('Température',       FALSE, TRUE,  FALSE, FALSE, '°C', NULL, NULL, NULL, NULL);



CREATE INDEX idx_nom_equipement ON pip_data(NOM_EQUIPEMENT);
-- Table pour l'historique des Auto-Contrôles (AC)
DROP TABLE IF EXISTS history_test_PTU;

DROP TABLE IF EXISTS history_test_PTU;

CREATE TABLE history_test_PTU (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipement_id INT NOT NULL,          -- La VRAIE clé étrangère (numérique)
    nom_equipement_snapshot VARCHAR(255),-- Juste pour l'affichage (copie du nom)
    etat_global VARCHAR(10),
    detail_json TEXT,
    commentaire TEXT,
    date_test TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipement_id) REFERENCES pip_data(id) ON DELETE CASCADE -- La contrainte pointe maintenant vers l'ID
);