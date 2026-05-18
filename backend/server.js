const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, initDB } = require('./db');
const { authenticate } = require('./auth');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, role, password) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, 'user', hash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/rooms', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rooms ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/rooms', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { name, capacity, equipment, location } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO rooms (name, capacity, equipment, location) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, capacity, equipment, location]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/meetings', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { title, agenda, type, start_time, end_time, room_id, online_link, participants } = req.body;
    
    if (!title || title.length < 3) throw new Error('Title must be at least 3 characters');
    const start = new Date(start_time);
    const end = new Date(end_time);
    const now = new Date();
    if (start <= now) throw new Error('Start time must be in the future');
    if (start >= end) throw new Error('Start time must be before end time');
    if (!participants || participants.length === 0) throw new Error('At least one participant is required');
    
    const participantIds = [req.user.id, ...participants];
    
    const overlapQuery = `
      SELECT m.id FROM meetings m
      JOIN meeting_participants mp ON m.id = mp.meeting_id
      WHERE m.status != 'Cancelled' AND mp.user_id = ANY($1)
      AND (m.start_time < $3 AND m.end_time > $2)
    `;
    const overlapRes = await client.query(overlapQuery, [participantIds, start_time, end_time]);
    if (overlapRes.rowCount > 0) throw new Error('Participants have overlapping meetings');

    if (type === 'offline') {
      const roomRes = await client.query('SELECT capacity FROM rooms WHERE id = $1', [room_id]);
      if (roomRes.rowCount === 0) throw new Error('Room not found');
      if (roomRes.rows[0].capacity < participantIds.length) throw new Error('Room capacity is less than participants count');
      
      const roomOverlap = await client.query(
        `SELECT id FROM meetings WHERE room_id = $1 AND status != 'Cancelled' AND (start_time < $3 AND end_time > $2)`,
        [room_id, start_time, end_time]
      );
      if (roomOverlap.rowCount > 0) throw new Error('Room is not free during this slot');
    }

    let status = 'Scheduled';
    if (type === 'online') {
      if (!online_link || online_link.trim() === '') {
        status = 'Pending';
      }
    }

    const meetingRes = await client.query(
      `INSERT INTO meetings (title, agenda, type, start_time, end_time, room_id, online_link, organizer_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, agenda, type, start_time, end_time, type === 'offline' ? room_id : null, type === 'online' ? online_link : null, req.user.id, status]
    );
    const newMeeting = meetingRes.rows[0];

    for (const uid of participantIds) {
      await client.query(
        'INSERT INTO meeting_participants (meeting_id, user_id, response) VALUES ($1, $2, $3)',
        [newMeeting.id, uid, uid === req.user.id ? 'Accepted' : 'Tentative']
      );
    }

    await client.query(
      'INSERT INTO meeting_status_log (meeting_id, from_status, to_status, changed_by, reason) VALUES ($1, $2, $3, $4, $5)',
      [newMeeting.id, null, status, req.user.id, 'Meeting created']
    );

    await client.query('COMMIT');
    res.status(201).json(newMeeting);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message || 'Server error' });
  } finally {
    client.release();
  }
});

app.get('/api/meetings', authenticate, async (req, res) => {
  try {
    const query = `
      SELECT m.*, 
        (SELECT json_agg(json_build_object('user_id', mp.user_id, 'name', u.name, 'response', mp.response)) 
         FROM meeting_participants mp JOIN users u ON mp.user_id = u.id WHERE mp.meeting_id = m.id) as participants
      FROM meetings m
      WHERE m.id IN (SELECT meeting_id FROM meeting_participants WHERE user_id = $1)
      ORDER BY m.start_time
    `;
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/meetings/:id', authenticate, async (req, res) => {
  try {
    const query = `
      SELECT m.*, 
        (SELECT json_agg(json_build_object('user_id', mp.user_id, 'name', u.name, 'response', mp.response)) 
         FROM meeting_participants mp JOIN users u ON mp.user_id = u.id WHERE mp.meeting_id = m.id) as participants
      FROM meetings m WHERE m.id = $1
    `;
    const result = await pool.query(query, [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Meeting not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/meetings/:id', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { start_time, end_time, room_id, online_link, type, status } = req.body;
    
    const currRes = await client.query('SELECT * FROM meetings WHERE id = $1', [req.params.id]);
    if (currRes.rowCount === 0) throw new Error('Meeting not found');
    const currMeeting = currRes.rows[0];

    if (currMeeting.organizer_id !== req.user.id && req.user.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    let finalStatus = status || currMeeting.status;
    
    if (start_time && end_time && (start_time !== currMeeting.start_time.toISOString() || end_time !== currMeeting.end_time.toISOString())) {
      const start = new Date(start_time);
      const end = new Date(end_time);
      const now = new Date();
      if (start <= now) throw new Error('Start time must be in the future');
      if (start >= end) throw new Error('Start time must be before end time');
      
      const partRes = await client.query('SELECT user_id FROM meeting_participants WHERE meeting_id = $1', [currMeeting.id]);
      const participantIds = partRes.rows.map(r => r.user_id);
      
      const overlapQuery = `
        SELECT m.id FROM meetings m
        JOIN meeting_participants mp ON m.id = mp.meeting_id
        WHERE m.id != $4 AND m.status != 'Cancelled' AND mp.user_id = ANY($1)
        AND (m.start_time < $3 AND m.end_time > $2)
      `;
      const overlapRes = await client.query(overlapQuery, [participantIds, start_time, end_time, currMeeting.id]);
      if (overlapRes.rowCount > 0) throw new Error('Participants have overlapping meetings');

      if ((type || currMeeting.type) === 'offline') {
        const rid = room_id || currMeeting.room_id;
        const roomRes = await client.query('SELECT capacity FROM rooms WHERE id = $1', [rid]);
        if (roomRes.rowCount === 0) throw new Error('Room not found');
        if (roomRes.rows[0].capacity < participantIds.length) throw new Error('Room capacity is less than participants count');
        
        const roomOverlap = await client.query(
          `SELECT id FROM meetings WHERE id != $4 AND room_id = $1 AND status != 'Cancelled' AND (start_time < $3 AND end_time > $2)`,
          [rid, start_time, end_time, currMeeting.id]
        );
        if (roomOverlap.rowCount > 0) throw new Error('Room is not free during this slot');
      }
    }

    if ((type || currMeeting.type) === 'online' && !online_link && !currMeeting.online_link) {
      finalStatus = 'Pending';
    } else if ((type || currMeeting.type) === 'online' && (online_link || currMeeting.online_link) && finalStatus === 'Pending') {
      finalStatus = 'Scheduled';
    }

    const result = await client.query(
      `UPDATE meetings SET start_time = COALESCE($1, start_time), end_time = COALESCE($2, end_time), room_id = COALESCE($3, room_id), online_link = COALESCE($4, online_link), type = COALESCE($5, type), status = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *`,
      [start_time, end_time, room_id, online_link, type, finalStatus, currMeeting.id]
    );

    if (finalStatus !== currMeeting.status) {
      await client.query(
        'INSERT INTO meeting_status_log (meeting_id, from_status, to_status, changed_by, reason) VALUES ($1, $2, $3, $4, $5)',
        [currMeeting.id, currMeeting.status, finalStatus, req.user.id, 'Meeting updated']
      );
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message || 'Server error' });
  } finally {
    client.release();
  }
});

app.delete('/api/meetings/:id', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const currRes = await client.query('SELECT * FROM meetings WHERE id = $1', [req.params.id]);
    if (currRes.rowCount === 0) throw new Error('Meeting not found');
    const currMeeting = currRes.rows[0];

    if (currMeeting.organizer_id !== req.user.id && req.user.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    await client.query(`UPDATE meetings SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [currMeeting.id]);

    await client.query(
      'INSERT INTO meeting_status_log (meeting_id, from_status, to_status, changed_by, reason) VALUES ($1, $2, $3, $4, $5)',
      [currMeeting.id, currMeeting.status, 'Cancelled', req.user.id, 'Meeting cancelled']
    );

    await client.query('COMMIT');
    res.json({ message: 'Meeting cancelled' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message || 'Server error' });
  } finally {
    client.release();
  }
});

