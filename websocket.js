const express = require('express');
const session = require('express-session');
const {fetchAndProcessData, sendFinishSignal} = require('./modules/indeed');
const {createChatCompletion} = require('./modules/utilities')
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
require('dotenv').config();
const socketIO = require('socket.io');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const io = socketIO(server);

const fs = require('fs');
require('dotenv').config();

const envFilePath = '.env';

const inMemoryConfig = {};

// Загрузка начальной конфигурации из файла .env
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

// Загрузка начальной конфигурации
loadConfig();


app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());



// Генерация секретного ключа для сессии
const sessionSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Настройка express-session
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true
}));

// Маршрут для корневого пути (главной страницы)
app.get('/', (req, res) => {
  if (!req.session.userId) {
    res.redirect('/auth/login');
  } else {
    res.sendFile(__dirname + '/public/main.html');
  }
});

// Маршрут для аутентификации пользователя
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Проверяем пользователя
  const userExists = checkUser(email, password);
  if (userExists) {
    // Устанавливаем сессию для аутентифицированного пользователя
    req.session.userId = email;
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// Маршрут для главной страницы
app.get('/main', (req, res) => {
  if (!req.session.userId) {

    res.redirect('/auth/login');
  } else {
 
    res.sendFile(__dirname + '/public/main.html');
  }
});

// Маршрут для страницы аутентификации
app.get('/auth/login', (req, res) => {
  // Проверяем, если пользователь уже аутентифицирован, перенаправляем на главную страницу
  if (req.session.userId) {
    res.redirect('/main');
  } else {
    res.sendFile(__dirname + '/public/auth/login.html');
  }
});
// Маршрут для главной страницы
app.get('/main', (req, res) => {
  res.sendFile(__dirname + '/public/main.html');
});

const makeWebhook = 'https://hook.eu2.make.com/3u6dhea2smsbh2arkrxdp97os9fej0nv';
const usersFilePath = 'users.json';

app.post('/script-control', async (req, res) => {
  try {
    const data = req.body;
    const action = data.action;
    const spreadsheetID = data.spreadsheet_id;
    if (action === "start") {
      try {
        res.status(200).send("script running successfully");
        await updateEnvFile({SPREADSHEET_ID: spreadsheetID});
        await fetchAndProcessData();
      } catch(error) {
        console.error("Произошла ошибка: ", error);
      }
    } else {
      res.status(400).send("Invalid action");
    }
  } catch (error) {
    console.error("Произошла ошибка:", error);
    res.status(500).send("Internal server error");
  }
});

app.post('/bot', (req, res) => {
  res.render('main');
})

function updateEnvFile(data) {
  try {
    let envContent = fs.readFileSync(envFilePath, 'utf8');

    let lines = envContent.split('\n');
    let newData = {};

    Object.keys(data).forEach(key => {
      if (data[key] !== null) {
        newData[key.toUpperCase()] = data[key];
        inMemoryConfig[key.toUpperCase()] = data[key]; // Обновление конфигурации в памяти
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


// Функция для проверки наличия пользователя в базе данных
function checkUser(email, password) {
  try {
    if (fs.existsSync(usersFilePath)) {
      const usersContent = fs.readFileSync(usersFilePath, 'utf8');
      const usersData = JSON.parse(usersContent);
      
      for (let i = 0; i < usersData.length; i++) {
        const userData = usersData[i];
        if (userData.email === email && userData.password === password) {
          return true; 
        }
      }
    }
    return false; 
  } catch (error) {
    console.error('Error checking user:', error);
    return false;
  }
}

let messageHistory = [];
// Обработка WebSocket-соединения
wss.on('connection', ws => {
  console.log('Client connected');

  // Обработка сообщений от клиента
  ws.on('message', async message => {
    try {
      const data = JSON.parse(message);

      console.log(data );

      const { action, serper, gemini, openai, webhook, spreadsheetID, email, password, userId, bot } = data;
      if (action === 'chatBot') {
        try {
            messageHistory.push({ role: 'client', content: bot });
    
            if (messageHistory.length > 10) {
                messageHistory.shift(); 
            }

            let prompt = '';
            for (let i = Math.max(0, messageHistory.length - 10); i < messageHistory.length; i++) {
                const msg = messageHistory[i];
                prompt += `${msg.role === 'client' ? 'Client: ' : 'Bot: '} ${msg.content}\n`;
            }
    
            const response = await createChatCompletion(prompt);
            console.log(response);
    
            messageHistory.push({ role: 'bot', content: response });
    
            ws.send(JSON.stringify({ message: response, bot: true }));
        } catch (error) {
            console.error('Error:', error);
            ws.send(JSON.stringify({ error: 'An error occurred while processing the message' }));
        }
    }
    

      if (action === 'login') {
        // Проверка пользователя
        const userExists = checkUser(email, password);
        if (userExists) {
          ws.send(JSON.stringify({ success: true }));
        } else {
          ws.send(JSON.stringify({ success: false }));
        }
      } else if (action === 'userId') {

        console.log('Received user ID:', userId);
      } if (action === 'start') {
        ws.send(JSON.stringify({ action: 'running' }));
        await fetchAndProcessData();
        ws.send(JSON.stringify({ action: 'finish' }));
      } 
      if (action === 'stop') {
        await sendFinishSignal(makeWebhook);
        console.log('WebSocket server closed');
        ws.send(JSON.stringify({ action: 'running' }));
        process.exit();
      }
       else if (action === 'updateKeys') {
        console.log({ SERPER_API: serper, GEMINI_API: gemini, OPENAI_API: openai, WEBHOOK: webhook, SPREADSHEET_ID: spreadsheetID});
        updateEnvFile({ SERPER_API: serper, GEMINI_API: gemini, OPENAI_API: openai, WEBHOOK: webhook, SPREADSHEET_ID: spreadsheetID});
        ws.send(JSON.stringify({ action: 'API keys updated successfully' }));
      } else {
        
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send('Error handling message');
    }
  });

 
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});


// Установка заголовков для CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://146.190.59.103'); 
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// HTTP маршрут для принятия WebSocket-соединений
app.get('/ws', (req, res) => {
  res.send('WebSocket server is running');
});

const port = 8080;
server.listen(port, () => console.log(`Server running on port ${port}`));
