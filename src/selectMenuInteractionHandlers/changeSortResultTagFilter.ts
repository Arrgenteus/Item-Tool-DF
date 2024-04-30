import {
    InteractionReplyOptions,
    InteractionUpdateOptions,
    Message,
    SelectMenuInteraction,
} from 'discord.js';
import { NonCommandInteractionData } from '../eventHandlerTypes.js';
import { SORT_ACTIONS } from '../interactionLogic/sort/constants.js';
import {
    getSortResultsMessage,
    getSortResultsMessageUsingMessageFilters,
} from '../interactionLogic/sort/getSortedItemsResponse.js';
import { ItemTag } from '../utils/itemTypeData.js';
import {
    cacheSortQueryFilters,
    getSortQueryFiltersFromOriginalMessage,
} from '../interactionLogic/sort/sortResultMessageStore.js';

export const changeSortResultTagFilterSelectMenu: NonCommandInteractionData = {
    names: [SORT_ACTIONS.TAG_SELECTION],
    preferEphemeralErrorMessage: true,
    run: async (interaction: SelectMenuInteraction): Promise<void> => {
        const sortFilters = getSortQueryFiltersFromOriginalMessage(interaction.message.id);
        delete sortFilters.nextPageValueLimit;
        delete sortFilters.prevPageValueLimit;
        sortFilters.excludeTags = new Set(interaction.values as ItemTag[]);

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
