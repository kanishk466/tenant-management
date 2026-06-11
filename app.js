
require('dotenv').config();

const express = require('express');
const prisma = require('./src/config/prisma');
const routes = require("./src/routes");
const cors = require('cors');

app.use(cors());

const app = express();

app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: 'Database Connected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.use("/api", routes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});