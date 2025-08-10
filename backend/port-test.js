require('dotenv').config();
console.log('PORT from env:', process.env.PORT);
console.log('Using port:', process.env.PORT || 5000);
