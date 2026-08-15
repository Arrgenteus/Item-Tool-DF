import { Client as DiscordClient, Events, GatewayIntentBits, Guild } from 'discord.js';
import logger from './logger.js';
import config from './config.js';
import { SlashCommandData } from './eventHandlerTypes.js';
import interactionEventHandler from './events/interaction.js';
import messageCreateEventHandler from './events/messageCreate.js';
import messageDeleteEventHandler from './events/messageDelete.js';
import { slashCommandHandlerMap } from './interactionHandlerMap.js';

const client = new DiscordClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const eventHandlers = [
    interactionEventHandler,
    messageCreateEventHandler,
    messageDeleteEventHandler,
];
for (const eventHandler of eventHandlers) client.on(eventHandler.eventName, eventHandler.run);

client.once(Events.ClientReady, () => {
    logger.info({ clientTag: client.user?.tag }, 'Client is ready to respond to interactions');
});

logger.info('Logging in');
client.login(config.BOT_TOKEN).then(async () => {
    logger.info({ clientTag: client.user?.tag }, 'Logged in; getting ready');

    const [commandArg] = process.argv.slice(2);
    if (commandArg === 'register-slash') {
        const guilds = client.guilds.cache.map((guild: Guild) => ({
            id: guild.id,
            name: guild.name,
        }));
        const slashCommandStructures = slashCommandHandlerMap.map(
            (command: SlashCommandData) => command.structure
        );
        logger.info({ guildCount: guilds.length, guilds }, 'Registering slash commands...');
        await Promise.all(
            client.guilds.cache.map((guild: Guild) => guild.commands.set(slashCommandStructures))
        );
        logger.info(
            { guildCount: guilds.length, guilds },
            'Slash commands registered for all guilds'
        );
    }
});
