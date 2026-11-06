const express = require('express');
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const sql = `SELECT pr.record_id, pr.vehicle_id, pr.slot_id, pr.entry_time, pr.exit_time,
                        pr.parking_fee, pr.status, v.vehicle_number, v.vehicle_type,
                        v.vehicle_model, s.slot_number, u.name AS owner_name, u.user_id
                 FROM parking_records pr
                 JOIN vehicles v ON v.vehicle_id = pr.vehicle_id
                 JOIN parking_slots s ON s.slot_id = pr.slot_id
                 JOIN users u ON u.user_id = v.user_id
                 ${isAdmin ? '' : 'WHERE u.user_id = ?'}
                 ORDER BY pr.record_id DESC`;
    const [records] = isAdmin
      ? await db.execute(sql)
      : await db.execute(sql, [req.user.user_id]);
    res.json({ success: true, records });
  } catch (error) {
    console.error('Records error:', error);
    res.status(500).json({ success: false, message: 'Could not load parking records.' });
  }
});

router.post('/entry', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { vehicle_id, slot_id } = req.body;
    if (!vehicle_id || !slot_id) {
      return res.status(400).json({ success: false, message: 'Choose a vehicle and parking slot.' });
    }

    await connection.beginTransaction();

    const [vehicleRows] = await connection.execute(
      'SELECT vehicle_id, user_id, vehicle_type FROM vehicles WHERE vehicle_id = ? FOR UPDATE',
      [vehicle_id]
    );
    if (!vehicleRows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }
    const vehicle = vehicleRows[0];
    if (req.user.role !== 'admin' && vehicle.user_id !== req.user.user_id) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'You can only park your own vehicle.' });
    }

    const [active] = await connection.execute(
      'SELECT record_id FROM parking_records WHERE vehicle_id = ? AND status = ? FOR UPDATE',
      [vehicle_id, 'Parked']
    );
    if (active.length) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'This vehicle already has an active parking record.' });
    }

    const [slotRows] = await connection.execute(
      'SELECT slot_id, vehicle_type, status FROM parking_slots WHERE slot_id = ? FOR UPDATE',
      [slot_id]
    );
    if (!slotRows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Parking slot not found.' });
    }
    const slot = slotRows[0];
    if (slot.status !== 'Available') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'This slot is not available.' });
    }
    if (slot.vehicle_type.toLowerCase() !== vehicle.vehicle_type.toLowerCase()) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Vehicle type does not match this parking slot.' });
    }

    await connection.execute(
      'INSERT INTO parking_records (vehicle_id, slot_id, entry_time, status) VALUES (?, ?, NOW(), ?)',
      [vehicle_id, slot_id, 'Parked']
    );
    await connection.execute('UPDATE parking_slots SET status = ? WHERE slot_id = ?', ['Occupied', slot_id]);
    await connection.commit();
    res.status(201).json({ success: true, message: 'Vehicle entry recorded and slot assigned.' });
  } catch (error) {
    await connection.rollback();
    console.error('Parking entry error:', error);
    res.status(500).json({ success: false, message: 'Could not record vehicle entry.' });
  } finally {
    connection.release();
  }
});

router.post('/:id/exit', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT pr.record_id, pr.slot_id, pr.entry_time, v.user_id
       FROM parking_records pr JOIN vehicles v ON v.vehicle_id = pr.vehicle_id
       WHERE pr.record_id = ? AND pr.status = ? FOR UPDATE`,
      [req.params.id, 'Parked']
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Active parking record not found.' });
    }
    const record = rows[0];
    if (req.user.role !== 'admin' && record.user_id !== req.user.user_id) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'You cannot close another user’s parking record.' });
    }

    const rate = Number(process.env.PARKING_RATE_PER_HOUR || 20);
    const [feeRows] = await connection.execute(
      `SELECT GREATEST(1, CEIL(TIMESTAMPDIFF(MINUTE, ?, NOW()) / 60)) AS billed_hours`,
      [record.entry_time]
    );
    const fee = Number(feeRows[0].billed_hours) * rate;

    await connection.execute(
      'UPDATE parking_records SET exit_time = NOW(), parking_fee = ?, status = ? WHERE record_id = ?',
      [fee.toFixed(2), 'Completed', req.params.id]
    );
    await connection.execute('UPDATE parking_slots SET status = ? WHERE slot_id = ?', ['Available', record.slot_id]);
    await connection.commit();
    res.json({ success: true, message: `Vehicle exit recorded. Parking fee: ₹${fee.toFixed(2)}.`, parkingFee: fee });
  } catch (error) {
    await connection.rollback();
    console.error('Parking exit error:', error);
    res.status(500).json({ success: false, message: 'Could not record vehicle exit.' });
  } finally {
    connection.release();
  }
});

router.get('/summary/dashboard', requireAdmin, async (req, res) => {
  try {
    const [[slotStats]] = await db.execute(
      `SELECT COUNT(*) AS total_slots,
       SUM(status = 'Available') AS available_slots,
       SUM(status = 'Occupied') AS occupied_slots,
       SUM(status = 'Maintenance') AS maintenance_slots
       FROM parking_slots`
    );
    const [[vehicleStats]] = await db.execute('SELECT COUNT(*) AS total_vehicles FROM vehicles');
    const [[recordStats]] = await db.execute(
      `SELECT COUNT(*) AS active_records,
       COALESCE(SUM(CASE WHEN status = 'Completed' THEN parking_fee ELSE 0 END), 0) AS total_revenue
       FROM parking_records`
    );
    res.json({ success: true, stats: { ...slotStats, ...vehicleStats, ...recordStats } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load dashboard summary.' });
  }
});

module.exports = router;
