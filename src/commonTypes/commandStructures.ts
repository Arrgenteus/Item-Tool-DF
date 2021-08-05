import {
    ApplicationCommand,
    ApplicationCommandOptionType,
    ButtonInteraction,
    CommandInteraction,
    Message,
    MessageButtonStyleResolvable,
    MessageComponentTypeResolvable,
} from 'discord.js';

export const MAX_EMBED_DESC_LENGTH = 4096;
export const MAX_SPLIT_EMBED_DESC_LENGTH = 4070;
export const MAX_EMBED_FOOTER_LENGTH = 1904;

export const ApplicationCommandOptions: {
    [type: string]: ApplicationCommandOptionType;
} = {
    SUB_COMMAND: 'SUB_COMMAND',
    SUB_COMMAND_GROUP: 'SUB_COMMAND_GROUP',
    STRING: 'STRING',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
    USER: 'USER',
    CHANNEL: 'CHANNEL',
    ROLE: 'ROLE',
    MENTIONABLE: 'MENTIONABLE',
};

export type ApplicationCommandCreationStructure = Pick<
    ApplicationCommand,
    'name' | 'description' | 'options'
>;

export interface SlashCommandData {
    readonly preferEphemeralErrorMessage: boolean;
    readonly structure: ApplicationCommandCreationStructure;
    run(interaction: CommandInteraction): Promise<void>;
}

export interface ChatCommandData {
    readonly names: string[];
    run(message: Partial<Message>, args: string, commandName: string): Promise<void>;
}

export interface ButtonInteractionData {
    readonly names: readonly string[];
    readonly preferEphemeralErrorMessage: boolean;
    run(interaction: ButtonInteraction, handlerName: string): Promise<void>;
}
