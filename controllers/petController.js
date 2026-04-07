const Pet = require('../models/Pet');
const User = require('../models/User');

// Shop items configuration
const shopItems = {
  food: [
    { id: 'basic_food', name: 'Basic Food', price: 10, hungerRestore: 20, type: 'food' },
    { id: 'premium_food', name: 'Premium Food', price: 25, hungerRestore: 50, type: 'food' },
    { id: 'deluxe_meal', name: 'Deluxe Meal', price: 50, hungerRestore: 100, type: 'food' }
  ],
  clothes: [
    { id: 'hat', name: 'Cool Hat', price: 30, type: 'clothes', slot: 'hat' },
    { id: 'scarf', name: 'Warm Scarf', price: 25, type: 'clothes', slot: 'scarf' },
    { id: 'glasses', name: 'Stylish Glasses', price: 35, type: 'clothes', slot: 'glasses' },
    { id: 'bowtie', name: 'Elegant Bowtie', price: 40, type: 'clothes', slot: 'bowtie' },
    { id: 'cape', name: 'Hero Cape', price: 60, type: 'clothes', slot: 'cape' },
    { id: 'crown', name: 'Royal Crown', price: 100, type: 'clothes', slot: 'crown' },
    { id: 'hoodie', name: 'Cozy Hoodie', price: 45, type: 'clothes', slot: 'hoodie' }
  ],
  toys: [
    { id: 'ball', name: 'Play Ball', price: 15, happinessBoost: 15, type: 'toy' },
    { id: 'puzzle', name: 'Brain Puzzle', price: 30, happinessBoost: 30, type: 'toy' },
    { id: 'treasure', name: 'Treasure Hunt', price: 50, happinessBoost: 50, type: 'toy' }
  ]
};

// @desc    Get user's pet
// @route   GET /api/pet
const getPet = async (req, res) => {
  try {
    let pet = await Pet.findOne({ user: req.user._id });
    
    // If no pet exists, create a default one
    if (!pet) {
      pet = await Pet.create({
        user: req.user._id,
        name: 'Buddy',
        type: 'cat'
      });
    } else {
      // Apply stat decay based on time passed
      pet.applyStatDecay();
      await pet.save();
    }
    
    console.log('📦 Pet inventory data:', {
      foodInventory: pet.foodInventory,
      toyInventory: pet.toyInventory
    });
    
    res.json(pet);
  } catch (error) {
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }
};

// @desc    Create or update pet
// @route   POST /api/pet
const createPet = async (req, res) => {
  try {
    const { name, type } = req.body;

    let pet = await Pet.findOne({ user: req.user._id });

    if (pet) {
      // Update existing pet
      pet.name = name || pet.name;
      pet.type = type || pet.type;
      await pet.save();
      return res.json(pet);
    }

    // Create new pet
    pet = await Pet.create({
      user: req.user._id,
      name: name || 'Buddy',
      type: type || 'cat'
    });

    res.status(201).json(pet);
  } catch (error) {
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }
};

// @desc    Feed pet
// @route   POST /api/pet/feed
const feedPet = async (req, res) => {
  try {
    const { foodId } = req.body;
    const pet = await Pet.findOne({ user: req.user._id });
    const user = await User.findById(req.user._id);

    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    // Apply stat decay before feeding
    pet.applyStatDecay();

    const food = shopItems.food.find(f => f.id === foodId);
    if (!food) {
      return res.status(400).json({ message: 'Invalid food item' });
    }

    // Check if food exists in inventory
    const foodInInventory = pet.foodInventory.find(inv => inv.itemId === foodId);
    
    if (!foodInInventory || foodInInventory.quantity <= 0) {
      return res.status(400).json({ message: 'No food in inventory. Please buy some from the shop!' });
    }

    // Decrease food quantity from inventory
    foodInInventory.quantity -= 1;
    
    // Remove item from inventory if quantity is 0
    pet.foodInventory = pet.foodInventory.filter(inv => inv.quantity > 0);

    // Feed pet
    pet.hunger = Math.min(pet.hunger + food.hungerRestore, 100);
    pet.happiness = Math.min(pet.happiness + 5, 100);
    pet.lastFedAt = new Date();

    await user.save();
    await pet.save();

    res.json({ pet, user, message: `Fed ${pet.name} with ${food.name}! 🍖` });
  } catch (error) {
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }
};

