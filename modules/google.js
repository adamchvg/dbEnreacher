// google.js
const { google } = require('googleapis');
require('dotenv').config();

const google_sheet_ID = process.env.SPREADSHEET_ID;

const auth = new google.auth.GoogleAuth({
    keyFile: './google.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

async function readFromSheet() {
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = google_sheet_ID; 
    const range = 'A2:J'; 

    try {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        console.log('Read successful');
        return response.data.values;
    } catch (error) {
        console.error('Error on read', error);
        throw error;
    }
}

async function writeToSheet(spreadsheetId, range, values) {
    const sheets = google.sheets({ version: 'v4', auth });
    try {
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });
        console.log('Update successful', response.data);
        return response.data;
    } catch (error) {
        console.error('Error on update', error);
        throw error;
    }
}

async function clearSheet(spreadsheetId, range) {
    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
    try {
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range,
        });
        console.log('Sheet cleared successfully');
    } catch (error) {
        console.error('Error clearing sheet:', error);
        throw error;
    }
}

async function updateSheetWithUniqueData(results) {
    const uniqueResults = removeDuplicates(results);

    const spreadsheetId = google_sheet_ID;


    await clearSheet(spreadsheetId, 'A2:Z'); 
    await writeToSheet(spreadsheetId, 'A2', uniqueResults);
}

async function normalizeData() {
    const originalData = await readFromSheet();
    if (!originalData) {
        console.error('No data returned from the sheet');
        return [];
    }
    return originalData.map(row => {
        if (Array.isArray(row[0])) {
            return row.flat().slice(0, 10);
        }
        return row.slice(0, 10);
    });
}

module.exports = { readFromSheet, writeToSheet, clearSheet, updateSheetWithUniqueData, normalizeData };
