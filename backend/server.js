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
    const avatarId = Math.floor(Math.random() * 10) + 1;
    players.push({
      username: [username],
      password: [password],
      avatar: [avatarId.toString()],
      scores: [{
        classical: [],
        blitz: [],
        survival: []
      }]
    });
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

    const user = players.find(p => p.username[0] === username && p.password[0] === password);
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

    const player = players.find(p => p.username[0] === username);

    if (!player) return res.status(404).send('User not found');

    const scores = player.scores?.[0] || {};
    const getScores = mode =>
      scores[mode]?.[0]?.score?.map(Number) || [];

    res.json({
      username: player.username[0],
      avatar:player.avatar.toString() | "1",
      scores: {
        classical: getScores('classical'),
        blitz: getScores('blitz'),
        survival: getScores('survival')
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});