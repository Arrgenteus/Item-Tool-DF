import {
    InteractionReplyOptions,
    InteractionUpdateOptions,
    Message,
    SelectMenuInteraction,
} from 'discord.js';
import { NonCommandInteractionData } from '../eventHandlerTypes.js';
import { SORT_ACTIONS } from '../interactionLogic/sort/constants.js';
import { getSortResultsMessageUsingMessageFilters } from '../interactionLogic/sort/getSortedItemsResponse.js';
import { ItemTag } from '../utils/itemTypeData.js';

export const changeSortResultTagFilterSelectMenu: NonCommandInteractionData = {
    names: [SORT_ACTIONS.TAG_SELECTION],
    preferEphemeralErrorMessage: true,
    run: async (interaction: SelectMenuInteraction): Promise<void> => {
        const sortedItemMessage: InteractionUpdateOptions & InteractionReplyOptions =
            await getSortResultsMessageUsingMessageFilters(
                interaction.message.embeds[0].title!,
                interaction.message.embeds[0].description ?? undefined,
                interaction.values as ItemTag[]
            );
        if (
            interaction.message instanceof Message &&
            (interaction.user.id === interaction.message.interaction?.user.id ||
                interaction.message.flags?.has('EPHEMERAL'))
        ) {
            await interaction.update(sortedItemMessage);
        } else {
            sortedItemMessage.ephemeral = true;
            await interaction.reply(sortedItemMessage);
        }
    },
};
