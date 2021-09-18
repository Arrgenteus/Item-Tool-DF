import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { ButtonInteractionData } from '../eventHandlerTypes';

const buttonInteractionHandlers: Collection<string, ButtonInteractionData> = new Collection();

for (const fileName of fs.readdirSync(path.join(__dirname, '../buttonInteractionHandlers'))) {
    if (!fileName.endsWith('.js')) continue;

    const command: ButtonInteractionData = require(path.join(
        __dirname,
        '../buttonInteractionHandlers/' + fileName
    )).default;
    if (!command) continue;

    for (const commandName of command.names) {
        buttonInteractionHandlers.set(commandName, command);
    }
}
console.log('Button interaction handlers have been loaded');

export default buttonInteractionHandlers;
