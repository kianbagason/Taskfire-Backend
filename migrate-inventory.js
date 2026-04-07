const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Pet = require('./models/Pet');

dotenv.config();

const migratePetInventory = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all pets
    const pets = await Pet.find({});
    console.log(`Found ${pets.length} pet(s) to migrate`);

    let updated = 0;

    for (const pet of pets) {
      let needsUpdate = false;

      // Initialize foodInventory if missing
      if (!pet.foodInventory || pet.foodInventory.length === 0) {
        pet.foodInventory = [];
        needsUpdate = true;
      }

      // Initialize toyInventory if missing
      if (!pet.toyInventory || pet.toyInventory.length === 0) {
        pet.toyInventory = [];
        needsUpdate = true;
      }

      // Initialize evolutionStage if missing
      if (!pet.evolutionStage) {
        pet.evolutionStage = 1;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await pet.save();
        updated++;
        console.log(`✅ Updated pet: ${pet.name} (${pet._id})`);
      }
    }

    console.log(`\n🎉 Migration complete! Updated ${updated} pet(s)`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migratePetInventory();