app.get('/api/availability', authenticate, async (req, res) => {
  const { participants, date } = req.query;
  try {
    if (!participants || !date) return res.status(400).json({ error: 'Missing parameters' });
    const partArr = participants.split(',').map(Number);
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const query = `
      SELECT start_time, end_time FROM meetings m
      JOIN meeting_participants mp ON m.id = mp.meeting_id
      WHERE m.status != 'Cancelled' AND mp.user_id = ANY($1)
      AND m.start_time >= $2 AND m.end_time <= $3
    `;
    const result = await pool.query(query, [partArr, startOfDay.toISOString(), endOfDay.toISOString()]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/calendar', authenticate, async (req, res) => {
  const { from, to } = req.query;
  try {
    const query = `
      SELECT m.* FROM meetings m
      JOIN meeting_participants mp ON m.id = mp.meeting_id
      WHERE mp.user_id = $1 AND m.status != 'Cancelled'
      AND m.start_time >= $2 AND m.start_time <= $3
      ORDER BY m.start_time
    `;
    const result = await pool.query(query, [req.user.id, from, to]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/reports', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const totalMeetings = await pool.query('SELECT COUNT(*) FROM meetings');
    const cancelledMeetings = await pool.query('SELECT COUNT(*) FROM meetings WHERE status = $1', ['Cancelled']);
    const onlineMeetings = await pool.query('SELECT COUNT(*) FROM meetings WHERE type = $1', ['online']);
    const offlineMeetings = await pool.query('SELECT COUNT(*) FROM meetings WHERE type = $1', ['offline']);
    
    res.json({
      total: parseInt(totalMeetings.rows[0].count),
      cancelled: parseInt(cancelledMeetings.rows[0].count),
      online: parseInt(onlineMeetings.rows[0].count),
      offline: parseInt(offlineMeetings.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;

initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
