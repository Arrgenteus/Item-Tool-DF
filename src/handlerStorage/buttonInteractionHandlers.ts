import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { NonCommandInteractionData } from '../eventHandlerTypes';

const buttonInteractionHandlers: Collection<string, NonCommandInteractionData> = new Collection();

for (const fileName of fs.readdirSync(path.join(__dirname, '../buttonInteractionHandlers'))) {
    if (!fileName.endsWith('.js')) continue;

    const command: NonCommandInteractionData = require(path.join(
        __dirname,
        '../buttonInteractionHandlers/' + fileName
    )).default;
    if (!command) continue;

    for (const commandName of command.names) {
        if (buttonInteractionHandlers.has(commandName)) {
            throw new Error(`Duplicate button interaction handler name '${commandName}'`);
        }
        buttonInteractionHandlers.set(commandName, command);
    }
}
console.log('Button interaction handlers have been loaded');

export default buttonInteractionHandlers;
