import { Client as DiscordClient, Collection, Interaction } from 'discord.js';
import path from 'path';
import { config } from './config';
import { ValidationError } from './errors';

const client = new DiscordClient({ intents: ['GUILD_MESSAGES'] });

const slashCommands: Collection<string, any> = new Collection();
for (const fileName of require('fs').readdirSync(path.resolve(__dirname, './slashCommands'))) {
    if (fileName.slice(-3) !== '.js') continue;

    const { command } = require(path.resolve(__dirname, `./slashCommands/${fileName}`));
    slashCommands.set(command.structure.name, command);
}

console.log('Logging in...');
client.login(config.BOT_TOKEN).then(async () => {
    if (client.user?.tag) console.log(`Logged in as ${client.user.tag}. Getting ready...`);
    else console.log('Logged in. Getting ready...');

    const [commandArg] = process.argv.slice(2);
    if (commandArg === 'register') {
        const slashCommandStructures = slashCommands.map((command) => command.structure);
        await Promise.all(
            client.guilds.cache.map((guild) => guild.commands.set(slashCommandStructures))
        );
        console.log('Commands have been registered');
    }
});
client.on('ready', () => {
    console.log(`${client.user?.tag || 'Client'} is ready to respond to interactions.`);

    client.on('interaction', async (interaction: Interaction) => {
        if (!interaction.isCommand()) return;
        const command = slashCommands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.run(interaction);
        } catch (err) {
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
                if (config.DEV_ID)
                    errMessage.content += ` Let <@${config.DEV_ID}> know about this.`;
                console.error(err);
            }

            try {
                if (interaction.replied)
                    await interaction.followUp(
                        Object.assign(errMessage, {
                            ephemeral: command.preferEphemeralErrorMessage,
                        })
                    );
                else if (interaction.deferred) await interaction.editReply(errMessage);
                else
                    await interaction.reply(
                        Object.assign(errMessage, {
                            ephemeral: command.preferEphemeralErrorMessage,
                        })
                    );
            } catch (responseErr) {
                console.error('An error occurred while responding to an error:\n', responseErr);
            }
        }
    });
});
