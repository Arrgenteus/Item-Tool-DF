import { CommandInteraction } from 'discord.js';
import config from '../config.js';
import { ValidationError } from '../errors.js';
import { SlashCommandData } from '../eventHandlerTypes.js';
import { ITEM_TAG_FILTER_OPTION_NAMES } from '../interactionLogic/sort/constants.js';
import {
    getSortCommandInputModal,
    getSortCommandOptions,
} from '../interactionLogic/sort/commandOptions.js';
import { getSortResultsMessage } from '../interactionLogic/sort/getSortedItemsResponse.js';
import { parseSortExpression } from '../interactionLogic/sort/sortExpressionParser.js';
import {
    SortCommandParams,
    SortExpressionData,
    SortItemTypeOption,
} from '../interactionLogic/sort/types.js';
import { ItemTag } from '../utils/itemTypeData.js';
import { notifyUserOfUpdatedSortBehavior } from '../interactionLogic/sort/notify.js';

export const sortCommand: SlashCommandData = {
    preferEphemeralErrorMessage: true,
    structure: {
        name: 'sort',
        description: 'Sort items by provided criteria',
        options: getSortCommandOptions(),
    },

    run: async (interaction: CommandInteraction) => {
        let inputSortExpression: string | undefined =
            interaction.options.getString(SortCommandParams.SORT_EXPRESSION) ?? undefined;
        let itemTypeInput: SortItemTypeOption =
            (interaction.options.getString(
                SortCommandParams.ITEM_TYPE
            ) as SortItemTypeOption | null) ?? 'items';
        let maxLevel: number | undefined =
            interaction.options.getInteger(SortCommandParams.MAX_LEVEL) ?? undefined;
        if (maxLevel !== undefined) maxLevel = Math.min(Math.max(maxLevel, 0), 90);

        const weaponElement: string | undefined =
            interaction.options.getString(SortCommandParams.WEAPON_ELEMENT) ?? undefined;
        if (weaponElement && weaponElement.length > 20) {
            throw new ValidationError(
                `Element name \`${weaponElement}\` is too long. It should be a maximum of 20 characters.`
            );
        }

        if (!inputSortExpression) {
            const inputModal = getSortCommandInputModal({});
            await interaction.showModal(inputModal);
            return;
        }

        const parsedSortExpression: SortExpressionData = parseSortExpression(inputSortExpression);

        const charID: string | undefined =
            interaction.options.getString(SortCommandParams.CHAR_ID) ?? undefined;

        const itemTagsToExclude: Set<ItemTag> = new Set();
        if (interaction.options.getBoolean('weakcore')) {
            const weakcoreTags: ItemTag[] = ['dc', 'dm', 'so', 'se', 'rare'];
            for (const weakcoreTag of weakcoreTags) itemTagsToExclude.add(weakcoreTag);
        }
        for (const { optionName, tag } of ITEM_TAG_FILTER_OPTION_NAMES) {
            if (interaction.options.getBoolean(optionName) === false) itemTagsToExclude.add(tag);
        }

        // Exclude rare tagged items unless enabled explicitly
        if (interaction.options.getBoolean(SortCommandParams.RARE_TAG) !== true) {
            itemTagsToExclude.add('rare')
        }

        const sortResultFilters = {
            sortExpression: parsedSortExpression,
            weaponElement: weaponElement?.toLowerCase(),
            maxLevel,
            charID,
            excludeTags: itemTagsToExclude,
            ascending: interaction.options.getBoolean(SortCommandParams.ASCENDING) === true,
        };

        const shouldDisplayShortResult: boolean =
            !interaction.channel ||
            !(config.LONG_RESULT_CHANNELS || []).includes(interaction.channel.id);

        const sortedItemMessage = await getSortResultsMessage(
            itemTypeInput,
            sortResultFilters,
            shouldDisplayShortResult
        );

        await interaction.reply(sortedItemMessage);

        await notifyUserOfUpdatedSortBehavior(interaction, parsedSortExpression);
    },
};
