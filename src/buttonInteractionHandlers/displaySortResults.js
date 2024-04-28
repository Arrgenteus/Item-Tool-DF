import { Message, } from 'discord.js';
import { SORT_ACTIONS } from '../interactionLogic/sort/constants';
import { getSortResultsMessageUsingMessageFilters } from '../interactionLogic/sort/getSortedItemsResponse';
export const displaySortResultsButton = {
    names: [SORT_ACTIONS.SHOW_RESULTS],
    preferEphemeralErrorMessage: true,
    run: async (interaction, args) => {
        const [itemType, excludedTagList] = args;
        const excludedTags = excludedTagList
            ? excludedTagList.split(',')
            : undefined;
        const sortedItemResponse = await getSortResultsMessageUsingMessageFilters(interaction.message.embeds[0].title, interaction.message.embeds[0].description ?? undefined, excludedTags, itemType);
        if (interaction.message instanceof Message && interaction.message.flags?.has('EPHEMERAL')) {
            await interaction.update(sortedItemResponse);
        }
        else {
            sortedItemResponse.ephemeral = true;
            await interaction.reply(sortedItemResponse);
        }
    },
};
