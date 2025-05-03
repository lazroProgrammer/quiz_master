const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors',);

const { parseStringPromise, Builder } = require('xml2js');
const app = express();
const PORT = 3000;

app.use(cors({ origin: 'http://localhost:8000' }));
app.use(express.static('.'));
app.use(express.json());
app.use('/public', express.static('public'));

const xmlPath = './data/players.xml';
if (!fs.existsSync(xmlPath)) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  fs.writeFileSync(xmlPath, '<players></players>', 'utf8');
}

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Missing fields.');

  try {
    const xml = fs.readFileSync(xmlPath, 'utf8');
    const data = await parseStringPromise(xml);
    const players = data.players.player || [];

    if (players.find(p => p.username[0] === username)) {
      return res.send("Username already exists.");
    }

    const passwordHash = await hashPassword(password);
    const avatarId = Math.floor(Math.random() * 10) + 1;

    const newPlayer = {
      username: [username],
      passwordHash: [passwordHash],
      avatar: [avatarId.toString()],
      scores: {
        classical: [{ score: [{ score: [] }] }],
        blitz: [{ score: [{ score: [] }] }],
        survival: [{ score: [{ score: [] }] }]
      }
    };

    newPlayer.scores.classical[0].score[0].score.shift();
    newPlayer.scores.blitz[0].score[0].score.shift();
    newPlayer.scores.survival[0].score[0].score.shift();


    players.push(newPlayer);

    const builder = new Builder();
    const newXML = builder.buildObject({ players: { player: players } });

    fs.writeFileSync(xmlPath, newXML);
    res.send("Signup successful!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error.");
  }
});



app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const xml = fs.readFileSync(xmlPath, 'utf8');
    const data = await parseStringPromise(xml);
    const players = data.players.player || [];
    
    passwordHash= await hashPassword(password)
    const user = players.find(p => p.username[0] === username && p.passwordHash[0] === passwordHash);
    if (user) return res.send(`Welcome, ${username}!`);
    else return res.send("Invalid credentials.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error.");
  }
});

app.get('/profile/:username', async (req, res) => { 
  const { username } = req.params;

  try {
    const xml = fs.readFileSync(xmlPath, 'utf8');
    const data = await parseStringPromise(xml);

    const players = data.players.player || [];

    const player = players.find(p => p.username?.[0] === username);

    if (!player) return res.status(404).send('User not found');

    const scores = player.scores?.[0] || {};
    const getScores = mode =>
      scores[mode]?.[0]?.score?.map(Number) || [];

    res.json({
      player: {
        username: player.username[0],
        avatar: player.avatar?.[0] || "1",
        scores: {
          classical: getScores('classical'),
          blitz: getScores('blitz'),
          survival: getScores('survival')
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.post('/score', async (req, res) => {
  const { username, mode, score } = req.body;
  if (!username || !mode || typeof score !== 'number') return res.status(400).send("Invalid data");

  try {
    const xml = fs.readFileSync(xmlPath, 'utf8');
    const data = await parseStringPromise(xml);

    const players = data.players.player || [];
    const player = players.find(p => p.username?.[0] === username);
    if (!player) return res.status(404).send("User not found");

    const scorePath = player.scores?.[0]?.[mode]?.[0]?.score || [];

    scorePath.push(score.toString());

    const builder = new Builder();
    const updatedXML = builder.buildObject(data);
    fs.writeFileSync(xmlPath, updatedXML, 'utf8');

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}



app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});