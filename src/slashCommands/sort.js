import config from '../config';
import { ValidationError } from '../errors';
import { ITEM_TAG_FILTER_OPTION_NAMES } from '../interactionLogic/sort/constants';
import { getSortCommandInputModal, getSortCommandOptions, } from '../interactionLogic/sort/commandOptions';
import { getSortResultsMessage } from '../interactionLogic/sort/getSortedItemsResponse';
import { parseSortExpression } from '../interactionLogic/sort/sortExpressionParser';
import { SortCommandParams, } from '../interactionLogic/sort/types';
export const sortCommand = {
    preferEphemeralErrorMessage: true,
    structure: {
        name: 'sort',
        description: 'Sort items by provided criteria',
        options: getSortCommandOptions(),
    },
    run: async (interaction) => {
        let inputSortExpression = interaction.options.getString(SortCommandParams.SORT_EXPRESSION) ?? undefined;
        let itemTypeInput = interaction.options.getString(SortCommandParams.ITEM_TYPE) ?? 'items';
        let maxLevel = interaction.options.getInteger(SortCommandParams.MAX_LEVEL) ?? undefined;
        if (maxLevel !== undefined)
            maxLevel = Math.min(Math.max(maxLevel, 0), 90);
        const weaponElement = interaction.options.getString(SortCommandParams.WEAPON_ELEMENT) ?? undefined;
        if (weaponElement && weaponElement.length > 20) {
            throw new ValidationError(`Element name \`${weaponElement}\` is too long. It should be a maximum of 20 characters.`);
        }
        if (!inputSortExpression) {
            const inputModal = getSortCommandInputModal({});
            await interaction.showModal(inputModal);
            return;
        }
        const parsedSortExpression = parseSortExpression(inputSortExpression);
        const charID = interaction.options.getString(SortCommandParams.CHAR_ID) ?? undefined;
        const excludeTags = new Set();
        if (interaction.options.getBoolean('weakcore')) {
            const weakcoreTags = ['dc', 'dm', 'so', 'se', 'rare'];
            for (const weakcoreTag of weakcoreTags)
                excludeTags.add(weakcoreTag);
        }
        for (const { optionName, tag } of ITEM_TAG_FILTER_OPTION_NAMES) {
            if (interaction.options.getBoolean(optionName) === false)
                excludeTags.add(tag);
        }
        const filters = {
            sortExpression: parsedSortExpression,
            weaponElement: weaponElement?.toLowerCase(),
            maxLevel,
            charID,
            excludeTags,
            ascending: interaction.options.getBoolean(SortCommandParams.ASCENDING) === true,
        };
        const shouldDisplayShortResult = !interaction.channel ||
            !(config.LONG_RESULT_CHANNELS || []).includes(interaction.channel.id);
        const sortedItemMessage = await getSortResultsMessage(itemTypeInput, filters, shouldDisplayShortResult);
        await interaction.reply(sortedItemMessage);
    },
};
