// modules/db.js
require('dotenv').config();
const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');
require('pg'); // required for Vercel/Neon

// ----------------------
// MongoDB CONNECTION
// ----------------------
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('❌ MONGO_URI not set in environment');
  process.exit(1);
}

mongoose.set('strictQuery', false);

mongoose
  .connect(mongoUri)
  .then(() => console.log('✅ Connected to MongoDB (Atlas)'))
  .catch((err) => {
    console.error('❌ Error connecting to MongoDB:', err);
    process.exit(1);
  });

// ----------------------
// POSTGRES (NEON) CONNECTION
// ----------------------
if (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGDATABASE || !process.env.PGPASSWORD) {
  console.error('⚠️ Missing PostgreSQL environment variables.');
}

const sequelize = new Sequelize(
  process.env.PGDATABASE,      // name of database
  process.env.PGUSER,          // postgres user
  process.env.PGPASSWORD,      // user password
  {
    host: process.env.PGHOST,  // neon host
    port: process.env.PGPORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  }
);

// test connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL (Neon)');
  } catch (err) {
    console.error('❌ Unable to connect to Neon PostgreSQL:', err.message);
  }
})();

module.exports = { mongoose, sequelize };
