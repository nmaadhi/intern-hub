// Import the express library we just installed
const express = require('express');

// Create an Express app instance
const app = express();

// Middleware: tell Express to understand JSON in request bodies
app.use(express.json());

// A simple test route — GET request to "/" returns a message
app.get('/', (req, res) => {
  res.json({ message: 'InternHub backend is running 🚀' });
});

// Define the port the server will listen on
const PORT = 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});