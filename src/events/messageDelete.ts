import { Message } from 'discord.js';
import { ClientEventHandler } from '../eventHandlerTypes';
import { botResponseCache } from '../utils/store';

const messageDeleteEventHandler: ClientEventHandler = {
    eventName: 'messageDelete',
    async run(message: Message): Promise<void> {
        if (message.channel.type === 'DM' || message.author.bot) return;

        const botResponseMessage: Message | undefined = botResponseCache.get(message.id);
        if (!botResponseMessage) return;

        try {
            await botResponseMessage.delete();
        } catch (err: any) {
            console.error(`Failed to delete bot message response:\n${err}`);
        }
    },
};

export default messageDeleteEventHandler;
