import {
    APIActionRowComponent,
    APIComponentInMessageActionRow,
    ButtonInteraction,
    InteractionReplyOptions,
    InteractionUpdateOptions,
    Message,
    MessageFlags,
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

        const noResultMessage: InteractionReplyOptions = {
            embeds: [
                { description: `No ${itemSearchCategory} was found. This is likely an error.` },
            ],
            components: [],
            flags: MessageFlags.Ephemeral,
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
            (interaction.message instanceof Message &&
                interaction.message.flags?.has(MessageFlags.Ephemeral))
        ) {
            const currentSearchItemName: string = interaction.message.embeds[0].title!;

            const messageComponents = interaction.message.components.map((component) =>
                component.toJSON()
            ) as APIActionRowComponent<APIComponentInMessageActionRow>[];
            itemSearchResult.message.components = messageComponents;

            if (itemSearchResult.hasMultipleImages) {
                updateMoreImagesButtonInButtonList({
                    itemName: otherResultName,
                    itemSearchCategory: itemSearchCategory as SearchableItemCategory,
                    maxLevel,
                    minLevel,
                    messageComponents,
                });
            } else {
                deleteMoreImagesButtonInButtonList(messageComponents);
            }

            replaceSimilarResultWithCurrentResultInButtonList({
                itemNameToReplace: otherResultName,
                itemNameReplacement: currentSearchItemName,
                messageComponents,
            });

            await interaction.update(itemSearchResult.message);
        } else {
            if (itemSearchResult.hasMultipleImages) {
                const messageComponents = (itemSearchResult.message.components ??
                    []) as APIActionRowComponent<APIComponentInMessageActionRow>[];
                updateMoreImagesButtonInButtonList({
                    itemName: otherResultName,
                    itemSearchCategory: itemSearchCategory as SearchableItemCategory,
                    maxLevel,
                    minLevel,
                    messageComponents,
                });
            }
            await interaction.reply({
                ...itemSearchResult.message,
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
