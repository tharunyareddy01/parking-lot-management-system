const express = require('express');
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const sql = `SELECT v.vehicle_id, v.user_id, v.vehicle_number, v.vehicle_type, v.vehicle_model,
                        u.name AS owner_name, u.email AS owner_email
                 FROM vehicles v JOIN users u ON u.user_id = v.user_id
                 ${isAdmin ? '' : 'WHERE v.user_id = ?'}
                 ORDER BY v.vehicle_id DESC`;
    const [vehicles] = isAdmin
      ? await db.execute(sql)
      : await db.execute(sql, [req.user.user_id]);
    res.json({ success: true, vehicles });
  } catch (error) {
    console.error('Vehicles error:', error);
    res.status(500).json({ success: false, message: 'Could not load vehicles.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { vehicle_number, vehicle_type, vehicle_model } = req.body;
    if (!vehicle_number || !vehicle_type) {
      return res.status(400).json({ success: false, message: 'Vehicle number and type are required.' });
    }
    const [result] = await db.execute(
      'INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, vehicle_model) VALUES (?, ?, ?, ?)',
      [req.user.user_id, vehicle_number.trim().toUpperCase(), vehicle_type, vehicle_model || null]
    );
    res.status(201).json({ success: true, message: 'Vehicle registered.', vehicleId: result.insertId });
  } catch (error) {
    const duplicate = error.code === 'ER_DUP_ENTRY';
    res.status(duplicate ? 409 : 500).json({ success: false, message: duplicate ? 'This vehicle number is already registered.' : 'Could not register vehicle.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT user_id FROM vehicles WHERE vehicle_id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    if (req.user.role !== 'admin' && rows[0].user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'You can only remove your own vehicle.' });
    }
    const [active] = await db.execute(
      'SELECT record_id FROM parking_records WHERE vehicle_id = ? AND status = ?',
      [req.params.id, 'Parked']
    );
    if (active.length) return res.status(409).json({ success: false, message: 'Vehicle is currently parked.' });
    await db.execute('DELETE FROM vehicles WHERE vehicle_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Vehicle removed.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not remove vehicle. A vehicle with parking history cannot be deleted.' });
  }
});

module.exports = router;
