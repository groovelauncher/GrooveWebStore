import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const colors = {
    reset: '\x1b[0m%s\x1b[0m',
    red: '\x1b[31m%s\x1b[0m',
    green: '\x1b[32m%s\x1b[0m',
    blue: '\x1b[34m%s\x1b[0m',
    yellow: '\x1b[33m%s\x1b[0m',
    cyan: '\x1b[36m%s\x1b[0m',
    magenta: '\x1b[35m%s\x1b[0m'
};
const validCategories = ['System', 'Multimedia', 'Internet', 'Games', 'Development',
    'Science & Education', 'Reading', 'Money', 'Navigation & Maps', 'Phone & SMS',
    'Security', 'Sports & Health', 'Theming', 'Time', 'Writing'];

async function validateManifest(manifestPath) {
    try {
        // Read and parse manifest.json
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        // Check required fields
        if (!manifest.name || !manifest.displayName || !manifest.description || !manifest.fullDescription ||
            !manifest.id || !manifest.author || !manifest.type || !manifest.entry ||
            !manifest.versions || !manifest.icon || !manifest.featureGraphic || !manifest.category) {
            throw new Error('Missing required fields in manifest.json');
        }

        // Validate string types
        if (typeof manifest.name !== 'string' || typeof manifest.displayName !== 'string' ||
            typeof manifest.description !== 'string' || typeof manifest.fullDescription !== 'string') {
            throw new Error('name, displayName, description and fullDescription must be strings');
        }

        // Validate tags if they exist
        if (manifest.tags) {
            if (!Array.isArray(manifest.tags)) {
                throw new Error('Tags must be an array');
            }
            if (manifest.tags.length > 10) {
                throw new Error('Maximum 10 tags allowed');
            }
            if (!manifest.tags.every(tag => typeof tag === 'string' && tag.length <= 15)) {
                throw new Error('Tags must be strings with maximum length of 15 characters');
            }
        }

        // Validate icon and feature graphic paths
        if (manifest.icon.includes('..') || manifest.featureGraphic.includes('..')) {
            throw new Error('Icon and feature graphic paths cannot use ".." - must be relative to manifest location');
        }
        // Check file extensions
        const validExtensions = ['.webp', '.png', '.jpeg', '.jpg'];
        const iconExt = path.extname(manifest.icon).toLowerCase();
        const featureExt = path.extname(manifest.featureGraphic).toLowerCase();

        if (!validExtensions.includes(iconExt) || !validExtensions.includes(featureExt)) {
            throw new Error('Icon and feature graphic must be webp, png, or jpeg files');
        }

        // Get full paths
        const iconPath = path.join(path.dirname(manifestPath), manifest.icon);
        const featurePath = path.join(path.dirname(manifestPath), manifest.featureGraphic);

        // Check if files exist
        if (!fs.existsSync(iconPath) || !fs.existsSync(featurePath)) {
            throw new Error('Icon or feature graphic file not found');
        }

        // Check file sizes
        const iconSize = fs.statSync(iconPath).size;
        const featureSize = fs.statSync(featurePath).size;

        if (iconSize > 1024 * 1024) { // 1MB
            throw new Error('Icon file size must not exceed 1MB');
        }
        if (featureSize > 15 * 1024 * 1024) { // 15MB
            throw new Error('Feature graphic file size must not exceed 15MB');
        }

        // Check image dimensions
        const iconMetadata = await sharp(iconPath).metadata();
        const featureMetadata = await sharp(featurePath).metadata();

        if (iconMetadata.width !== 512 || iconMetadata.height !== 512) {
            throw new Error('Icon must be 512x512 pixels');
        }
        if (featureMetadata.width !== 1024 || featureMetadata.height !== 500) {
            throw new Error('Feature graphic must be 1024x500 pixels');
        }


        // Validate category
        if (manifest.type === 'style' && manifest.category !== 'Theming') {
            throw new Error('Style entries must have category set to Theming');
        } else if (!validCategories.includes(manifest.category)) {
            throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
        }

        // Validate that id matches folder name
        const folderName = path.basename(path.dirname(manifestPath));
        if (manifest.id !== folderName) {
            throw new Error(`Manifest id "${manifest.id}" does not match folder name "${folderName}"`);
        }

        // Validate author object
        if (typeof manifest.author === 'object') {
            if (!manifest.author.display || !manifest.author.link) {
                throw new Error('Invalid author object in manifest.json - must have display and link properties');
            }
        } else if (typeof manifest.author !== 'string') {
            throw new Error('Author must be either a string or an object with display and link properties');
        }

        // Validate type
        const validTypes = ['pwa', 'webapp', 'livetileprovider', 'style', 'nativeapp'];
        if (!validTypes.includes(manifest.type)) {
            throw new Error('Invalid type in manifest.json');
        }

        // Check platform if type is nativeapp
        if (manifest.type === 'nativeapp') {
            if (!manifest.platform) {
                throw new Error('Platform is required for nativeapp type');
            }
            const validPlatforms = ['android', 'windows', 'linux'];
            if (!validPlatforms.includes(manifest.platform)) {
                throw new Error('Invalid platform specified');
            }
        }

        // Validate versions
        if (typeof manifest.versions !== 'object') {
            throw new Error('Versions must be an object');
        }

        // Check each version entry
        Object.entries(manifest.versions).forEach(([code, details]) => {
            if (!details.version || !details.date || !details.changelog || !details.url) {
                throw new Error(`Invalid version details for version code ${code}`);
            }
        });

        return true;
    } catch (error) {
        console.error('   └─ Manifest validation failed:', error.message);
        return false;
    }
}

async function checkDatabase() {
    const dbPath = path.join(__dirname, '..', 'db');
    const dbFolders = fs.readdirSync(dbPath).filter(file =>
        fs.statSync(path.join(dbPath, file)).isDirectory()
    );
    console.log(colors.blue,`${dbFolders.length} entries found in /db`);
    console.log(colors.blue, 'DATABASE');

    let hasErrors = false;

    for (const folder of dbFolders) {
        console.log(`└─ ${folder}`);
        const manifestPath = path.join(dbPath, folder, 'manifest.json');

        // Check if manifest exists
        if (!fs.existsSync(manifestPath)) {
            console.error(`Error: Missing manifest.json in ${folder}`);
            hasErrors = true;
            continue;
        }

        // Validate manifest
        if (!(await validateManifest(manifestPath))) {
            hasErrors = true;
            continue;
        }

        console.log('\x1b[32m%s\x1b[0m', `   ✓ ${folder}: Valid`);
    }

    if (hasErrors) {
        console.error('Database check failed');
        process.exit(1);
    } else {
        console.log('Database check passed');
    }
}

console.clear()
await checkDatabase();