import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { NonCommandInteractionData } from '../eventHandlerTypes';

const autocompleteHandlers: Collection<string, NonCommandInteractionData> = new Collection();

// Autocomplete handlers should share the same name as commands
for (const fileName of fs.readdirSync(path.join(__dirname, '../autocompleteHandlers'))) {
    if (!fileName.endsWith('.js')) continue;

    const handler: NonCommandInteractionData = require(path.join(
        __dirname,
        '../autocompleteHandlers/' + fileName
    )).default;
    if (!handler) continue;

    for (const commandName of handler.names) {
        autocompleteHandlers.set(commandName, handler);
    }
}
console.log('Autocomplete interaction handlers have been loaded');

export default autocompleteHandlers;
