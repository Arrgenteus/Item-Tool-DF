import {
    ButtonInteraction,
    InteractionReplyOptions,
    InteractionUpdateOptions,
    Message,
} from 'discord.js';
import { NonCommandInteractionData } from '../eventHandlerTypes';
import { SORT_ACTIONS } from '../interactionLogic/sort/constants';
import { getSortResultsMessageUsingMessageFilters } from '../interactionLogic/sort/getSortedItemsResponse';
import { ItemTag, ItemType } from '../utils/itemTypeData';

const buttonInteration: NonCommandInteractionData = {
    names: [SORT_ACTIONS.SHOW_RESULTS],
    preferEphemeralErrorMessage: true,
    run: async (interaction: ButtonInteraction, args: string[]): Promise<void> => {
        const [itemType, excludedTagList]: string[] = args;
        const excludedTags: string[] | undefined = excludedTagList
            ? excludedTagList.split(',')
            : undefined;
        const sortedItemResponse: InteractionReplyOptions & InteractionUpdateOptions =
            await getSortResultsMessageUsingMessageFilters(
                interaction.message.embeds[0].title!,
                interaction.message.embeds[0].description ?? undefined,
                excludedTags as ItemTag[],
                itemType as ItemType
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
