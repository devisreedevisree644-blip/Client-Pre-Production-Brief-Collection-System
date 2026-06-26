const app = require('./app');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the root folder (trigger reload 3)
dotenv.config({ path: path.join(__dirname, '../../.env') });

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(` DigiQuest Pre-Production Brief Server is running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(` API Endpoint: http://localhost:${PORT}`);
  console.log(` Health Check: http://localhost:${PORT}/api/health`);
  console.log(`================================================================`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
