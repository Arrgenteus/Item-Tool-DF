import {
    AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    InteractionReplyOptions,
    MessageFlags,
    ModalSubmitInteraction,
    StringSelectMenuInteraction,
} from 'discord.js';
import config from '../config.js';
import { ValidationError } from '../errors.js';
import { NonCommandInteractionData, ClientEventHandler } from '../eventHandlerTypes.js';
import { INTERACTION_ID_ARG_SEPARATOR } from '../utils/constants.js';
import {
    autocompleteHandlerMap,
    buttonInteractionHandlerMap,
    modalSubmitHandlerMap,
    selectMenuInteractionHandlerMap,
    slashCommandHandlerMap,
} from '../interactionHandlerMap.js';

async function interactionErrorHandler(
    err: Error,
    interaction:
        | ChatInputCommandInteraction
        | ButtonInteraction
        | StringSelectMenuInteraction
        | ModalSubmitInteraction,
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
        const response: InteractionReplyOptions = preferEphemeralErrorMessage
            ? { ...errMessage, flags: MessageFlags.Ephemeral }
            : errMessage;
        if (interaction.replied) {
            await interaction.followUp(response);
        } else if (interaction.deferred) {
            await interaction.editReply(errMessage);
        } else {
            await interaction.reply(response);
        }
    } catch (responseErr) {
        console.error('An error occurred while responding to an error:\n', responseErr);
    }
}

async function slashCommandHandler(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = slashCommandHandlerMap.get(interaction.commandName);
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

async function autocompleteHandler(interaction: AutocompleteInteraction): Promise<void> {
    const handler: NonCommandInteractionData | undefined = autocompleteHandlerMap.get(
        interaction.commandName
    );
    if (!handler) {
        console.warn(
            `No autocomplete interaction handler available for command "${interaction.commandName}"`
        );
        return;
    }

    try {
        await handler.run(interaction, [], interaction.commandName);
    } catch (err: any) {
        console.error(
            `An error occurred while generating autocomplete response to command "${interaction.commandName}":\n${err.stack}`
        );
    }
}

async function widgetInteractionHandler(
    interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction
): Promise<void> {
    let separatorIndex: number = interaction.customId.indexOf(INTERACTION_ID_ARG_SEPARATOR);
    if (separatorIndex === -1) separatorIndex = interaction.customId.length;
    let handlerName: string = interaction.customId.slice(0, separatorIndex);

    const handlers = {
        ButtonInteraction: buttonInteractionHandlerMap,
        StringSelectMenuInteraction: selectMenuInteractionHandlerMap,
        ModalSubmitInteraction: modalSubmitHandlerMap,
    }[interaction.constructor.name];
    if (!handlers) return;

    const handler: NonCommandInteractionData | undefined = handlers.get(handlerName);
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
    async run(interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<void> {
        if (interaction.isChatInputCommand()) await slashCommandHandler(interaction);
        else if (interaction.isAutocomplete()) await autocompleteHandler(interaction);
        else await widgetInteractionHandler(interaction);
    },
};

export default interactionEventHandler;
