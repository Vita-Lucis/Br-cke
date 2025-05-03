// lucis-discord-bot.js
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

const userMessageCounts = new Map();
const timeoutDuration = 30000;  // 30 Sekunden Timeout für identische Nachrichten
const externalLinkRegex = /https?:\/\/(?!discord\.com)([^\s]+)/; // Verhindert Links zu externen Seiten

app.use(cors());
app.use(bodyParser.json());

// Send message from website to Discord
app.post('/send', async (req, res) => {
  const { sender, message, role, roleColor, id } = req.body;

  if (sender === 'Anonym') {
    try {
      const channel = client.channels.cache.get(CHANNEL_ID);
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

  // Prüfen, ob die Nachricht externe Links enthält
  if (externalLinkRegex.test(message.content)) {
    await message.delete();  // Lösche die Nachricht
    await message.reply("Externe Links sind nicht erlaubt.");  // Sende eine Nachricht als Antwort
    return;
  }

  // Logik für identische Nachrichten innerhalb von 30 Sekunden
  const userId = message.author.id;
  const messageContent = message.content;
  
  if (!userMessageCounts.has(userId)) {
    userMessageCounts.set(userId, []);
  }

  const userMessages = userMessageCounts.get(userId);
  const currentTime = Date.now();

  // Füge die Nachricht zur Liste hinzu
  userMessages.push({ content: messageContent, timestamp: currentTime });

  // Entferne Nachrichten, die älter als 30 Sekunden sind
  while (userMessages[0] && currentTime - userMessages[0].timestamp > timeoutDuration) {
    userMessages.shift();
  }

  // Überprüfen, ob der Benutzer 4 identische Nachrichten in den letzten 30 Sekunden gesendet hat
  const identicalMessages = userMessages.filter(msg => msg.content === messageContent);
  if (identicalMessages.length >= 4) {
    await message.delete();  // Lösche die Nachricht
    await message.reply("Du hast zu viele identische Nachrichten gesendet. Bitte warte 30 Sekunden.");
    return;
  }

  // Der restliche Code bleibt unverändert
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
