import { CommandInteraction, MessageEmbedOptions } from 'discord.js';
import { SlashCommandData } from '../eventHandlerTypes';
import { getItemSearchResult } from '../interactionLogic/search/search';
import { SearchableItemCategory } from '../interactionLogic/search/types';
import { unaliasItemType } from '../interactionLogic/search/utils';

function createSearchSlashCommand(commandName: SearchableItemCategory | 'acc'): SlashCommandData {
    let searchableItemCategory: SearchableItemCategory = unaliasItemType(commandName);

    return {
        preferEphemeralErrorMessage: true,
        structure: {
            name: commandName,
            description: `Search for ${
                searchableItemCategory[0] === 'a' ? 'an' : 'a'
            } ${searchableItemCategory} by name`,
            options: [
                {
                    type: 'STRING',
                    name: 'name',
                    required: true,
                    description: `The ${searchableItemCategory} name to search for.`,
                },
                {
                    type: 'INTEGER',
                    name: 'max-level',
                    description: `The maximum ${searchableItemCategory} level to return in results. Is 90 by default.`,
                },
                {
                    type: 'INTEGER',
                    name: 'min-level',
                    description: `The minimum ${searchableItemCategory} level to return in results. Is 0 by default.`,
                },
            ],
        },

        run: async (interaction: CommandInteraction) => {
            const searchQuery: string = interaction.options.getString('name', true);
            const maxLevel: number | undefined =
                interaction.options.getInteger('max-level') ?? undefined;
            const minLevel: number | undefined =
                interaction.options.getInteger('min-level') ?? undefined;

            const accSearchResult: { message: MessageEmbedOptions; noResults: boolean } =
                await getItemSearchResult(searchQuery, searchableItemCategory, maxLevel, minLevel);

            await interaction.reply({
                embeds: [accSearchResult.message],
                ephemeral: accSearchResult.noResults,
            });
        },
    };
}

const categories: (SearchableItemCategory | 'acc')[] = [
    'acc',
    'cape',
    'helm',
    'belt',
    'necklace',
    'ring',
    'trinket',
    'bracer',
];
const commands: SlashCommandData[] = categories.map(createSearchSlashCommand);

export default commands;
