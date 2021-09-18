import { ButtonInteraction, CommandInteraction } from 'discord.js';
import { ClientEventHandler } from '../commonTypes/eventHandler';
import config from '../config';
import { ValidationError } from '../errors';
import { ButtonInteractionData } from '../eventHandlerTypes';
import buttonInteractionHandlers from '../handlerStorage/buttonInteractionHandlers';
import slashCommands from '../handlerStorage/slashCommands';
import { BUTTON_ID_ARG_SEPARATOR } from '../utils/constants';

async function interactionErrorHandler(
    err: Error,
    interaction: CommandInteraction | ButtonInteraction,
    preferEphemeralErrorMessage: boolean
) {
    let errMessage: {
        content?: string;
        embeds?: [{ description: string }];
    };
    if (err instanceof ValidationError) {
        errMessage = { embeds: [{ description: err.message }] };
    } else {
        errMessage = {
            content: 'An error occurred. Please try again later.',
        };
        if (config.DEV_ID) errMessage.content += ` Let <@${config.DEV_ID}> know about this.`;
        console.error(err);
    }

    try {
        if (interaction.replied) {
            await interaction.followUp(
                Object.assign(errMessage, {
                    ephemeral: preferEphemeralErrorMessage,
                })
            );
        } else if (interaction.deferred) {
            await interaction.editReply(errMessage);
        } else {
            await interaction.reply(
                Object.assign(errMessage, {
                    ephemeral: preferEphemeralErrorMessage,
                })
            );
        }
    } catch (responseErr) {
        console.error('An error occurred while responding to an error:\n', responseErr);
    }
}

async function slashCommandHandler(interaction: CommandInteraction): Promise<void> {
    const command = slashCommands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.run(interaction);
    } catch (err) {
        await interactionErrorHandler(
            err as Error,
            interaction,
            command.preferEphemeralErrorMessage ?? true
        );
    }
}

async function buttonInteractionHandler(interaction: ButtonInteraction): Promise<void> {
    let separatorIndex: number = interaction.customId.indexOf(BUTTON_ID_ARG_SEPARATOR);
    if (separatorIndex === -1) separatorIndex = interaction.customId.length;
    let handlerName: string = interaction.customId.slice(0, separatorIndex);
    const handler: ButtonInteractionData | undefined = buttonInteractionHandlers.get(handlerName);
    if (!handler) return;

    try {
        await handler.run(interaction, handlerName);
    } catch (err) {
        await interactionErrorHandler(
            err as Error,
            interaction,
            handler.preferEphemeralErrorMessage ?? false
        );
    }
}

const interactionEventHandler: ClientEventHandler = {
    eventName: 'interactionCreate',
    async run(interaction: CommandInteraction | ButtonInteraction): Promise<void> {
        if (interaction.isCommand()) await slashCommandHandler(interaction);
        else if (interaction.isButton()) await buttonInteractionHandler(interaction);
    },
};

export default interactionEventHandler;
