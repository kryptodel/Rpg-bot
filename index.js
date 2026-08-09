require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const db = require('./db');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Test database connection
  try {
    const res = await db.query('SELECT NOW() as current_time');
    console.log('Database connection OK:', res.rows[0].current_time);
  } catch (err) {
    console.error('Database connection failed:', err.message);
  }
});

client.login(process.env.DISCORD_TOKEN);
