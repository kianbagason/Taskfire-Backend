const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Pet name is required'],
    trim: true,
    default: 'Buddy'
  },
  type: {
    type: String,
    enum: ['cat', 'dog', 'rabbit', 'hamster', 'penguin', 'fox'],
    default: 'cat'
  },
  level: {
    type: Number,
    default: 1
  },
  evolutionStage: {
    type: Number,
    default: 1, // 1=Baby, 2=Young, 3=Adult, 4=Mature, 5=Fierce
    min: 1,
    max: 5
  },
  experience: {
    type: Number,
    default: 0
  },
  happiness: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  hunger: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  energy: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  cuteness: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  clothes: [{
    type: String,
    enum: ['none', 'hat', 'scarf', 'glasses', 'bowtie', 'cape', 'crown', 'hoodie']
  }],
  // Inventory for consumable items (food and toys)
  foodInventory: [{
    itemId: String,
    quantity: {
      type: Number,
      default: 0
    }
  }],
  toyInventory: [{
    itemId: String,
    quantity: {
      type: Number,
      default: 0
    }
  }],
  accessories: [{
    type: String
  }],
  activeClothes: {
    hat: {
      type: String,
      default: null
    },
    scarf: {
      type: String,
      default: null
    },
    glasses: {
      type: String,
      default: null
    },
    bowtie: {
      type: String,
      default: null
    },
    cape: {
      type: String,
      default: null
    },
    crown: {
      type: String,
      default: null
    },
    hoodie: {
      type: String,
      default: null
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastFedAt: {
    type: Date,
    default: Date.now
  },
  lastPlayedAt: {
    type: Date,
    default: Date.now
  },
  lastStatDecayAt: {
    type: Date,
    default: Date.now
  }
});

// Method to calculate and apply stat decay based on time passed
petSchema.methods.applyStatDecay = function() {
  const now = new Date();
  const lastDecay = this.lastStatDecayAt || this.createdAt;
  
  // Calculate hours passed since last decay
  const hoursPassed = Math.floor((now - lastDecay) / (1000 * 60 * 60));
  
  if (hoursPassed > 0) {
    // Decay stats by 1 point per hour
    this.hunger = Math.max(this.hunger - hoursPassed, 0);
    this.happiness = Math.max(this.happiness - hoursPassed, 0);
    this.energy = Math.max(this.energy - hoursPassed, 0);
    
    // Update last decay time
    this.lastStatDecayAt = now;
  }
  
  return this;
};

module.exports = mongoose.model('Pet', petSchema);
