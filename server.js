require('dotenv').config();

const express = require('express');
const path = require('path');
const db = require('./config/db');

const app = express();
const PORT = Number(process.env.PORT || 3000);

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET. Copy .env.example to .env and set JWT_SECRET.');
  process.exit(1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ success: true, message: 'ParkNova API and MySQL are connected.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'MySQL connection failed.' });
  }
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/slots', require('./routes/slotRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/records', require('./routes/parkingRoutes'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Unexpected server error.' });
});

async function startServer() {
  try {
    await db.query('SELECT 1');
    console.log('MySQL connection successful.');
    app.listen(PORT, () => console.log(`ParkNova running at http://localhost:${PORT}`));
  } catch (error) {
    console.error('Could not connect to MySQL. Check your .env settings and make sure MySQL is running.');
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
