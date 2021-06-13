import { Collection } from 'discord.js';
import { ChatCommandData } from '../commonTypes/commandStructures';
import sortCommand from '../chatCommands/sort';

const chatCommands: Collection<string, ChatCommandData> = new Collection();

const commandList: ChatCommandData[] = [sortCommand];
for (const command of commandList) {
    for (const commandName of command.names) chatCommands.set(commandName, command);
}
console.log('Chat commands have been loaded');

export default chatCommands;
