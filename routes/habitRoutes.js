const express = require('express');
const router = express.Router();
const {
  createHabit,
  getHabits,
  deleteHabit,
  generateDailyTasks
} = require('../controllers/habitController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getHabits)
  .post(protect, createHabit);

router.delete('/:id', protect, deleteHabit);
router.post('/generate-daily', protect, generateDailyTasks);

module.exports = router;
