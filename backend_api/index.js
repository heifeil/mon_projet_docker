// backend_api/index.js
const express = require('express');
const cors = require('cors');


const authRoutes = require('./routes/auth_routes');
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('API Backend fonctionnelle');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${port}`);
});