import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const nonEmptyString = z.string().min(1);
const snowflake = z.string().regex(/^\d{17,20}$/);

const configSchema = z.object({
    ENVIRONMENT: z.enum(['dev', 'prod']).default('prod'),
    BOT_TOKEN: nonEmptyString,
    DB_HOST: nonEmptyString,
    DB_PORT: nonEmptyString,
    DB_NAME: nonEmptyString,
    DB_COLLECTION: nonEmptyString,
    DB_AUTH_MECHANISM: nonEmptyString,
    DB_REPLICA_SET: nonEmptyString.optional(),
    DB_DIRECT_CONNECTION: z.boolean().default(false),
    DB_USER: nonEmptyString,
    DB_PASS: nonEmptyString,
    DEV_ID: snowflake.optional(),
    COMMAND_CHAR: nonEmptyString,
    ELASTIC_URL: z.url(),
    ELASTIC_USER: nonEmptyString,
    ELASTIC_PASS: nonEmptyString,
    PET_INDEX_NAME: nonEmptyString,
    ACCESSORY_INDEX_NAME: nonEmptyString,
    WEAPON_INDEX_NAME: nonEmptyString,
    LONG_RESULT_CHANNELS: z.array(snowflake).optional(),
});

export type Config = z.infer<typeof configSchema>;

const dirname = fileURLToPath(new URL('.', import.meta.url));
const CONFIG_DIR = path.resolve(dirname, '../config.yml');
const configResult = configSchema.safeParse(yaml.load(fs.readFileSync(CONFIG_DIR, 'utf8')));

if (!configResult.success) {
    const missingValues = configResult.error.issues
        .filter((issue) => issue.code === 'invalid_type' && issue.input === undefined)
        .map((issue) => issue.path.join('.'));

    if (missingValues.length > 0) {
        throw new Error(
            missingValues
                .map((value) => `${value} is missing and is a required config value`)
                .join('\n')
        );
    }

    throw configResult.error;
}

const config = configResult.data;

export default config;
