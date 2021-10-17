import { Message, TextChannel } from 'discord.js';
import { ChatCommandData } from '../eventHandlerTypes';

const command: ChatCommandData = {
    names: ['sort', 'sortasc'],
    run: async (message: Message): Promise<void> => {
        const channel: TextChannel = message.channel as TextChannel;
        await channel.send('This command has been removed. Please use /sort instead.');
    },
};

export default command;
