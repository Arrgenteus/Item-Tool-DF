import {
    ApplicationCommandData,
    ApplicationCommandPermissions,
    AutocompleteInteraction,
    ButtonInteraction,
    ClientEvents,
    ChatInputCommandInteraction,
    Message,
    ModalSubmitInteraction,
    PermissionResolvable,
    StringSelectMenuInteraction,
} from 'discord.js';

export interface ClientEventHandler {
    readonly eventName: keyof ClientEvents;
    run(...args: any[]): Promise<void>;
}

export interface SlashCommandData {
    readonly preferEphemeralErrorMessage?: boolean;
    readonly permissions?: ApplicationCommandPermissions[];
    readonly structure: ApplicationCommandData;
    run(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface ChatCommandData {
    readonly names: string[];
    readonly requiredPermissions?: PermissionResolvable[];
    run(message: Partial<Message>, args: string, commandName: string): Promise<void>;
}

export interface NonCommandInteractionData {
    readonly names: readonly string[];
    readonly preferEphemeralErrorMessage?: boolean;
    run(
        interaction:
            | ButtonInteraction
            | StringSelectMenuInteraction
            | ModalSubmitInteraction
            | AutocompleteInteraction,
        args: string[],
        handlerName: string
    ): Promise<void>;
}
