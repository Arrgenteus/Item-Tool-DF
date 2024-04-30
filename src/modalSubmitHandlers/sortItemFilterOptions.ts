import { ModalSubmitInteraction } from 'discord.js';
import config from '../config.js';
import { ValidationError } from '../errors.js';
import { NonCommandInteractionData } from '../eventHandlerTypes.js';
import { getSortResultsMessage } from '../interactionLogic/sort/getSortedItemsResponse.js';
import { parseSortExpression } from '../interactionLogic/sort/sortExpressionParser.js';
import { SortFilterParams } from '../interactionLogic/sort/types.js';
import { cacheSortQueryFilters } from '../interactionLogic/sort/sortResultMessageStore.js';

export const sortItemFilterOptionsModal: NonCommandInteractionData = {
    names: ['sort-filters'],
    preferEphemeralErrorMessage: true,
    run: async (interaction: ModalSubmitInteraction): Promise<void> => {
        const inputSortExpression: string = interaction.fields.getTextInputValue('sort-expression');
        if (!inputSortExpression) {
            throw new ValidationError('A sort expression must be provided.');
        }

        const weaponElement: string | undefined =
            interaction.fields.getTextInputValue('weapon-element') || undefined;
        const maxLevelInput: string = interaction.fields.getTextInputValue('max-level') || '90';
        const maxLevel: number = Number(maxLevelInput);
        if (isNaN(maxLevel)) {
            throw new ValidationError('The max level you entered is not a valid number.');
        }

        const filters: SortFilterParams = {
            itemType: weaponElement ? 'weapon' : undefined,
            sortExpression: parseSortExpression(inputSortExpression),
            weaponElement: weaponElement?.toLowerCase(),
            maxLevel,
        };

        const shouldDisplayShortResult: boolean =
            !interaction.channel ||
            !(config.LONG_RESULT_CHANNELS || []).includes(interaction.channel.id);

        const sortedItemMessage = await getSortResultsMessage(filters, shouldDisplayShortResult);

        const sentMessage = await interaction.reply({ ...sortedItemMessage, fetchReply: true });
        cacheSortQueryFilters(sentMessage.id, filters);
    },
};
