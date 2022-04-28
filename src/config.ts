import yaml from 'js-yaml';
import fs from 'fs';
import { Snowflake } from 'discord.js';
import path from 'path';

export interface Config {
    BOT_TOKEN: string;
    DB_HOST: string;
    DB_PORT: string;
    DB_NAME: string;
    DB_COLLECTION: string;
    DB_AUTH_MECHANISM: string;
    DB_USER: string;
    DB_PASS: string;
    DEV_ID?: Snowflake;
    COMMAND_CHAR: string;
    ELASTIC_URL: string;
    ELASTIC_USER: string;
    ELASTIC_PASS: string;
    PET_INDEX_NAME: string;
    ACCESSORY_INDEX_NAME: string;
    LONG_RESULT_CHANNELS?: string[];
}

const CONFIG_DIR = path.resolve(__dirname, '../config.yml');
const config: Config = yaml.load(fs.readFileSync(CONFIG_DIR, 'utf8')) as Config;

const requiredConfigValues: (keyof Config)[] = [
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
];
for (const value of requiredConfigValues) {
    if (!(value in config)) throw new Error(`${value} must be defined in config.yml`);
}

export default config;
