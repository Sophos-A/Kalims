const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Simple test server running');
});

app.listen(PORT, () => {
  console.log(`Simple test server running on port ${PORT}`);
});
