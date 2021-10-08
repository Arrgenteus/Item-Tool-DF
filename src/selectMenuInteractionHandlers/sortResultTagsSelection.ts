import {
    InteractionReplyOptions,
    Message,
    MessageOptions,
    SelectMenuInteraction,
} from 'discord.js';
import { ActionRowInteractionData } from '../eventHandlerTypes';
import { SORT_ACTIONS } from '../interactionLogic/sort/constants';
import { getSortResultsMessageUsingMessageFilters } from '../interactionLogic/sort/getSortedItemsResponse';
import { SortFilterParams } from '../interactionLogic/sort/types';
import { ItemTag } from '../utils/itemTypeData';

const buttonInteration: ActionRowInteractionData = {
    names: [SORT_ACTIONS.TAG_SELECTION],
    preferEphemeralErrorMessage: true,
    run: async (interaction: SelectMenuInteraction): Promise<void> => {
        const sortedItemMessage: InteractionReplyOptions =
            await getSortResultsMessageUsingMessageFilters(
                interaction.message.embeds[0].title!,
                interaction.message.embeds[0].description ?? undefined,
                interaction.values as ItemTag[]
            );
        if (interaction.message instanceof Message && interaction.message.flags?.has('EPHEMERAL')) {
            await interaction.update(sortedItemMessage);
        } else {
            sortedItemMessage.ephemeral = true;
            await interaction.reply(sortedItemMessage);
        }
    },
};

export default buttonInteration;
function getSortedItemList(
    usedFilters: SortFilterParams
): MessageOptions | PromiseLike<MessageOptions> {
    throw new Error('Function not implemented.');
}