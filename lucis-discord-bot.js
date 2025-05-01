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
  const { sender, message, role, roleColor, id } = req.body;

  // Wenn es "Anonym" ist, stammt es von der Website → sende an Discord
  if (sender === 'Anonym') {
    try {
      const channel = client.channels.cache.get(CHANNEL_ID);
      await channel.send(`${role || '🖤'} ${sender}: ${message}`);
    } catch (err) {
      console.error('Discord Send Error:', err);
    }
  }

  // In allen Fällen lokal speichern – nur, wenn ID noch nicht bekannt
  if (!messages.find(msg => msg.id === id)) {
    messages.push({ sender, message, role: role || '🖤', roleColor: roleColor || '#2f2f2f', id });
    if (messages.length > 50) messages.shift();
  }

  res.sendStatus(200);
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

// Emoji-Farben Mapping
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
    const hasRole = [...roles.values()].some(role => role.name.includes(emoji));
    if (hasRole) {
      roleEmoji = emoji;
      break;
    }
  }
  const roleColor = emojiMap[roleEmoji];
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const payload = {
    sender: message.member.displayName,
    role: roleEmoji,
    roleColor: roleColor,
    message: message.content,
    id
  };

  await fetch('https://br-cke.onrender.com/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  // 🧠 Lokaler Cache – nur wenn ID neu ist
  if (!messages.find(msg => msg.id === id)) {
    messages.push(payload);
    if (messages.length > 50) messages.shift();
  }
});

client.login(BOT_TOKEN);

app.listen(PORT, () => {
  console.log(`Lucis Webchat-Server läuft auf Port ${PORT}`);
});
