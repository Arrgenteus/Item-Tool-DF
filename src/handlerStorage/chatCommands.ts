import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { ChatCommandData } from '../eventHandlerTypes';

const chatCommands: Collection<string, ChatCommandData> = new Collection();

for (const fileName of fs.readdirSync(path.join(__dirname, '../chatCommands'))) {
    if (!fileName.endsWith('.js')) continue;

    const command: ChatCommandData = require(path.join(
        __dirname,
        '../chatCommands/' + fileName
    )).default;
    if (!command) continue;

    for (const commandName of command.names) {
        chatCommands.set(commandName, command);
    }
}
console.log('Chat commands have been loaded');

export default chatCommands;
