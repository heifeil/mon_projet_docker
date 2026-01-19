CREATE DATABASE IF NOT EXISTS app_db;
USE app_db;

-- 1. Table Utilisateurs
DROP TABLE IF EXISTS utilisateurs;

CREATE TABLE utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,       
    username VARCHAR(50) NOT NULL UNIQUE,   
    email VARCHAR(255) NOT NULL UNIQUE,    
    mot_de_passe VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    theme ENUM('Spie Batignolles', 'Clair', 'Sombre') DEFAULT 'Spie Batignolles',
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table Indicateurs
CREATE TABLE indicateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    taux_de_com FLOAT,
    delai_rep INT,
    perte_paquets FLOAT,
    utilisation_bande_passante FLOAT,
    utilisation_cpu FLOAT,
    date_releve TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table Alarmes
CREATE TABLE alarmes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100),
    IP VARCHAR(45),
    localisation VARCHAR(255),
    date_heure TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    etat VARCHAR(50)
);

-- 4. Table Detective
CREATE TABLE detective (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipement_nom VARCHAR(255),
    ip_equipement VARCHAR(50),
    ancien_etat VARCHAR(255),
    nouvel_etat VARCHAR(255),
    modifie_par VARCHAR(100),
    date_modif TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. Table des définitions de types par protocole
CREATE TABLE protocol_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    protocole ENUM('modbus', 'bacnet') NOT NULL,
    nom_affiche VARCHAR(50) NOT NULL,
    code_technique VARCHAR(50) NOT NULL, -- Clé de lien
    nb_registres INT DEFAULT 0,          -- Pour Modbus (ex: Float = 2)
    bacnet_object_id INT DEFAULT NULL    -- L'ID officiel BACnet (ex: 0=AI, 1=AO)
);

-- 2. Insertion des types (Modbus + BACnet Complet)
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

-- 3. Configuration des points à surveiller
CREATE TABLE monitored_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    protocole ENUM('modbus', 'bacnet') NOT NULL,
    ip_address VARCHAR(50) NOT NULL,
    device_id INT DEFAULT 1, -- UnitID Modbus 
    -- Pour Modbus : Adresse Registre (ex: 40001)
    -- Pour BacNET : Juste le numéro d'Instance (ex: 12), le type est déterminé par 'type_donnee'
    adresse_variable VARCHAR(50) NOT NULL,
    type_donnee VARCHAR(50) NOT NULL,-- Ce champ stockera le 'code_technique' de la table protocol_types
    vitesse_lecture INT DEFAULT 5000,
    derniere_valeur VARCHAR(255),
    dernier_update TIMESTAMP NULL,
    cree_par VARCHAR(100)
);

-- 4. Historique des valeurs
CREATE TABLE points_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    point_id INT,
    valeur VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (point_id) REFERENCES monitored_points(id) ON DELETE CASCADE
);