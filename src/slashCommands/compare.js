import { getCompareResultMessage } from '../interactionLogic/search/formattedResults';
import { unaliasItemType } from '../interactionLogic/search/utils';
import { compareCommandCategoryList } from '../interactionLogic/search/commandOptions';
function createCompareSlashCommand(inputItemCategory) {
    const itemCategory = unaliasItemType(inputItemCategory);
    const commandOptions = [
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
        run: async (interaction) => {
            const compareResultMessage = await getCompareResultMessage({
                term1: interaction.options.getString(`${itemCategory}-1`, true),
                term2: interaction.options.getString(`${itemCategory}-2`, true),
                itemSearchCategory: itemCategory,
            });
            await interaction.reply(compareResultMessage);
        },
    };
}
export const compareCommands = compareCommandCategoryList.map(createCompareSlashCommand);
