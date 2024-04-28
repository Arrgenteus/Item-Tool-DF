import { fetchAutocompleteItemResults } from '../interactionLogic/search/search';
import { unaliasItemType } from '../interactionLogic/search/utils';
import { searchCommandOptions } from '../interactionLogic/search/commandOptions';
export const itemCommandAutocomplete = {
    names: searchCommandOptions,
    preferEphemeralErrorMessage: true,
    run: async (interaction, args, handlerName) => {
        const searchableItemCategory = unaliasItemType(handlerName);
        const maxLevel = interaction.options.getInteger('max-level') ?? undefined;
        const autocompleteChoices = await fetchAutocompleteItemResults({
            term: interaction.options.getFocused(),
            itemSearchCategory: searchableItemCategory,
            maxLevel,
        });
        await interaction.respond(autocompleteChoices);
    },
};
