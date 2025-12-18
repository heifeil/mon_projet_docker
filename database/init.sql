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