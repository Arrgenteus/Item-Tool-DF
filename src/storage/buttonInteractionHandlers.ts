import { Collection } from 'discord.js';
import showSortResultsHandler from '../buttonInteractions/showSortResults';
import nextPageSortResultsHandler from '../buttonInteractions/nextAndPrevPageSortResults';
import { ButtonInteractionData } from '../eventHandlerTypes';

const buttonInteractionHandlers: Collection<string, ButtonInteractionData> = new Collection();

const buttonInteractionHandlerList: ButtonInteractionData[] = [
    showSortResultsHandler,
    nextPageSortResultsHandler,
];
for (const buttonInteractionHandler of buttonInteractionHandlerList) {
    for (const interactionName of buttonInteractionHandler.names) {
        buttonInteractionHandlers.set(interactionName, buttonInteractionHandler);
    }
}
console.log('Button interaction handlers have been loaded');

export default buttonInteractionHandlers;
