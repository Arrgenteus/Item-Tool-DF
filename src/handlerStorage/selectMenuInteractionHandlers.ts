import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { NonCommandInteractionData } from '../eventHandlerTypes';

const selectMenuInteractionHandlers: Collection<string, NonCommandInteractionData> =
    new Collection();

for (const fileName of fs.readdirSync(path.join(__dirname, '../selectMenuInteractionHandlers'))) {
    if (!fileName.endsWith('.js')) continue;

    const command: NonCommandInteractionData = require(path.join(
        __dirname,
        '../selectMenuInteractionHandlers/' + fileName
    )).default;
    if (!command) continue;

    for (const commandName of command.names) {
        selectMenuInteractionHandlers.set(commandName, command);
    }
}
console.log('Select menu interaction handlers have been loaded');

export default selectMenuInteractionHandlers;
