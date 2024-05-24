// config.js
const fs = require('fs');
require('dotenv').config();

const envFilePath = '.env';

const config = {};

// Загрузка начальной конфигурации из файла .env
function loadConfig() {
  const envContent = fs.readFileSync(envFilePath, 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      config[key.trim()] = value.trim();
    }
  });
}

// Загрузка начальной конфигурации
loadConfig();

function getConfig(key) {
  return config[key];
}

function setConfig(key, value) {
  config[key] = value;
}

function updateEnvFile(data) {
  try {
    let envContent = fs.readFileSync(envFilePath, 'utf8');

    let lines = envContent.split('\n');
    let newData = {};

    Object.keys(data).forEach(key => {
      if (data[key] !== null) {
        newData[key.toUpperCase()] = data[key];
        setConfig(key.toUpperCase(), data[key]); // Обновление конфигурации в памяти
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
    console.error('Ошибка при обновлении .env файла:', error);
  }
}

module.exports = {
  getConfig,
  setConfig,
  updateEnvFile
};
