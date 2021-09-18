import { Message, MessageOptions } from 'discord.js';
import { ClientEventHandler } from '../commonTypes/eventHandler';
import config from '../config';
import { ValidationError } from '../errors';
import { ChatCommandData } from '../eventHandlerTypes';
import chatCommands from '../handlerStorage/chatCommands';

const messageEventHandler: ClientEventHandler = {
    eventName: 'messageCreate',
    async run(message: Message): Promise<void> {
        if (
            message.channel.type !== 'GUILD_TEXT' ||
            !message.content.startsWith(config.COMMAND_CHAR) ||
            message.author.bot
        )
            return;

        let commandName = message.content.split(' ')[0].slice(1);
        const args = message.content.slice(commandName.length + 2).trim();

        const command: ChatCommandData | undefined = chatCommands.get(commandName);
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

export default messageEventHandler;
