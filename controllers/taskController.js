const Task = require('../models/Task');
const User = require('../models/User');

// Helper function to update streak and reward coins
const updateStreak = async (userId, completedDate) => {
  const user = await User.findById(userId);
  
  if (!user) {
    console.log('User not found for coin update');
    return;
  }

  console.log(`Before update - User: ${user.username}, Coins: ${user.coins}, TotalTasks: ${user.totalTasksCompleted}`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastCompleted = user.lastCompletedDate ? new Date(user.lastCompletedDate) : null;
  if (lastCompleted) {
    lastCompleted.setHours(0, 0, 0, 0);
  }

  // Update streak logic (only once per day)
  if (!lastCompleted || lastCompleted.getTime() !== today.getTime()) {
    console.log('Updating streak (first task today or new day)');
    // Calculate streak
    if (lastCompleted) {
      const diffTime = Math.abs(today - lastCompleted);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        user.currentStreak += 1;
      } else {
        // Streak broken
        user.currentStreak = 1;
      }
    } else {
      // First task completion ever
      user.currentStreak = 1;
    }

    // Update longest streak
    if (user.currentStreak > user.longestStreak) {
      user.longestStreak = user.currentStreak;
    }

    user.lastCompletedDate = today;
  } else {
    console.log('Streak already updated today, skipping streak update');
  }

  // Always increment total tasks completed
  user.totalTasksCompleted += 1;
  
  // Always reward coins for completing tasks (10 coins per task)
  const oldCoins = user.coins;
  user.coins += 10;
  
  console.log(`After update - Coins: ${oldCoins} → ${user.coins} (+10), TotalTasks: ${user.totalTasksCompleted}`);
  
  await user.save();
  
  console.log(`✅ User saved successfully. Final coins: ${user.coins}`);
};

// @desc    Get all tasks for user
// @route   GET /api/tasks
const getTasks = async (req, res) => {
  try {
    let tasks = await Task.find({ user: req.user._id });
    
    // Custom sort: active first, then habits, then priority (high > medium > low), then newest
    tasks.sort((a, b) => {
      // 1. Active tasks first (completed: false before true)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // 2. Habits before regular tasks
      if (a.isHabit !== b.isHabit) {
        return b.isHabit ? 1 : -1;
      }
      
      // 3. Priority order: high > medium > low
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // 4. Newest first
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Failed to fetch tasks' 
        : error.message 
    });
  }
};

// @desc    Create task
// @route   POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;

    const task = await Task.create({
      user: req.user._id,
      title,
      description,
      dueDate,
      priority
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Failed to create task' 
        : error.message 
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if task belongs to user
    if (task.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body,
        ...(req.body.completed === true && { completedAt: new Date() })
      },
      { new: true, runValidators: true }
    );

    // If task is being completed, update streak and reward coins
    if (req.body.completed === true && !task.completed) {
      console.log(`\n🎯 Task completed: "${task.title}"`);
      console.log(`Calling updateStreak for user ${req.user._id}...`);
      await updateStreak(req.user._id, new Date());
      updatedTask.hasFireLabel = true;
      
      // Increment habit progress if it's a habit
      if (task.isHabit) {
        updatedTask.habitProgress.current = Math.min(
          (task.habitProgress?.current || 0) + 1,
          task.habitProgress?.total || 90
        );
      }
      
      await updatedTask.save();
      console.log('✅ Task completion processed successfully\n');
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Failed to update task' 
        : error.message 
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if task belongs to user
    if (task.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task removed' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Failed to delete task' 
        : error.message 
    });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask
};
