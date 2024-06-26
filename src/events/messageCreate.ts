import { Message, MessageOptions } from 'discord.js';
import config from '../config.js';
import { ValidationError } from '../errors.js';
import { ChatCommandData, ClientEventHandler } from '../eventHandlerTypes.js';
import { chatCommandHandlerMap } from '../interactionHandlerMap.js';

const messageCreateEventHandler: ClientEventHandler = {
    eventName: 'messageCreate',
    async run(message: Message): Promise<void> {
        if (
            message.channel.type === 'DM' ||
            !message.content.startsWith(config.COMMAND_CHAR) ||
            message.author.bot
        )
            return;

        let commandName = message.content.split(' ')[0].slice(1);
        const args = message.content.slice(commandName.length + 2).trim();

        const command: ChatCommandData | undefined = chatCommandHandlerMap.get(commandName);
        if (!command) return;

        try {
            await command.run(message, args, commandName);
        } catch (err) {
            let errMessage: Pick<MessageOptions, 'content' | 'embeds'>;
            if (err instanceof ValidationError) {
                errMessage = { embeds: [{ description: err.message }] };
            } else {
                errMessage = {
                    content: 'An error occurred. Please try again later.',
                };
                if (config.DEV_ID) errMessage.content += ` <@${config.DEV_ID}>`;
                console.error(err);
            }
            try {
                await message.channel.send(errMessage);
            } catch (responseErr) {
                console.error('An error occurred while responding to an error:\n', responseErr);
            }
        }
    },
};

export default messageCreateEventHandler;
