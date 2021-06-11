import {
    Client as DiscordClient,
    Collection,
    Guild,
    Intents,
    Interaction,
    Message,
} from 'discord.js';
import path from 'path';
import { ChatCommandData, SlashCommandData } from './commonTypes/commandStructures';
import { config } from './config';
import { ValidationError } from './errors';

const client = new DiscordClient({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const slashCommands: Collection<string, SlashCommandData> = new Collection();
for (const fileName of require('fs').readdirSync(path.resolve(__dirname, './slashCommands'))) {
    if (fileName.slice(-3) !== '.js') continue;

    const { command }: { command: SlashCommandData } = require(path.resolve(
        __dirname,
        `./slashCommands/${fileName}`
    ));
    slashCommands.set(command.structure.name, command);
}

const chatCommands: Collection<string, ChatCommandData> = new Collection();
for (const fileName of require('fs').readdirSync(path.resolve(__dirname, './chatCommands'))) {
    if (fileName.slice(-3) !== '.js') continue;

    const { command }: { command: ChatCommandData } = require(path.resolve(
        __dirname,
        `./chatCommands/${fileName}`
    ));
    for (const name of command.names) chatCommands.set(name, command);
}

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

client.on('message', async (message: Message) => {
    if (
        message.channel.type !== 'text' ||
        !message.content.startsWith(config.COMMAND_CHAR) ||
        message.author.bot
    )
        return;

    let commandName = message.content.split(' ')[0].slice(1);
    const args = message.content.slice(commandName.length + 2).trim();

    const command: ChatCommandData | undefined = chatCommands.get(commandName);
    if (!command) return;

    try {
        await command.run(message, args, commandName);
    } catch (err) {
        let errMessage: {
            content?: string;
            embed?: { description: string };
        };
        if (err instanceof ValidationError) {
            errMessage = { embed: { description: err.message } };
        } else {
            errMessage = {
                content: 'An error occurred. Please try again later.',
            };
            if (config.DEV_ID) errMessage.content += ` <@${config.DEV_ID}>`;
            console.error(err);
        }
        try {
            await message.channel.send(errMessage);
        } catch (responseErr) {
            console.error('An error occurred while responding to an error:\n', responseErr);
        }
    }
});

console.log('Logging in...');
client.login(config.BOT_TOKEN).then(async () => {
    if (client.user?.tag) console.log(`Logged in as ${client.user.tag}. Getting ready...`);
    else console.log('Logged in. Getting ready...');

    const [commandArg] = process.argv.slice(2);
    if (commandArg === 'register-slash') {
        const slashCommandStructures = slashCommands.map(
            (command: SlashCommandData) => command.structure
        );
        await Promise.all(
            client.guilds.cache.map((guild: Guild) => guild.commands.set(slashCommandStructures))
        );
        console.log('Slash commands have been registered');
    }
});
