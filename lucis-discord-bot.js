// lucis-discord-bot.js
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID || '1367210444585963570';

const app = express();
const PORT = process.env.PORT || 3000;
let messages = [];

app.use(cors());
app.use(bodyParser.json());

// Send message from website to Discord
app.post('/send', async (req, res) => {
  const { sender, message } = req.body;
  try {
    const channel = client.channels.cache.get(CHANNEL_ID);
    await channel.send(`👤 ${sender}: ${message}`);
    res.sendStatus(200);
  } catch (err) {
    console.error('Send error:', err);
    res.sendStatus(500);
  }
});

// Provide stored messages to frontend
app.get('/messages', (req, res) => {
  res.json(messages);
});

// Discord bot setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('ready', () => {
  console.log(`Lucis Bot aktiviert als ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.channel.id === CHANNEL_ID && !message.author.bot) {
    try {
      const member = message.member || await message.guild.members.fetch(message.author.id);
      const displayName = member?.displayName || message.author.username;
      messages.push({ sender: displayName, message: message.content });
      if (messages.length > 50) messages.shift();
    } catch (err) {
      console.error('Fehler beim Laden des Nicknames:', err);
    }
  }
});


client.login(BOT_TOKEN);

app.listen(PORT, () => {
  console.log(`Lucis Webchat-Server läuft auf Port ${PORT}`);
});
