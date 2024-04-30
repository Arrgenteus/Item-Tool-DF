import { Collection } from 'discord.js';
import {
    ChatCommandData,
    NonCommandInteractionData,
    SlashCommandData,
} from './eventHandlerTypes.js';
import * as autocompleteHandlers from './autocompleteHandlers/index.js';
import * as buttonInteractionHandlers from './buttonInteractionHandlers/index.js';
import * as modalSubmitHandlers from './modalSubmitHandlers/index.js';
import * as selectMenuInteractionHandlers from './selectMenuInteractionHandlers/index.js';
import * as slashCommandHandlers from './slashCommands/index.js';
import * as chatCommandHandlers from './chatCommands/index.js';

function loadInteractionNameToHandlerMapping(interactionHandlerObjects: {
    [name: string]: NonCommandInteractionData;
}) {
    const handlerMap: Collection<string, NonCommandInteractionData> = new Collection();
    for (const handlerObject of Object.values(interactionHandlerObjects)) {
        for (const handlerName of handlerObject.names) {
            if (handlerMap.has(handlerName)) {
                throw new Error(
                    `Duplicate interaction handler name '${handlerName}' for ${handlerObject.constructor}`
                );
            }
            handlerMap.set(handlerName, handlerObject);
        }
    }
    return handlerMap;
}

export const autocompleteHandlerMap = loadInteractionNameToHandlerMapping(autocompleteHandlers);
console.log('Autocomplete interaction handlers have been loaded');

export const buttonInteractionHandlerMap =
    loadInteractionNameToHandlerMapping(buttonInteractionHandlers);
console.log('Button interaction handlers have been loaded');

export const modalSubmitHandlerMap = loadInteractionNameToHandlerMapping(modalSubmitHandlers);
console.log('Modal interaction handlers have been loaded');

export const selectMenuInteractionHandlerMap = loadInteractionNameToHandlerMapping(
    selectMenuInteractionHandlers
);
console.log('Select menu interaction handlers have been loaded');

export const slashCommandHandlerMap: Collection<string, SlashCommandData> = new Collection();
export const chatCommandHandlerMap: Collection<string, ChatCommandData> = new Collection();

for (let commands of Object.values(slashCommandHandlers)) {
    if (!(commands instanceof Array)) commands = [commands];

    for (const command of commands) {
        slashCommandHandlerMap.set(command.structure.name, command);
    }
}
console.log('Slash commands have been loaded');

for (const command of Object.values(chatCommandHandlers)) {
    for (const commandName of command.names) {
        if (chatCommandHandlerMap.has(commandName)) {
            throw new Error(`Duplicate chat command name '${commandName}'`);
        }
        chatCommandHandlerMap.set(commandName, command);
    }
}
console.log('Chat commands have been loaded');
