import { fetchAutocompleteItemResults } from '../interactionLogic/search/search';
import { compareCommandCategoryList } from '../interactionLogic/search/commandOptions';
export const compareCommandAutocomplete = {
    names: compareCommandCategoryList.map((category) => 'compare-' + category),
    preferEphemeralErrorMessage: true,
    run: async (interaction, args, handlerName) => {
        const autocompleteChoices = await fetchAutocompleteItemResults({
            term: interaction.options.getFocused(),
            itemSearchCategory: handlerName === 'compare-weapon'
                ? 'weapon'
                : handlerName.slice('compare-'.length),
        });
        await interaction.respond(autocompleteChoices);
    },
};
