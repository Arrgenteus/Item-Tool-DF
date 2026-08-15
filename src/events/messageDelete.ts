import { ChannelType, Message } from 'discord.js';
import logger from '../logger.js';
import { ClientEventHandler } from '../eventHandlerTypes.js';
import { botResponseCache } from '../utils/store.js';

const messageDeleteEventHandler: ClientEventHandler = {
    eventName: 'messageDelete',
    async run(message: Message): Promise<void> {
        if (message.channel.type === ChannelType.DM || message.author.bot) return;

        const botResponseMessage: Message | undefined = botResponseCache.get(message.id);
        if (!botResponseMessage) return;

        try {
            await botResponseMessage.delete();
        } catch (err) {
            logger.error(
                { err, message, followUpMessage: botResponseMessage },
                'Failed to delete bot message response'
            );
        }
    },
};

export default messageDeleteEventHandler;