// @desc    Play with pet
// @route   POST /api/pet/play
const playWithPet = async (req, res) => {
  try {
    const { toyId } = req.body;
    const pet = await Pet.findOne({ user: req.user._id });
    const user = await User.findById(req.user._id);

    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    // Apply stat decay before playing
    pet.applyStatDecay();

    const toy = shopItems.toys.find(t => t.id === toyId);
    if (!toy) {
      return res.status(400).json({ message: 'Invalid toy' });
    }

    // Check if toy exists in inventory
    const toyInInventory = pet.toyInventory.find(inv => inv.itemId === toyId);
    
    if (!toyInInventory || toyInInventory.quantity <= 0) {
      return res.status(400).json({ message: 'No toys in inventory. Please buy some from the shop!' });
    }

    // Decrease toy quantity from inventory
    toyInInventory.quantity -= 1;
    
    // Remove item from inventory if quantity is 0
    pet.toyInventory = pet.toyInventory.filter(inv => inv.quantity > 0);

    // Play with pet
    pet.happiness = Math.min(pet.happiness + toy.happinessBoost, 100);
    pet.energy = Math.max(pet.energy - 10, 0);
    pet.experience += 10;
    pet.lastPlayedAt = new Date();

    // Level up check
    if (pet.experience >= pet.level * 100) {
      pet.level += 1;
      pet.experience = 0;
      
      // Check for evolution
      const oldStage = pet.evolutionStage;
      if (pet.level >= 5 && pet.evolutionStage < 2) {
        pet.evolutionStage = 2; // Young
      } else if (pet.level >= 10 && pet.evolutionStage < 3) {
        pet.evolutionStage = 3; // Adult
      } else if (pet.level >= 15 && pet.evolutionStage < 4) {
        pet.evolutionStage = 4; // Mature
      } else if (pet.level >= 20 && pet.evolutionStage < 5) {
        pet.evolutionStage = 5; // Fierce
      }
      
      // If evolution occurred, add bonus stats
      if (pet.evolutionStage > oldStage) {
        pet.happiness = Math.min(pet.happiness + 20, 100);
        pet.energy = Math.min(pet.energy + 20, 100);
      }
    }

    await user.save();
    await pet.save();

    res.json({ pet, user, message: `Played with ${pet.name} using ${toy.name}! 🎮` });
  } catch (error) {
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }
};

// @desc    Buy item from shop
// @route   POST /api/pet/buy
const buyItem = async (req, res) => {
  try {
    const { itemId, itemType } = req.body;
    const user = await User.findById(req.user._id);
    const pet = await Pet.findOne({ user: req.user._id });

    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    let item;
    if (itemType === 'clothes') {
      item = shopItems.clothes.find(i => i.id === itemId);
    } else if (itemType === 'food') {
      item = shopItems.food.find(i => i.id === itemId);
    } else if (itemType === 'toys') {
      item = shopItems.toys.find(i => i.id === itemId);
    }

    if (!item) {
      return res.status(400).json({ message: 'Invalid item' });
    }

    if (user.coins < item.price) {
      return res.status(400).json({ message: 'Not enough coins' });
    }

    // Deduct coins
    user.coins -= item.price;

    // Add item to appropriate inventory
    if (itemType === 'clothes') {
      // Clothes are permanently owned (no quantity needed)
      if (!pet.clothes.includes(itemId)) {
        pet.clothes.push(itemId);
      }
    } else if (itemType === 'food') {
      // Add to food inventory
      const existingItem = pet.foodInventory.find(inv => inv.itemId === itemId);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        pet.foodInventory.push({ itemId, quantity: 1 });
      }
    } else if (itemType === 'toys') {
      // Add to toy inventory
      const existingItem = pet.toyInventory.find(inv => inv.itemId === itemId);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        pet.toyInventory.push({ itemId, quantity: 1 });
      }
    }

    await user.save();
    await pet.save();

    console.log('✅ Item purchased and added to inventory:', {
      item: item.name,
      type: itemType,
      foodInventory: pet.foodInventory,
      toyInventory: pet.toyInventory
    });

    res.json({ 
      pet, 
      user, 
      message: `Purchased ${item.name}! Added to inventory. 🛍️`,
      item 
    });
  } catch (error) {
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }
};

// @desc    Equip/Unequip clothes
// @route   POST /api/pet/equip
const equipClothes = async (req, res) => {
  try {
    const { itemId, slot } = req.body;
    const pet = await Pet.findOne({ user: req.user._id });

    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    // Apply stat decay before equipping
    pet.applyStatDecay();

    if (!pet.clothes.includes(itemId) && itemId !== 'none') {
      return res.status(400).json({ message: 'You do not own this item' });
    }

    // Equip or unequip
    if (itemId === 'none') {
      pet.activeClothes[slot] = null;
    } else {
      pet.activeClothes[slot] = itemId;
    }

    // Calculate cuteness based on equipped items
    let cutenessBoost = 0;
    const equippedItems = Object.values(pet.activeClothes).filter(item => item !== null);
    
    // Each equipped item adds cuteness
    cutenessBoost = equippedItems.length * 10;
    
    // Bonus for wearing multiple items
    if (equippedItems.length >= 3) {
      cutenessBoost += 15; // Full outfit bonus
    } else if (equippedItems.length >= 2) {
      cutenessBoost += 5; // Partial outfit bonus
    }
    
    pet.cuteness = Math.min(cutenessBoost, 100);

    await pet.save();

    res.json({ pet, message: itemId === 'none' ? `Removed ${slot}!` : `Equipped ${itemId}! 👕` });
  } catch (error) {
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }
};

// @desc    Get shop items
// @route   GET /api/pet/shop
const getShop = async (req, res) => {
  try {
    res.json(shopItems);
  } catch (error) {
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }
};

// @desc    Rename pet
// @route   PUT /api/pet/name
const renamePet = async (req, res) => {
  try {
    const { name } = req.body;
    const pet = await Pet.findOne({ user: req.user._id });

    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    pet.name = name;
    await pet.save();

    res.json({ pet, message: `Pet renamed to ${name}! ✨` });
  } catch (error) {
    res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }
};

module.exports = {
  getPet,
  createPet,
  feedPet,
  playWithPet,
  buyItem,
  equipClothes,
  getShop,
  renamePet
};
