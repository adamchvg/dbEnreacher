// openai.js
const { OpenAI } = require('openai');

require('dotenv').config();
const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API
});


async function createChatCompletion(prompt) {
    try {
        const response = await openaiClient.chat.completions.create({
            model: 'gpt-3.5-turbo', 
            messages: [
                { role: 'system', content: 'You are a helpful assistant' },
                { role: 'user', content: prompt},
            ],
        });
        return parseInt(response.choices[0].message.content); 
    } catch (error) {
        console.error('Error in createChatCompletion:', error);
        throw error; 
    }
}

async function counter(prompt) {
    let total = 0;
    let count = 0;

    while (count < 3) {
        const result = await createChatCompletion(prompt);
        total += result;
        count++;
        if (result <= 3) {
            break;
        }
    }

    const average = total / count;
    console.log(average);
    return average;
}

module.exports = { createChatCompletion, counter };
