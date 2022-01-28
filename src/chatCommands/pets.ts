import { Message, MessageEmbedOptions, TextChannel } from 'discord.js';
import config from '../config';
import { ChatCommandData } from '../eventHandlerTypes';
import { getPetSearchResult } from '../interactionLogic/search/pets';
import { embed } from '../utils/misc';

const command: ChatCommandData = {
    names: ['pet', 'pets'],
    run: async (message: Message, searchQuery: string, commandName: string): Promise<void> => {
        const channel: TextChannel = message.channel as TextChannel;

        if (!searchQuery) {
            await channel.send(
                embed(
                    `Usage: ${config.COMMAND_CHAR}${commandName} \`[name]\` _or_ ` +
                        `${config.COMMAND_CHAR}${commandName} \`[name]\` / \`[max level]\` - ` +
                        'Search for a pet with an optional `max level` filter'
                )
            );
            return;
        }

        const slashPosition: number = searchQuery.lastIndexOf('/');
        let maxLevel: number | undefined;
        if (slashPosition > -1) {
            maxLevel = Number(searchQuery.slice(slashPosition + 1).trim());
            if (!Number.isInteger(maxLevel)) {
                await channel.send('The max level must be an integer.');
                return;
            }
            searchQuery = searchQuery.slice(0, slashPosition).trim();
        }
        if (!searchQuery) {
            await channel.send('The search query cannot be blank');
            return;
        }
        const { message: petSearchResult }: { message: MessageEmbedOptions } =
            await getPetSearchResult(searchQuery, maxLevel);

        await channel.send({ embeds: [petSearchResult] });
    },
};

export default command;
