require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const db = require('./db');
const http = require('http');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const res = await db.query('SELECT NOW() as current_time');
    console.log('Database connection OK:', res.rows[0].current_time);
  } catch (err) {
    console.error('Database connection failed:', err.message);
  }
});

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running');
}).listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
