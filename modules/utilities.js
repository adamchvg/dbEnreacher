//utilities.js
const { OpenAI } = require('openai');

require('dotenv').config();
const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API
});


async function createChatCompletion(prompt) {
    try {
        const response = await openaiClient.chat.completions.create({
            model: 'gpt-4', 
            messages: [
                { role: 'system', content: 'You are a helpful assistant' },
                { role: 'user', content: prompt},
            ],
        });
        return response.choices[0].message.content; 
    } catch (error) {
        console.error('Error in createChatCompletion:', error);
        throw error; 
    }
}


//signal to webhook
async function sendFinishSignal(targetUrl) {
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'data processed' }),
      });
  
      if (response.ok) {
        console.log('Successfully sent "data processed" to webhook');
      } else {
        console.error(`Failed to send "data processed" to webhook: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending finish signal:', error);
    }
}

//remove duplicates from google sheets
function removeDuplicates(results) {
    const itemsFound = new Map();

    for (const item of results) {
        const key = item.slice(0, 10).join('|');
        itemsFound.set(key, item);
    }
    return Array.from(itemsFound.values());
}

function toggleChatbotWindow() {
    var chatbotWindow = document.getElementById('chatbotWindow');
    if (chatbotWindow.style.display === 'block') {
        chatbotWindow.style.display = 'none';
    } else {
        chatbotWindow.style.display = 'block';
    }
}


//random number to set timeout
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

//set timeout
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {sendFinishSignal, removeDuplicates, getRandomNumber, sleep, createChatCompletion, toggleChatbotWindow};