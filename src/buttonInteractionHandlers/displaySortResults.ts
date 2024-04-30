import {
    ButtonInteraction,
    InteractionReplyOptions,
    InteractionUpdateOptions,
    Message,
} from 'discord.js';
import { NonCommandInteractionData } from '../eventHandlerTypes.js';
import { SORT_ACTIONS } from '../interactionLogic/sort/constants.js';
import {
    getSortResultsMessage,
    getSortResultsMessageUsingMessageFilters,
} from '../interactionLogic/sort/getSortedItemsResponse.js';
import { ItemTag, ItemType } from '../utils/itemTypeData.js';
import {
    cacheSortQueryFilters,
    getSortQueryFiltersFromOriginalMessage,
} from '../interactionLogic/sort/sortResultMessageStore.js';

export const displaySortResultsButton: NonCommandInteractionData = {
    names: [SORT_ACTIONS.SHOW_RESULTS],
    preferEphemeralErrorMessage: true,
    run: async (interaction: ButtonInteraction, args: string[]): Promise<void> => {
        const sortFilters = getSortQueryFiltersFromOriginalMessage(interaction.message.id);
        const itemType: ItemType = args[0] as ItemType;

        sortFilters.itemType = itemType;

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
