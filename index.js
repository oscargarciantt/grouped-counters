const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const QRCode = require('qrcode');
const { Parser } = require('json2csv');
const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

const CounterSchema = new mongoose.Schema({
  name: String,
  value: Number,
  history: [{ action: String, timestamp: Date }]
});

const GroupSchema = new mongoose.Schema({
  name: String,
  counters: [CounterSchema],
  createdAt: { type: Date, default: Date.now }
});

const Group = mongoose.model('Group', GroupSchema);

app.get('/api/groups', async (req, res) => {
  const groups = await Group.find();
  res.json(groups);
});

app.post('/api/groups', async (req, res) => {
  const group = new Group(req.body);
  await group.save();
  res.json(group);
});

app.post('/api/groups/:groupId/counters/:counterId/:action', async (req, res) => {
  const { groupId, counterId, action } = req.params;
  const group = await Group.findById(groupId);
  const counter = group.counters.id(counterId);
  if (action === 'increment') counter.value++;
  if (action === 'decrement') counter.value--;
  counter.history.push({ action, timestamp: new Date() });
  await group.save();
  res.json(counter);
});

app.get('/api/groups/:groupId/qr', async (req, res) => {
  const url = `${req.protocol}://${req.get('host')}/public/group.html?id=${req.params.groupId}`;
  QRCode.toDataURL(url, (err, qr) => {
    if (err) return res.status(500).json({ error: 'QR code generation failed' });
    res.json({ qr });
  });
});

app.get('/api/groups/:groupId/export/:format', async (req, res) => {
  const { groupId, format } = req.params;
  const group = await Group.findById(groupId);
  if (!group) return res.status(404).send('Group not found');
  if (format === 'json') return res.json(group);
  if (format === 'csv') {
    const parser = new Parser();
    const flat = group.counters.flatMap(c => c.history.map(h => ({
      group: group.name,
      counter: c.name,
      action: h.action,
      timestamp: h.timestamp
    })));
    const csv = parser.parse(flat);
    res.header('Content-Type', 'text/csv');
    res.attachment('group_data.csv');
    return res.send(csv);
  }
  res.status(400).send('Unsupported format');
});

app.get('/', (req, res) => {
  res.redirect('/public/index.html');
});

app.listen(port, () => console.log(`Server running on port ${port}`));