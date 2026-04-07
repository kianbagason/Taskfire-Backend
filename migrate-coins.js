const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function initializeCoins() {
  try {
    console.log('Starting coin initialization...');
    
    // Find all users without coins field or with undefined coins
    const users = await User.find({
      $or: [
        { coins: { $exists: false } },
        { coins: null },
        { coins: undefined }
      ]
    });
    
    console.log(`Found ${users.length} users without coins`);
    
    // Update each user to have 0 coins
    let updated = 0;
    for (const user of users) {
      user.coins = 0;
      await user.save();
      updated++;
      console.log(`Updated user: ${user.username} - Coins: 0`);
    }
    
    console.log(`\n✅ Successfully initialized coins for ${updated} users!`);
    console.log('All users now have coins field set to 0');
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing coins:', error);
    process.exit(1);
  }
}

initializeCoins();
