import {
    ApplicationCommandOptionData,
    CommandInteraction,
    InteractionReplyOptions,
} from 'discord.js';
import { SlashCommandData } from '../eventHandlerTypes.js';
import { getSearchResultMessagewithButtons } from '../interactionLogic/search/search.js';
import {
    SearchableItemCategory,
    SearchableItemCategoryAlias,
} from '../interactionLogic/search/types.js';
import { unaliasItemType } from '../interactionLogic/search/utils.js';
import { searchCommandOptions } from '../interactionLogic/search/commandOptions.js';

function createSearchSlashCommand(
    commandName: SearchableItemCategory | SearchableItemCategoryAlias
): SlashCommandData {
    const searchableItemCategory: SearchableItemCategory = unaliasItemType(commandName);

    const commandOptions: ApplicationCommandOptionData[] = [
        {
            type: 'STRING',
            name: 'name',
            required: true,
            description: `The ${searchableItemCategory} name to search for.`,
            autocomplete: true,
        },
    ];
    if (searchableItemCategory !== 'cosmetic') {
        commandOptions.push(
            {
                type: 'INTEGER',
                name: 'max-level',
                description: `The maximum ${searchableItemCategory} level to return in results. Is 90 by default.`,
            },
            {
                type: 'INTEGER',
                name: 'min-level',
                description: `The minimum ${searchableItemCategory} level to return in results. Is 0 by default.`,
            }
        );
    }

    return {
        preferEphemeralErrorMessage: true,
        structure: {
            name: commandName,
            description: `Search for ${
                searchableItemCategory[0] === 'a' ? 'an' : 'a'
            } ${searchableItemCategory} by name`,
            options: commandOptions,
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

export const itemSearchCommands: SlashCommandData[] =
    searchCommandOptions.map(createSearchSlashCommand);
