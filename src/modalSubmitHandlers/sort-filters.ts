import { ModalSubmitInteraction } from 'discord.js';
import config from '../config';
import { ValidationError } from '../errors';
import { NonCommandInteractionData } from '../eventHandlerTypes';
import { getSortResultsMessage } from '../interactionLogic/sort/getSortedItemsResponse';
import { parseSortExpression } from '../interactionLogic/sort/sortExpressionParser';

const modalSubmitInteration: NonCommandInteractionData = {
    names: ['sort-filters'],
    preferEphemeralErrorMessage: true,
    run: async (interaction: ModalSubmitInteraction): Promise<void> => {
        const inputSortExpression: string = interaction.fields.getTextInputValue('sort-expression');
        if (!inputSortExpression) {
            throw new ValidationError('A sort expression must be provided.');
        }

        const weaponElement: string | undefined =
            interaction.fields.getTextInputValue('weapon-element') || undefined;
        const maxLevelInput: string = interaction.fields.getTextInputValue('max-level') || '90';
        const maxLevel: number = Number(maxLevelInput);
        if (isNaN(maxLevel)) {
            throw new ValidationError('The max level you entered is not a valid number.');
        }

        const filters = {
            sortExpression: parseSortExpression(inputSortExpression),
            weaponElement: weaponElement?.toLowerCase(),
            maxLevel,
        };

        const shouldDisplayShortResult: boolean =
            !interaction.channel ||
            !(config.LONG_RESULT_CHANNELS || []).includes(interaction.channel.id);

        const sortedItemMessage = await getSortResultsMessage(
            weaponElement ? 'weapon' : 'items',
            filters,
            shouldDisplayShortResult
        );

        await interaction.reply(sortedItemMessage);
    },
};

export default modalSubmitInteration;
