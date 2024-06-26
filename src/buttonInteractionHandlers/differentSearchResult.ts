import {
    BaseMessageComponentOptions,
    ButtonInteraction,
    InteractionReplyOptions,
    InteractionUpdateOptions,
    Message,
    MessageActionRowOptions,
} from 'discord.js';
import { NonCommandInteractionData } from '../eventHandlerTypes.js';
import {
    deleteMoreImagesButtonInButtonList,
    replaceSimilarResultWithCurrentResultInButtonList,
    updateMoreImagesButtonInButtonList,
} from '../interactionLogic/search/formattedResults.js';
import { getSearchResultMessage } from '../interactionLogic/search/search.js';
import {
    DIFFERENT_SEARCH_RESULT_INTERACTION_ID,
    SearchableItemCategory,
} from '../interactionLogic/search/types.js';

export const differentItemSearchResultButton: NonCommandInteractionData = {
    names: [DIFFERENT_SEARCH_RESULT_INTERACTION_ID],
    preferEphemeralErrorMessage: true,
    run: async (interaction: ButtonInteraction, args: string[]): Promise<void> => {
        const [
            userId,
            otherResultName,
            itemSearchCategory,
            maxLevelInput,
            minLevelInput,
        ]: string[] = args;

        const maxLevel = maxLevelInput === '' ? undefined : Number(maxLevelInput);
        const minLevel = minLevelInput === '' ? undefined : Number(minLevelInput);

        const noResultMessage: InteractionUpdateOptions & InteractionReplyOptions = {
            embeds: [
                { description: `No ${itemSearchCategory} was found. This is likely an error.` },
            ],
            components: [],
            ephemeral: true,
        };
        const itemSearchResult:
            | {
                  message: InteractionUpdateOptions & InteractionReplyOptions;
                  hasMultipleImages: boolean;
              }
            | undefined = await getSearchResultMessage({
            term: otherResultName,
            itemSearchCategory: itemSearchCategory as SearchableItemCategory,
            maxLevel,
            minLevel,
        });

        if (!itemSearchResult) {
            await interaction.reply(noResultMessage);
            return;
        }

        itemSearchResult.message.components = itemSearchResult.message.components ?? [];

        if (
            userId === interaction.user.id ||
            (interaction.message instanceof Message && interaction.message.flags?.has('EPHEMERAL'))
        ) {
            const currentSearchItemName: string = interaction.message.embeds[0].title!;

            itemSearchResult.message.components = [
                ...(interaction.message.components ?? []),
            ] as (Required<BaseMessageComponentOptions> & MessageActionRowOptions)[];

            if (itemSearchResult.hasMultipleImages) {
                updateMoreImagesButtonInButtonList({
                    itemName: otherResultName,
                    itemSearchCategory: itemSearchCategory as SearchableItemCategory,
                    maxLevel,
                    minLevel,
                    messageComponents: itemSearchResult.message.components,
                });
            } else {
                deleteMoreImagesButtonInButtonList(itemSearchResult.message.components);
            }

            replaceSimilarResultWithCurrentResultInButtonList({
                itemNameToReplace: otherResultName,
                itemNameReplacement: currentSearchItemName,
                messageComponents: itemSearchResult.message.components,
            });

            await interaction.update(itemSearchResult.message);
        } else {
            if (itemSearchResult.hasMultipleImages) {
                updateMoreImagesButtonInButtonList({
                    itemName: otherResultName,
                    itemSearchCategory: itemSearchCategory as SearchableItemCategory,
                    maxLevel,
                    minLevel,
                    messageComponents: itemSearchResult.message.components,
                });
            }
            itemSearchResult.message.ephemeral = true;
            await interaction.reply(itemSearchResult.message);
        }
    },
};
