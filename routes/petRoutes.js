const express = require('express');
const router = express.Router();
const {
  getPet,
  createPet,
  feedPet,
  playWithPet,
  buyItem,
  equipClothes,
  getShop,
  renamePet
} = require('../controllers/petController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

router.route('/')
  .get(getPet)
  .post(createPet);

router.get('/shop', getShop);
router.post('/feed', feedPet);
router.post('/play', playWithPet);
router.post('/buy', buyItem);
router.post('/equip', equipClothes);
router.put('/name', renamePet);

module.exports = router;
