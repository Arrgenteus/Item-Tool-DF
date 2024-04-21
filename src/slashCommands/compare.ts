import { ApplicationCommandOptionData, CommandInteraction } from 'discord.js';
import { SlashCommandData } from '../eventHandlerTypes';
import { getCompareResultMessage } from '../interactionLogic/search/formattedResults';
import {
    SearchableItemCategory,
    SearchableItemCategoryAlias,
} from '../interactionLogic/search/types';
import { unaliasItemType } from '../interactionLogic/search/utils';
import { compareCommandCategoryList } from '../interactionLogic/search/commandOptions';

function createCompareSlashCommand(
    inputItemCategory: SearchableItemCategory | SearchableItemCategoryAlias
): SlashCommandData {
    const itemCategory: SearchableItemCategory = unaliasItemType(inputItemCategory);

    const commandOptions: ApplicationCommandOptionData[] = [
        {
            type: 'STRING',
            name: `${itemCategory}-1`,
            required: true,
            description: `Name of ${itemCategory} 1 to compare`,
            autocomplete: true,
        },
        {
            type: 'STRING',
            name: `${itemCategory}-2`,
            required: true,
            description: `Name of ${itemCategory} 2 to compare`,
            autocomplete: true,
        },
    ];

    return {
        preferEphemeralErrorMessage: true,
        structure: {
            name: 'compare-' + itemCategory,
            description: `Compare the bonuses and resists of two ${itemCategory}s`,
            options: commandOptions,
        },

        run: async (interaction: CommandInteraction) => {
            const compareResultMessage = await getCompareResultMessage({
                term1: interaction.options.getString(`${itemCategory}-1`, true),
                term2: interaction.options.getString(`${itemCategory}-2`, true),
                itemSearchCategory: itemCategory,
            });

            await interaction.reply(compareResultMessage);
        },
    };
}

const commands: SlashCommandData[] = compareCommandCategoryList.map(createCompareSlashCommand);

export default commands;
