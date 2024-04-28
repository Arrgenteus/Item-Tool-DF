import { ApplicationCommandOptionChoiceData, AutocompleteInteraction } from 'discord.js';
import { NonCommandInteractionData } from '../eventHandlerTypes';
import { fetchAutocompleteItemResults } from '../interactionLogic/search/search';
import {
    SearchableItemCategory,
    SearchableItemCategoryAlias,
} from '../interactionLogic/search/types';
import { unaliasItemType } from '../interactionLogic/search/utils';
import { searchCommandOptions } from '../interactionLogic/search/commandOptions';

export const itemCommandAutocomplete: NonCommandInteractionData = {
    names: searchCommandOptions,
    preferEphemeralErrorMessage: true,
    run: async (
        interaction: AutocompleteInteraction,
        args,
        handlerName: SearchableItemCategoryAlias
    ): Promise<void> => {
        const searchableItemCategory: SearchableItemCategory = unaliasItemType(handlerName);
        const maxLevel: number | undefined =
            interaction.options.getInteger('max-level') ?? undefined;
        const autocompleteChoices: ApplicationCommandOptionChoiceData[] =
            await fetchAutocompleteItemResults({
                term: interaction.options.getFocused(),
                itemSearchCategory: searchableItemCategory,
                maxLevel,
            });

        await interaction.respond(autocompleteChoices);
    },
};
