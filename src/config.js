import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
const CONFIG_DIR = path.resolve(__dirname, '../config.yml');
const config = yaml.load(fs.readFileSync(CONFIG_DIR, 'utf8'));
const requiredConfigValues = [
    'BOT_TOKEN',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_COLLECTION',
    'DB_AUTH_MECHANISM',
    'DB_USER',
    'DB_PASS',
    'COMMAND_CHAR',
    'ELASTIC_URL',
    'ELASTIC_USER',
    'ELASTIC_PASS',
    'PET_INDEX_NAME',
    'ACCESSORY_INDEX_NAME',
    'WEAPON_INDEX_NAME',
];
for (const value of requiredConfigValues) {
    if (!(value in config))
        throw new Error(`${value} must be defined in config.yml`);
}
export default config;
