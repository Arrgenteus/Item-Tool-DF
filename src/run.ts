import { Client as DiscordClient, Guild, Intents } from 'discord.js';
import config from './config.js';
import { SlashCommandData } from './eventHandlerTypes.js';
import interactionEventHandler from './events/interaction.js';
import messageCreateEventHandler from './events/messageCreate.js';
import messageDeleteEventHandler from './events/messageDelete.js';
import { slashCommandHandlerMap } from './interactionHandlerMap.js';

const client = new DiscordClient({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const eventHandlers = [
    interactionEventHandler,
    messageCreateEventHandler,
    messageDeleteEventHandler,
];
for (const eventHandler of eventHandlers) client.on(eventHandler.eventName, eventHandler.run);

client.on('ready', () => {
    console.log(`${client.user?.tag || 'Client'} is ready to respond to interactions.`);
});

console.log('Logging in...');
client.login(config.BOT_TOKEN).then(async () => {
    if (client.user?.tag) console.log(`Logged in as ${client.user.tag}. Getting ready...`);
    else console.log('Logged in. Getting ready...');

    const [commandArg] = process.argv.slice(2);
    if (commandArg === 'register-slash') {
        const slashCommandStructures = slashCommandHandlerMap.map(
            (command: SlashCommandData) => command.structure
        );
        await Promise.all(
            client.guilds.cache.map((guild: Guild) => guild.commands.set(slashCommandStructures))
        );
        console.log('Slash commands have been registered');
    }
});
