import { ButtonInteraction, Message } from 'discord.js';
import { NonCommandInteractionData } from '../eventHandlerTypes.js';
import { SORT_ACTIONS } from '../interactionLogic/sort/constants.js';
import { getSortResultsMessage } from '../interactionLogic/sort/getSortedItemsResponse.js';
import {
    cacheSortQueryFilters,
    getSortQueryFiltersFromOriginalMessage,
} from '../interactionLogic/sort/sortResultMessageStore.js';
import { SortFilterParams } from '../interactionLogic/sort/types.js';

export const nextAndPrevPageSortResultsButton: NonCommandInteractionData = {
    // previous page sort results, next page sort results
    names: [SORT_ACTIONS.PREV_PAGE, SORT_ACTIONS.NEXT_PAGE],
    preferEphemeralErrorMessage: true,
    run: async (
        interaction: ButtonInteraction,
        args: string[],
        handlerName: SORT_ACTIONS
    ): Promise<void> => {
        const sortFilters: SortFilterParams = getSortQueryFiltersFromOriginalMessage(
            interaction.message.id
        );
        const valueLimit = args[0];
        sortFilters[
            handlerName === SORT_ACTIONS.NEXT_PAGE ? 'nextPageValueLimit' : 'prevPageValueLimit'
        ] = Number(valueLimit);

        const sortedItemResponse = await getSortResultsMessage(sortFilters);

        if (interaction.message instanceof Message && interaction.message.flags?.has('EPHEMERAL')) {
            await interaction.update(sortedItemResponse);
            cacheSortQueryFilters(interaction.message.id, sortFilters);
        } else {
            const sentMessage = await interaction.reply({
                ...sortedItemResponse,
                ephemeral: true,
                fetchReply: true,
            });
            cacheSortQueryFilters(sentMessage.id, sortFilters);
        }
    },
};
