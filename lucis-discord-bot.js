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


app.use(cors());
app.use(bodyParser.json());

// RegEx zur Erkennung von externen Links
const LINK_REGEX = /https?:\/\/[^\s]+/;

let userMessageCount = {}; // Zählt, wie oft der Benutzer dieselbe Nachricht gesendet hat
let userTimeout = {};      // Speichert die Timeout-Informationen für Benutzer
const TIMEOUT_DURATION = 60000; // Timeout-Dauer in Millisekunden (1 Minute)
const SPAM_THRESHOLD = 3; // Anzahl der Wiederholungen, um den Benutzer zu timeouten

// Funktion zur Überprüfung und zum Setzen des Timeout
function checkSpam(sender, message) {
  const currentTime = Date.now();
  if (!userMessageCount[sender]) {
    userMessageCount[sender] = {}; // Initialisiere den Zähler, falls er noch nicht existiert
  }

  if (!userMessageCount[sender][message]) {
    userMessageCount[sender][message] = 0; // Initialisiere den Zähler für die Nachricht
  }

  userMessageCount[sender][message] += 1; // Erhöhe den Zähler für die Nachricht

  if (userMessageCount[sender][message] >= SPAM_THRESHOLD) {
    userTimeout[sender] = currentTime; // Sperre den Benutzer
    userMessageCount[sender] = {}; // Setze die Zählung zurück
    return true; // Benutzer wurde gesperrt
  }

  return false; // Keine Sperre
}

// Send message from website to Discord
app.post('/send', async (req, res) => {
  const { sender, message, role, roleColor, id } = req.body;

  // Überprüfen, ob die Nachricht einen externen Link enthält
  if (LINK_REGEX.test(message)) {
    return res.status(400).send('Externe Links sind verboten.'); // Nachricht blockieren, wenn ein Link enthalten ist
  }

  // Wenn der Benutzer gesperrt ist, verhindern wir, dass er eine Nachricht sendet
  if (userTimeout[sender] && Date.now() - userTimeout[sender] < TIMEOUT_DURATION) {
    return res.status(403).send('Du bist für 1 Minute gesperrt.');
  }

  // Überprüfen, ob der Benutzer die gleiche Nachricht zu oft gesendet hat
  if (checkSpam(sender, message)) {
    return res.status(429).send('Du hast zu oft die gleiche Nachricht gesendet. Du bist für 1 Minute gesperrt.');
  }

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
  
   // Überprüfen, ob die Nachricht einen externen Link enthält
  if (LINK_REGEX.test(message.content)) {
    console.log('Externer Link erkannt, Nachricht wird ignoriert.');
    return; // Blockiert Nachrichten mit externen Links
  }
  
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

  // Verhindern, dass eine Nachricht wiederholt gesendet wird
  const existingMessage = messages.find(msg => msg.id === id);
  if (existingMessage) {
    console.log(`Nachricht mit ID ${id} wurde bereits gesendet.`);
    return; // Verhindert das erneute Senden
  }
  
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
