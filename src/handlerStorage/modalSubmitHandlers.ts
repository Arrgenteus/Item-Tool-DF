import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { NonCommandInteractionData } from '../eventHandlerTypes';

const modalSubmitHandlers: Collection<string, NonCommandInteractionData> = new Collection();

for (const fileName of fs.readdirSync(path.join(__dirname, '../modalSubmitHandlers'))) {
    if (!fileName.endsWith('.js')) continue;

    const command: NonCommandInteractionData = require(path.join(
        __dirname,
        '../modalSubmitHandlers/' + fileName
    )).default;
    if (!command) continue;

    for (const commandName of command.names) {
        modalSubmitHandlers.set(commandName, command);
    }
}
console.log('Modal interaction handlers have been loaded');

export default modalSubmitHandlers;
