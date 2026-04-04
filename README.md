# 🏭 Supervision & Autocontrôles GTB/GTC

**Supervision & Autocontrôles GTB/GTC** est une plateforme full-stack conteneurisée conçue pour centraliser la gestion du parc d'équipements, surveiller l'état du réseau en temps réel, et réaliser des autocontrôles directement sur les automates via les protocoles industriels (Modbus TCP / BACnet). Elle intègre un système complet d'audit pour tracer chaque action utilisateur.

---

## 📑 Table des Matières

* ✨ Fonctionnalités Clés
* 🛠️ Stack Technique
* 🚀 Installation et Démarrage
* ⚙️ Configuration
* 📖 Guide d'Utilisation
* 📂 Structure du Projet
* 🔒 Gestion des Rôles

---

## ✨ Fonctionnalités Clés

### 📊 Dashboard de Pilotage

* **KPIs Système & Réseau :** Suivi en temps réel de l'utilisation CPU, de la bande passante, du taux de communication et de la latence (ping).
* **Gestion des Alarmes :** Remontée immédiate des équipements en perte de communication ou en défaut de seuil.

### 📋 PIP (Plan d'Intervention et de Pilotage)

* **Gestion du Parc :** Tableau central listant tous les équipements avec filtrage dynamique et gestion des colonnes.
* **Import / Export :** Mise à jour massive du parc via import de fichiers CSV, avec gestion des contraintes relationnelles.
* **Diagnostic Réseau :** Scan global ou ping unitaire manuel pour vérifier la connectivité d'un équipement.

### ⚙️ Pilotage Industriel (Modbus & BACnet)

* **Lecture Temps Réel :** Interrogation automatique (polling) des registres Modbus (Coils, Holding Registers, Float32) et BACnet.
* **Écriture & Commandes :** Envoi de consignes et pilotage direct des automates depuis l'interface web.
* **Autocontrôles (AC) :** Interface dédiée pour valider fonctionnellement les équipements (statut OK/NOK) avec ajout de commentaires.

### 🕵️ Bureau d'Investigation (Détective)

* **Audit Trail :** Traçabilité complète des validations et modifications (qui a validé quoi, et quand).
* **Visualisation :** Graphiques interactifs (Recharts) répartissant les actions par utilisateur.
* **Export Ciblé :** Téléchargement de l'historique spécifique à un équipement au format `.csv`.

---

## 🛠️ Stack Technique

Le projet repose sur une architecture moderne conteneurisée via **Docker**.

### **Frontend**

* **Framework :** React 18 (Vite)
* **Langage :** JavaScript (ES6+ / JSX)
* **Style :** CSS3 (Variables natives), Flexbox/Grid
* **Visualisation :** Recharts (Graphiques)
* **Icônes :** Lucide React

### **Backend**

* **Serveur :** Node.js / Express
* **Protocoles OT :** `modbus-serial`
* **Réseau & Système :** `ping`, `systeminformation`, `node-cron`
* **Sécurité :** Bcrypt (Hashage), Cors
* **Fichiers :** `csv-parser`, `fs`

### **Base de Données**

* **SGBD :** MySQL / MariaDB
* **Connecteur :** MySQL2 (Promise wrapper)

---

## 🚀 Installation et Démarrage

### Prérequis

* [Docker](https://www.docker.com/) et Docker Compose installés sur votre machine.
* [Git](https://git-scm.com/) pour cloner le dépôt.

### 1. Cloner le projet

```bash
git clone https://github.com/heifeil/mon_projet_docker.git
cd mon_projet_docker
```

### 2. Configuration du `.gitignore`

Assurez-vous que les dossiers sensibles et lourds sont ignorés à la racine :

```text
node_modules/
dist/
build/
.env
mysql_data/
.DS_Store
```

### 3. Lancement via Docker

L'application est configurée pour se lancer en une seule commande. Cela construira le Frontend, le Backend et la Base de données.

```bash
docker-compose up --build -d
```

Une fois lancé :

* **Frontend :** Accessible sur `http://localhost:5173` (ou port défini par Vite)
* **Backend :** Accessible sur `http://localhost:5000`
* **Base de données :** Port `3306`

> **Note :** Si vous rencontrez des erreurs de cache Docker ou de réseau virtuel, utilisez :
> `docker-compose down -v` puis `docker-compose up --build -d`.

---

## ⚙️ Configuration

L'essentiel de la configuration (ports, volumes) se trouve dans le fichier `docker-compose.yml`. 
Pour initialiser la base de données, le fichier `database/init.sql` est automatiquement exécuté au premier lancement du conteneur MySQL.

---

## 📖 Guide d'Utilisation

### 1. Première Connexion

L'initialisation SQL crée un compte par défaut :
* **Identifiant :** admin
* **Mot de passe :** *(Celui défini lors de la génération du hash bcrypt)*

### 2. Workflow Typique

1. **Admin :** Importe le fichier `pip.csv` via le PIP pour peupler la base de données avec les équipements du bâtiment.
2. **Admin :** Accède à un équipement, configure les points Modbus (adresse du registre, type de donnée, mode lecture/écriture).
3. **Opérateur :** Ouvre l'application **Autocontrôles**.
4. **Opérateur :** Clique sur un équipement, vérifie la valeur remontée en temps réel, et clique sur **OK/NOK**.
5. **Opérateur :** Sauvegarde l'Auto-contrôle (historisation automatique).
6. **Superviseur :** Ouvre l'application **Détective** pour suivre l'avancement des tests et extraire les rapports au format CSV.

---

## 📂 Structure du Projet

```bash
mon_projet_docker/
├── backend_api/            # API Node.js/Express
│   ├── config/             # Connexion BDD (db.js)
│   ├── controllers/        # Logique métier (Modbus, PIP, Détective, Cron...)
│   ├── routes/             # Définitions des Endpoints REST
│   ├── package.json
│   ├── Dockerfile
│   └── index.js            # Point d'entrée & Initialisation
├── frontend_ui/            # Application React (Vite)
│   ├── src/
│   │   ├── components/     # Composants globaux (Sidebar, Header...)
│   │   ├── context/        # Contextes (AuthContext)
│   │   ├── layouts/        # Layouts d'affichage
│   │   ├── pages/          # Vues principales (PIP, Admin, Autocontrôles)
│   │   │   ├── apps/       # Sous-applications (Détective, Moniteur...)
│   │   │   └── protocoles/ # Composants d'interface Modbus & BACnet
│   │   ├── main.jsx
│   │   └── App.jsx         # Routing React
│   ├── Dockerfile
│   └── vite.config.js
├── database/               # Base de données
│   └── init.sql            # Script SQL d'initialisation (Schémas, Rôles, Admin)
├── csv_files/              # Dossier monté en volume
│   └── pip.csv             # Fichier source d'importation
└── docker-compose.yml      # Orchestration des conteneurs
```

---

## 🔒 Gestion des Rôles

L'application gère des permissions granulaires basées sur `role_id`, bloquant l'accès à certaines routes et boutons :

| Rôle | ID | Permissions | Accès (Apps) |
| --- | --- | --- | --- |
| **Lecteur** | 1 | Lecture seule | Variables, Alarmes, PIP |
| **Lecteur Avancé** | 2 | Lecture & Export | Variables, Alarmes, PIP |
| **Opérateur** | 3 | Exécution des tests | Tout sauf Détective |
| **Admin** | 4 | Config, Import CSV | Accès Total |
| **Super Admin** | 5 | Droits absolus | Accès Total (Gestion Utilisateurs à venir) |

---
Clément LAGARDE & Enzo RIQUART - UniLaSalle Amiens
