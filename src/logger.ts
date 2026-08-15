import { BaseInteraction, Message } from 'discord.js';
import pino from 'pino';
import config from './config.js';

function serializeInteraction(interaction: unknown): Record<string, unknown> {
    if (!(interaction instanceof BaseInteraction)) return { invalidInteraction: true };

    const channel = interaction.channel;

    return {
        id: interaction.id,
        type: interaction.constructor.name,
        discordType: interaction.type,
        applicationId: interaction.applicationId,
        createdTimestamp: interaction.createdTimestamp,
        commandName:
            interaction.isCommand() || interaction.isAutocomplete()
                ? interaction.commandName
                : undefined,
        commandId:
            interaction.isCommand() || interaction.isAutocomplete()
                ? interaction.commandId
                : undefined,
        commandType:
            interaction.isCommand() || interaction.isAutocomplete()
                ? interaction.commandType
                : undefined,
        customId:
            interaction.isMessageComponent() || interaction.isModalSubmit()
                ? interaction.customId
                : undefined,
        componentType: interaction.isMessageComponent()
            ? interaction.componentType
            : undefined,
        sourceMessageId:
            interaction.isMessageComponent() || interaction.isModalSubmit()
                ? interaction.message?.id
                : undefined,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        userDisplayName: interaction.user.globalName,
        memberDisplayName: interaction.inCachedGuild()
            ? interaction.member.displayName
            : undefined,
        guildId: interaction.guildId,
        guildName: interaction.guild?.name,
        channelId: interaction.channelId,
        channelType: channel?.type,
        channelName: channel && 'name' in channel ? channel.name : undefined,
        context: interaction.context,
        appPermissions: interaction.appPermissions?.bitfield.toString(),
        memberPermissions: interaction.memberPermissions?.bitfield.toString(),
        deferred: interaction.isRepliable() ? interaction.deferred : undefined,
        replied: interaction.isRepliable() ? interaction.replied : undefined,
        ephemeral: interaction.isRepliable() ? interaction.ephemeral : undefined,
        autocompleteResponded: interaction.isAutocomplete()
            ? interaction.responded
            : undefined,
    };
}

function serializeMessage(message: unknown): Record<string, unknown> {
    if (!(message instanceof Message)) return { invalidMessage: true };

    return {
        id: message.id,
        type: message.type,
        authorId: message.author.id,
        authorTag: message.author.tag,
        authorDisplayName: message.member?.displayName,
        guildId: message.guildId,
        guildName: message.guild?.name,
        channelId: message.channelId,
        channelType: message.channel.type,
        channelName: 'name' in message.channel ? message.channel.name : undefined,
        createdTimestamp: message.createdTimestamp,
        editedTimestamp: message.editedTimestamp,
        attachmentCount: message.attachments.size,
        embedCount: message.embeds.length,
        componentCount: message.components.length,
        pinned: message.pinned,
        system: message.system,
        tts: message.tts,
        partial: message.partial,
    };
}

const logger = pino({
    level: config.ENVIRONMENT === 'dev' ? 'debug' : 'info',
    transport:
        config.ENVIRONMENT === 'dev'
            ? {
                  target: 'pino-pretty',
                  options: { colorize: true },
              }
            : undefined,
    serializers: {
        interaction: serializeInteraction,
        message: serializeMessage,
        followUpMessage: serializeMessage,
    },
});

export default logger;
