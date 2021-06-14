import { Collection } from 'discord.js';
import { SlashCommandData } from '../commonTypes/commandStructures';
import sortCommand from '../slashCommands/sort';

const slashCommands: Collection<string, SlashCommandData> = new Collection();

const commandList: SlashCommandData[] = [sortCommand];
for (const command of commandList) {
    slashCommands.set(command.structure.name, command);
}
console.log('Slash commands have been loaded');

export default slashCommands;
