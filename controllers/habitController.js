const Habit = require('../models/Habit');
const Task = require('../models/Task');

// @desc    Create a new habit
// @route   POST /api/habits
const createHabit = async (req, res) => {
  try {
    const { title, description, priority } = req.body;

    const habit = await Habit.create({
      user: req.user._id,
      title,
      description,
      priority
    });

    // Create today's task for this habit
    await Task.create({
      user: req.user._id,
      title,
      description,
      priority,
      isHabit: true
    });

    res.status(201).json(habit);
  } catch (error) {
    console.error('Create habit error:', error);
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Failed to create habit' 
        : error.message 
    });
  }
};

// @desc    Get all habits for user
// @route   GET /api/habits
const getHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ 
      user: req.user._id,
      isActive: true 
    }).sort({ 
      priority: 1,
      createdAt: -1 
    });
    res.json(habits);
  } catch (error) {
    console.error('Get habits error:', error);
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Failed to fetch habits' 
        : error.message 
    });
  }
};

// @desc    Delete habit
// @route   DELETE /api/habits/:id
const deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    if (habit.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Deactivate habit
    habit.isActive = false;
    await habit.save();

    res.json({ message: 'Habit deactivated' });
  } catch (error) {
    console.error('Delete habit error:', error);
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Failed to delete habit' 
        : error.message 
    });
  }
};

// @desc    Generate daily tasks from habits
// @route   POST /api/habits/generate-daily
const generateDailyTasks = async (req, res) => {
  try {
    const habits = await Habit.find({ 
      user: req.user._id,
      isActive: true 
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const createdTasks = [];

    for (const habit of habits) {
      // Check if task already exists for today
      const existingTask = await Task.findOne({
        user: req.user._id,
        isHabit: true,
        title: habit.title,
        createdAt: { $gte: today }
      });

      if (!existingTask) {
        const task = await Task.create({
          user: req.user._id,
          title: habit.title,
          description: habit.description,
          priority: habit.priority,
          isHabit: true
        });
        createdTasks.push(task);
      }
    }

    res.json({ 
      message: `Created ${createdTasks.length} daily habit tasks`,
      tasks: createdTasks 
    });
  } catch (error) {
    console.error('Generate daily tasks error:', error);
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Failed to generate daily tasks' 
        : error.message 
    });
  }
};

module.exports = {
  createHabit,
  getHabits,
  deleteHabit,
  generateDailyTasks
};
