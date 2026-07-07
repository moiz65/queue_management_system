const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Get peak hours data
router.get('/peak-hours', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        HOUR(check_in_time) as hour,
        COUNT(*) as customers
      FROM queue
      WHERE check_in_time >= CURDATE()
      GROUP BY HOUR(check_in_time)
      ORDER BY hour ASC
    `);
    
    const hours = rows.map(row => ({
      hour: formatHour(row.hour),
      customers: row.customers
    }));
    
    res.json(hours);
  } catch (error) {
    console.error('Error fetching peak hours:', error);
    res.json([]);
  }
});

// Get weekly trend
router.get('/weekly-trend', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        DAYNAME(check_in_time) as day,
        COUNT(*) as customers
      FROM queue
      WHERE check_in_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DAYNAME(check_in_time)
      ORDER BY FIELD(DAYNAME(check_in_time), 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching weekly trend:', error);
    res.json([]);
  }
});

function formatHour(hour) {
  if (hour === 0) return '12AM';
  if (hour < 12) return `${hour}AM`;
  if (hour === 12) return '12PM';
  return `${hour - 12}PM`;
}

module.exports = router;