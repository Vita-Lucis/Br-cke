const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { fetch } = require('undici');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID || '1367210444585963570';

const app = express();
const PORT = process.env.PORT || 3000;
let messages = [];
let userLastMessageTime = {}; // Speichert die Zeit der letzten Nachricht für jeden Benutzer

app.use(cors());
app.use(bodyParser.json());

// Spam Timeout (z.B. 2 Sekunden)
const SPAM_TIMEOUT = 2000; // in Millisekunden

// Send message from website to Discord
app.post('/send', async (req, res) => {
  const { sender, message, role, roleColor, id } = req.body;

  if (sender === 'Anonym') {
    try {
      const channel = client.channels.cache.get(CHANNEL_ID);

      // Verhindert Spam: Überprüft, ob der Benutzer zu schnell hintereinander Nachrichten sendet
      const currentTime = Date.now();
      const lastTime = userLastMessageTime[sender] || 0;

      if (currentTime - lastTime < SPAM_TIMEOUT) {
        console.log(`Spam erkannt: Benutzer ${sender} hat zu schnell eine Nachricht gesendet.`);
        return res.sendStatus(429); // HTTP 429 Too Many Requests
      }

      // Speichert die Zeit der letzten Nachricht
      userLastMessageTime[sender] = currentTime;

      // Sende die Nachricht an Discord
      await channel.send(message); // Nur die Nachricht senden
    } catch (err) {
      console.error('Discord Send Error:', err);
    }
  }

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
  if (message.author.id === client.user.id || message.webhookId) return;

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
  const id = `discord-${message.id}`;

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

  if (!messages.find(msg => msg.id === id)) {
    messages.push(payload);
    if (messages.length > 50) messages.shift();
  }
});

client.login(BOT_TOKEN);

app.listen(PORT, () => {
  console.log(`Lucis Webchat-Server läuft auf Port ${PORT}`);
});
