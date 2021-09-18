import {
    ApplicationCommandData,
    ApplicationCommandPermissionData,
    ButtonInteraction,
    ClientEvents,
    CommandInteraction,
    Message,
    PermissionResolvable,
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

export interface ButtonInteractionData {
    readonly names: readonly string[];
    readonly preferEphemeralErrorMessage?: boolean;
    run(interaction: ButtonInteraction, handlerName: string): Promise<void>;
}
