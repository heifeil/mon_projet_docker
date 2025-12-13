// backend_api/index.js
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

// Import des routes et contrôleurs
const authRoutes = require('./routes/auth_routes');
const pipRoutes = require('./routes/pip_routes');
const dashboardRoutes = require('./routes/dashboard_routes');

const pipController = require('./controllers/pip_controller');

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use('/api/dashboard', dashboardRoutes);

// --- DÉFINITION DES ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/pip', pipRoutes);

// --- PLANIFICATEUR DE TÂCHES (CRON) ---
// S'exécute toutes les 15 minutes pour pinger les IPs
cron.schedule('*/15 * * * *', () => {
  console.log('--- Lancement automatique du Ping (Cron 15min) ---');
  pipController.runPingTask();
});

// --- INITIALISATION AU DÉMARRAGE ---
// On tente d'importer le CSV 5 secondes après le lancement du serveur
// (Le temps que la connexion à la Base de Données soit bien établie)
setTimeout(() => {
    console.log("Tentative d'import initial du fichier CSV...");
    // On appelle la fonction sans req/res car ce n'est pas une requête HTTP
    pipController.importCsvData(null, null); 
}, 5000);

// Route de base pour vérifier que l'API tourne
app.get('/', (req, res) => {
  res.send('API Backend fonctionnelle');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${port}`);
});