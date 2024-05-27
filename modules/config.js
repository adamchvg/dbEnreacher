const fs = require('fs');
require('dotenv').config();

const envFilePath = '.env';

const inMemoryConfig = {};

// Load initial configuration from .env file
function loadConfig() {
  const envContent = fs.readFileSync(envFilePath, 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      inMemoryConfig[key.trim()] = value.trim();
    }
  });
}

// Update .env file with new configuration
function updateEnvFile(data) {
  try {
    let envContent = fs.readFileSync(envFilePath, 'utf8');

    let lines = envContent.split('\n');
    let newData = {};

    Object.keys(data).forEach(key => {
      if (data[key] !== null) {
        newData[key.toUpperCase()] = data[key];
        inMemoryConfig[key.toUpperCase()] = data[key]; // Update in-memory configuration
      }
    });

    lines = lines.map(line => {
      let [key, value] = line.split('=');
      key = key.trim().toUpperCase();
      if (newData.hasOwnProperty(key)) {
        if (newData[key] !== null) {
          return `${key}=${newData[key]}`;
        } else {
          return line;
        }
      }
      return line;
    });

    fs.writeFileSync(envFilePath, lines.join('\n'), { flag: 'w' });
  } catch (error) {
    console.error('Error updating .env file:', error);
  }
}

// Initialize the configuration on module load
loadConfig();

module.exports = {
  inMemoryConfig,
  loadConfig,
  updateEnvFile
};
