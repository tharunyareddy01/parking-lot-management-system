const express = require('express');
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const [slots] = await db.execute('SELECT * FROM parking_slots ORDER BY slot_number');
    res.json({ success: true, slots });
  } catch (error) {
    console.error('Slots error:', error);
    res.status(500).json({ success: false, message: 'Could not load parking slots.' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { slot_number, vehicle_type, location } = req.body;
    if (!slot_number || !vehicle_type || !location) {
      return res.status(400).json({ success: false, message: 'Slot number, vehicle type and location are required.' });
    }
    const [result] = await db.execute(
      'INSERT INTO parking_slots (slot_number, vehicle_type, location, status) VALUES (?, ?, ?, ?)',
      [slot_number.trim(), vehicle_type, location.trim(), 'Available']
    );
    res.status(201).json({ success: true, message: 'Parking slot added.', slotId: result.insertId });
  } catch (error) {
    const duplicate = error.code === 'ER_DUP_ENTRY';
    res.status(duplicate ? 409 : 500).json({ success: false, message: duplicate ? 'That slot number already exists.' : 'Could not add slot.' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { vehicle_type, location, status } = req.body;
    if (!['Available', 'Occupied', 'Maintenance'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid slot status.' });
    }
    const [result] = await db.execute(
      'UPDATE parking_slots SET vehicle_type = ?, location = ?, status = ? WHERE slot_id = ?',
      [vehicle_type, location, status, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Slot not found.' });
    res.json({ success: true, message: 'Slot updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not update slot.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const [active] = await db.execute(
      'SELECT record_id FROM parking_records WHERE slot_id = ? AND status = ?',
      [req.params.id, 'Parked']
    );
    if (active.length) return res.status(409).json({ success: false, message: 'Cannot delete a slot currently in use.' });
    await db.execute('DELETE FROM parking_slots WHERE slot_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Slot deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not delete slot. Slots referenced by parking history cannot be deleted.' });
  }
});

module.exports = router;
