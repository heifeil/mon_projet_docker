// backend_api/index.js
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const app = express();
const port = process.env.PORT || 5000;

// Import des routes
const authRoutes = require('./routes/auth_routes');
const pipRoutes = require('./routes/pip_routes');
const dashboardRoutes = require('./routes/dashboard_routes');
const alarmesRoutes = require('./routes/alarmes_routes');
const detectiveRoutes = require('./routes/detective_routes');
const variableRoutes = require('./routes/variable_routes');

// Import des contrôleurs (pour les tâches de fond)
const pipController = require('./controllers/pip_controller');
const variableController = require('./controllers/variable_controller');

// --- DÉFINITION DES ROUTES ---
app.use(express.json());
app.use(cors());
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/pip', pipRoutes);
app.use('/api/alarmes', alarmesRoutes);
app.use('/api/detective', detectiveRoutes);
app.use('/api/variables', variableRoutes);

// --- PLANIFICATEUR DE TÂCHES (CRON) ---
// S'exécute toutes les 15 minutes pour pinger les IPs
cron.schedule('*/15 * * * *', () => {
  console.log('--- Lancement automatique du Ping (Cron 15min) ---');
  pipController.runPingTask();
});

// --- INITIALISATION AU DÉMARRAGE ---
// On tente d'importer le CSV 5 secondes après le lancement du serveur
setTimeout(() => {
    console.log("Tentative d'import initial du fichier CSV...");
    pipController.importCsvData(null, null); 
}, 5000);

// Route de base
app.get('/', (req, res) => {
  res.send('API Backend fonctionnelle');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${port}`);

  // LANCEMENT DU MOTEUR DE LECTURE
  variableController.startPolling(); 
});