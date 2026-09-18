const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(__dirname, '../../data');
const dbFilePath = path.join(dataDir, 'reservations.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize JSON database if not exists
if (!fs.existsSync(dbFilePath)) {
  fs.writeFileSync(dbFilePath, JSON.stringify({ reservations: [], nextId: 1 }, null, 2), 'utf8');
}

const loadData = () => {
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { reservations: [], nextId: 1 };
  }
};

const saveData = (data) => {
  fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
};

module.exports = {
  loadData,
  saveData,
  dbFilePath
};
