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
let userMessageCount = {}; // Speichert die Anzahl der gleichen Nachrichten pro Benutzer
let userMessageTime = {};  // Speichert die Zeitstempel der letzten gesendeten Nachricht
let userTimeout = {};      // Speichert die Timeout-Informationen für Benutzer
const TIMEOUT_DURATION = 60000; // Timeout-Dauer in Millisekunden (1 Minute)
const SPAM_THRESHOLD = 3; // Anzahl der Wiederholungen, um den Benutzer zu timeouten
const MESSAGE_TIMEOUT = 3000; // Zeitspanne, in der die Nachricht 3x gesendet werden muss (3 Sekunden)
const LINK_REGEX = /https?:\/\/[^\s]+/; // RegEx, um HTTP/HTTPS-Links zu erkennen

app.use(cors());
app.use(bodyParser.json());


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

  // Verhindern von Spam (3x dieselbe Nachricht innerhalb von 3 Sekunden)
  if (sender !== 'Anonym') {
    const currentTime = Date.now();
    const lastMessageTime = userMessageTime[sender] || 0;
    const messageCount = userMessageCount[sender] || {};

    // Überprüfen, ob die gleiche Nachricht innerhalb von 3 Sekunden wiederholt wird
    if (currentTime - lastMessageTime < MESSAGE_TIMEOUT) {
      messageCount[message] = (messageCount[message] || 0) + 1;

      if (messageCount[message] >= SPAM_THRESHOLD) {
        // Timeout den Benutzer für 1 Minute, wenn 3 gleiche Nachrichten gesendet wurden
        userTimeout[sender] = currentTime;
        userMessageCount[sender] = {}; // Zurücksetzen der Zählung
        return res.status(429).send('Du hast zu oft die gleiche Nachricht gesendet. Du bist für 1 Minute gesperrt.');
      }
    } else {
      // Zurücksetzen der Zählung, wenn die Nachricht nicht innerhalb des Zeitfensters wiederholt wurde
      userMessageCount[sender] = { [message]: 1 };
    }

    // Speichern des Zeitstempels der letzten Nachricht
    userMessageTime[sender] = currentTime;
  }

  try {
    const channel = client.channels.cache.get(CHANNEL_ID);

   

    // Sende die Nachricht an Discord
    await channel.send(message); // Nur die Nachricht senden
  } catch (err) {
    console.error('Discord Send Error:', err);
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
