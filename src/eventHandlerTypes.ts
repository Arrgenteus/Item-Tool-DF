import {
    ApplicationCommandData,
    ApplicationCommandPermissionData,
    ButtonInteraction,
    ClientEvents,
    CommandInteraction,
    Message,
    PermissionResolvable,
    SelectMenuInteraction,
} from 'discord.js';

export interface ClientEventHandler {
    readonly eventName: keyof ClientEvents;
    run(...args: any[]): Promise<void>;
}

export interface SlashCommandData {
    readonly preferEphemeralErrorMessage?: boolean;
    readonly permissions?: ApplicationCommandPermissionData[];
    readonly structure: ApplicationCommandData;
    run(interaction: CommandInteraction): Promise<void>;
}

export interface ChatCommandData {
    readonly names: string[];
    readonly requiredPermissions?: PermissionResolvable[];
    run(message: Partial<Message>, args: string, commandName: string): Promise<void>;
}

export interface ActionRowInteractionData {
    readonly names: readonly string[];
    readonly preferEphemeralErrorMessage?: boolean;
    run(
        interaction: ButtonInteraction | SelectMenuInteraction,
        args: string[],
        handlerName: string
    ): Promise<void>;
}
