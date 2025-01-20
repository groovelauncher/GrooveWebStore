import fs from 'fs';
import path from 'path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const dbPath = path.join(__dirname, '../db');

// Read all folders in the /db directory
const getFolders = () => {
    return fs.readdirSync(dbPath).filter(file =>
        fs.statSync(path.join(dbPath, file)).isDirectory()
    );
};

// Create the store object
// Create the store object
const storeData = {
    "store": {
        "name": "Groove Web Store",
        "active": true,
        "db": getFolders(),
        "lastUpdated": new Date().toISOString()
    }
};

try {
    fs.writeFileSync(
        path.join(__dirname, '../store.json'),
        JSON.stringify(storeData, null, 2)
    );
    console.log('Store data saved successfully');
} catch (error) {
    console.error('Error saving store data:', error);
}

// Write to a JSON file (optional)
fs.writeFileSync(
    path.join(__dirname, '../store.json'),
    JSON.stringify(storeData, null, 2)
);