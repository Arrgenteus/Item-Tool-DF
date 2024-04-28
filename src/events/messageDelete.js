import { botResponseCache } from '../utils/store';
const messageDeleteEventHandler = {
    eventName: 'messageDelete',
    async run(message) {
        if (message.channel.type === 'DM' || message.author.bot)
            return;
        const botResponseMessage = botResponseCache.get(message.id);
        if (!botResponseMessage)
            return;
        try {
            await botResponseMessage.delete();
        }
        catch (err) {
            console.error(`Failed to delete bot message response:\n${err}`);
        }
    },
};
export default messageDeleteEventHandler;
