import { CommandInteraction, InteractionReplyOptions } from 'discord.js';
import { SlashCommandData } from '../eventHandlerTypes';
import { getSearchResultMessagewithButtons } from '../interactionLogic/search/search';
import {
    SearchableItemCategory,
    SearchableItemCategoryAlias,
} from '../interactionLogic/search/types';
import { unaliasItemType } from '../interactionLogic/search/utils';

function createSearchSlashCommand(
    commandName: SearchableItemCategory | SearchableItemCategoryAlias
): SlashCommandData {
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
            const itemNameToSearchFor: string = interaction.options.getString('name', true);
            const maxLevel: number | undefined =
                interaction.options.getInteger('max-level') ?? undefined;
            const minLevel: number | undefined =
                interaction.options.getInteger('min-level') ?? undefined;

            const itemSearchCategory = unaliasItemType(commandName);
            const itemSearchResult: InteractionReplyOptions | undefined =
                await getSearchResultMessagewithButtons({
                    term: itemNameToSearchFor,
                    itemSearchCategory,
                    maxLevel,
                    minLevel,
                    userIdForSimilarResults: interaction.user.id,
                });
            if (itemSearchResult) {
                await interaction.reply(itemSearchResult);
            } else {
                await interaction.reply({
                    embeds: [{ description: `No ${itemSearchCategory} was found.` }],
                    ephemeral: true,
                });
            }
        },
    };
}

const categories: (SearchableItemCategory | SearchableItemCategoryAlias)[] = [
    'item',
    'wep',
    'sword',
    'axe',
    'mace',
    'staff',
    'wand',
    'dagger',
    'scythe',
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
