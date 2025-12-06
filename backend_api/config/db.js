const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// On crée un "pool" de connexions (plus performant qu'une simple connexion)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mariadb_service',
    user: process.env.DB_USER || 'app_user',
    password: process.env.DB_PASSWORD || 'app_user_password',
    database: process.env.DB_NAME || 'app_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// On transforme le pool pour utiliser les Promesses (async/await)
const promisePool = pool.promise();

console.log("Configuration BDD chargée...");

module.exports = promisePool;