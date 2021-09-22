import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { SlashCommandData } from '../eventHandlerTypes';

const slashCommands: Collection<string, SlashCommandData> = new Collection();

for (const fileName of fs.readdirSync(path.join(__dirname, '../slashCommands'))) {
    if (!fileName.endsWith('.js')) continue;

    const command: SlashCommandData = require(path.join(
        __dirname,
        '../slashCommands/' + fileName
    )).default;
    if (!command) continue;

    slashCommands.set(command.structure.name, command);
}
console.log('Slash commands have been loaded');

export default slashCommands;
