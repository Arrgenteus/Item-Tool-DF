import {
    ButtonInteraction,
    InteractionReplyOptions,
    InteractionUpdateOptions,
    Message,
} from 'discord.js';
import { NonCommandInteractionData } from '../eventHandlerTypes';
import { SORT_ACTIONS } from '../interactionLogic/sort/constants';
import { getSortResultsMessageUsingMessageFilters } from '../interactionLogic/sort/getSortedItemsResponse';
import { ItemTag } from '../utils/itemTypeData';

const buttonInteration: NonCommandInteractionData = {
    // previous page sort results, next page sort results
    names: [SORT_ACTIONS.PREV_PAGE, SORT_ACTIONS.NEXT_PAGE],
    preferEphemeralErrorMessage: true,
    run: async (
        interaction: ButtonInteraction,
        args: string[],
        handlerName: SORT_ACTIONS
    ): Promise<void> => {
        const [valueLimit, excludedTagList]: string[] = args;
        const excludedTags: string[] | undefined = excludedTagList
            ? excludedTagList.split(',')
            : undefined;
        const sortedItemResponse: InteractionReplyOptions & InteractionUpdateOptions =
            await getSortResultsMessageUsingMessageFilters(
                interaction.message.embeds[0].title!,
                interaction.message.embeds[0].description ?? undefined,
                excludedTags as ItemTag[],
                undefined,
                {
                    [handlerName === SORT_ACTIONS.NEXT_PAGE
                        ? 'nextPageValueLimit'
                        : 'prevPageValueLimit']: Number(valueLimit),
                }
            );

        if (interaction.message instanceof Message && interaction.message.flags?.has('EPHEMERAL')) {
            await interaction.update(sortedItemResponse);
        } else {
            sortedItemResponse.ephemeral = true;
            await interaction.reply(sortedItemResponse);
        }
    },
};

export default buttonInteration;
