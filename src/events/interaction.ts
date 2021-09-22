import { ButtonInteraction, CommandInteraction, SelectMenuInteraction } from 'discord.js';
import config from '../config';
import { ValidationError } from '../errors';
import { ActionRowInteractionData, ClientEventHandler } from '../eventHandlerTypes';
import buttonInteractionHandlers from '../handlerStorage/buttonInteractionHandlers';
import selectMenuInteractionHandlers from '../handlerStorage/selectMenuInteractionHandlers';
import slashCommands from '../handlerStorage/slashCommands';
import { INTERACTION_ID_ARG_SEPARATOR } from '../utils/constants';

async function interactionErrorHandler(
    err: Error,
    interaction: CommandInteraction | ButtonInteraction | SelectMenuInteraction,
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

async function actionRowInteractionHandler(
    interaction: ButtonInteraction | SelectMenuInteraction
): Promise<void> {
    let separatorIndex: number = interaction.customId.indexOf(INTERACTION_ID_ARG_SEPARATOR);
    if (separatorIndex === -1) separatorIndex = interaction.customId.length;
    let handlerName: string = interaction.customId.slice(0, separatorIndex);

    const handlers =
        interaction instanceof ButtonInteraction
            ? buttonInteractionHandlers
            : selectMenuInteractionHandlers;
    const handler: ActionRowInteractionData | undefined = handlers.get(handlerName);
    if (!handler) return;

    try {
        const args: string[] = interaction.customId
            .slice(separatorIndex + 1)
            .split(INTERACTION_ID_ARG_SEPARATOR);
        await handler.run(interaction, args, handlerName);
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
        else await actionRowInteractionHandler(interaction);
    },
};

export default interactionEventHandler;
