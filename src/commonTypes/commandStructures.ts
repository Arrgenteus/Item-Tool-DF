import { ApplicationCommand, ApplicationCommandOptionType, Interaction, Message } from 'discord.js';

// export enum ApplicationCommandPermissionType {
// 	ROLE = 1,
// 	USER
// }

// export interface ApplicationCommandPermissions {
// 	id: Snowflake,
// 	type: ApplicationCommandPermissionType,
// 	permission: boolean
// }

// export interface ApplicationCommandOptionChoice {
// 	name: string,
// 	value: string | number
// }

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

// export interface ApplicationCommandOption {
// 	type:
// 		ApplicationCommandOptionType.STRING | ApplicationCommandOptionType.INTEGER |
// 		ApplicationCommandOptionType.BOOLEAN | ApplicationCommandOptionType.USER |
// 		ApplicationCommandOptionType.CHANNEL | ApplicationCommandOptionType.ROLE |
// 		ApplicationCommandOptionType.MENTIONABLE,
// 	name: string,
// 	description: string,
// 	required?: boolean,
// 	choices?: ApplicationCommandOptionChoice[],
// 	options?: never
// }

// export interface ApplicationCommandOptionWithSubCommand {
// 	type: ApplicationCommandOptionType.SUB_COMMAND,
// 	name: string,
// 	description: string,
// 	options: ApplicationCommandOption[]
// }

// export interface ApplicationCommandOptionWithSubCommandGroup {
// 	type: ApplicationCommandOptionType.SUB_COMMAND_GROUP,
// 	name: string,
// 	description: string,
// 	options: ApplicationCommandOptionWithSubCommand[]
// }

// export interface ApplicationCommandCreationStructure {
// 	name: string,
// 	description: string,
// 	options?: ApplicationCommandOption[] | ApplicationCommandOptionWithSubCommand[] | ApplicationCommandOptionWithSubCommandGroup[],
// 	default_permission?: boolean
// };

export type ApplicationCommandCreationStructure = Pick<
    ApplicationCommand,
    'name' | 'description' | 'options'
>;

export interface SlashCommandData {
    preferEphemeralErrorMessage: boolean;
    structure: ApplicationCommandCreationStructure;
    run(interaction: Interaction): Promise<void>;
}

export interface ChatCommandData {
    names: string[];
    run(message: Partial<Message>, args: string, commandName: string): Promise<void>;
}
