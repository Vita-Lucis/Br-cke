// lucis-discord-bot.js
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID || '1367210444585963570';

const app = express();
const PORT = process.env.PORT || 3000;
let messages = [];

app.use(cors());
app.use(bodyParser.json());

// Funktion zum Generieren einer eindeutigen ID
function generateId() {
  return `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

// Nachricht von Website → Discord & speichern
app.post('/send', async (req, res) => {
  const { sender, message, role, roleColor } = req.body;
  const msg = {
    id: generateId(),
    sender,
    message,
    role: role || '🖤',
    roleColor: roleColor || '#2f2f2f'
  };

  if (sender === 'Anonym') {
    try {
      const channel = client.channels.cache.get(CHANNEL_ID);
      await channel.send(`${msg.role} ${msg.sender}: ${msg.message}`);
    } catch (err) {
      console.error('Discord Send Error:', err);
    }
  }

  messages.push(msg);
  if (messages.length > 50) messages.shift();
  res.sendStatus(200);
});

// Website ruft Nachrichten ab
app.get('/messages', (req, res) => {
  res.json(messages);
});

// Discord Bot
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

const emojiMap = {
  '💗': '#ff69b4',
  '❤️': '#e74c3c',
  '💛': '#f1c40f',
  '💚': '#2ecc71',
  '💙': '#3498db',
  '🤍': '#cccccc',
  '🖤': '#2f2f2f'
};

client.on('messageCreate', async (message) => {
  if (message.author.id === client.user.id) return;

  const member = message.member;
  const roles = member?.roles?.cache || [];
  const heartPriority = ['💗', '❤️', '💛', '💚', '💙', '🤍', '🖤'];
  let roleEmoji = '🖤';

  for (const emoji of heartPriority) {
    if ([...roles.values()].some(role => role.name.includes(emoji))) {
      roleEmoji = emoji;
      break;
    }
  }

  const roleColor = emojiMap[roleEmoji];
  const payload = {
    id: generateId(),
    sender: message.member.displayName,
    role: roleEmoji,
    roleColor,
    message: message.content
  };

  // An Website-Server schicken
  await fetch('https://br-cke.onrender.com/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  // Lokal speichern
  messages.push(payload);
  if (messages.length > 50) messages.shift();
});

client.login(BOT_TOKEN);
app.listen(PORT, () => {
  console.log(`Lucis Webchat-Server läuft auf Port ${PORT}`);
});
