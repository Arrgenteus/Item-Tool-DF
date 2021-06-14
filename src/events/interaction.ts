import { ButtonInteraction, CommandInteraction, Message } from 'discord.js';
import { ButtonInteractionData } from '../commonTypes/commandStructures';
import { ClientEventHandler } from '../commonTypes/eventHandler';
import config from '../config';
import { ValidationError } from '../errors';
import buttonInteractionHandlers from '../storage/buttonInteractionHandlers';
import slashCommands from '../storage/slashCommands';

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
        await interactionErrorHandler(err, interaction, command.preferEphemeralErrorMessage);
    }
}

async function buttonInteractionHandler(interaction: ButtonInteraction): Promise<void> {
    let separatorIndex: number = interaction.customID.indexOf('`');
    if (separatorIndex === -1) separatorIndex = interaction.customID.length;
    let handlerName: string = interaction.customID.slice(0, separatorIndex);
    const handler: ButtonInteractionData | undefined = buttonInteractionHandlers.get(handlerName);
    if (!handler) return;

    try {
        await handler.run(interaction, handlerName);
    } catch (err) {
        await interactionErrorHandler(err, interaction, handler.preferEphemeralErrorMessage);
    }
}

const interactionEventHandler: ClientEventHandler = {
    eventName: 'interaction',
    async run(interaction: CommandInteraction | ButtonInteraction): Promise<void> {
        if (interaction.isCommand()) await slashCommandHandler(interaction);
        else await buttonInteractionHandler(interaction);
    },
};

export default interactionEventHandler;
