import { Message, } from 'discord.js';
import { SORT_ACTIONS } from '../interactionLogic/sort/constants';
import { getSortResultsMessageUsingMessageFilters } from '../interactionLogic/sort/getSortedItemsResponse';
export const nextAndPrevPageSortResultsButton = {
    // previous page sort results, next page sort results
    names: [SORT_ACTIONS.PREV_PAGE, SORT_ACTIONS.NEXT_PAGE],
    preferEphemeralErrorMessage: true,
    run: async (interaction, args, handlerName) => {
        const [valueLimit, excludedTagList] = args;
        const excludedTags = excludedTagList
            ? excludedTagList.split(',')
            : undefined;
        const sortedItemResponse = await getSortResultsMessageUsingMessageFilters(interaction.message.embeds[0].title, interaction.message.embeds[0].description ?? undefined, excludedTags, undefined, {
            [handlerName === SORT_ACTIONS.NEXT_PAGE
                ? 'nextPageValueLimit'
                : 'prevPageValueLimit']: Number(valueLimit),
        });
        if (interaction.message instanceof Message && interaction.message.flags?.has('EPHEMERAL')) {
            await interaction.update(sortedItemResponse);
        }
        else {
            sortedItemResponse.ephemeral = true;
            await interaction.reply(sortedItemResponse);
        }
    },
};
