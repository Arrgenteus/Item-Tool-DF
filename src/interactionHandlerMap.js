import { Collection } from 'discord.js';
import * as autocompleteHandlers from './autocompleteHandlers/index';
import * as buttonInteractionHandlers from './buttonInteractionHandlers/index';
import * as modalSubmitHandlers from './modalSubmitHandlers/index';
import * as selectMenuInteractionHandlers from './buttonInteractionHandlers/index';
import * as slashCommandHandlers from './slashCommands/index';
import * as chatCommandHandlers from './chatCommands/index';
function loadInteractionNameToHandlerMapping(interactionHandlerObjects) {
    const handlerMap = new Collection();
    for (const handlerObject of Object.values(interactionHandlerObjects)) {
        for (const handlerName of handlerObject.names) {
            if (handlerMap.has(handlerName)) {
                throw new Error(`Duplicate interaction handler name '${handlerName}' for ${handlerObject.constructor}`);
            }
            handlerMap.set(handlerName, handlerObject);
        }
    }
    return handlerMap;
}
export const autocompleteHandlerMap = loadInteractionNameToHandlerMapping(autocompleteHandlers);
console.log('Autocomplete interaction handlers have been loaded');
export const buttonInteractionHandlerMap = loadInteractionNameToHandlerMapping(buttonInteractionHandlers);
console.log('Button interaction handlers have been loaded');
export const modalSubmitHandlerMap = loadInteractionNameToHandlerMapping(modalSubmitHandlers);
console.log('Modal interaction handlers have been loaded');
export const selectMenuInteractionHandlerMap = loadInteractionNameToHandlerMapping(selectMenuInteractionHandlers);
console.log('Select menu interaction handlers have been loaded');
export const slashCommandHandlerMap = new Collection();
export const chatCommandHandlerMap = new Collection();
for (let commands of Object.values(slashCommandHandlers)) {
    if (!(commands instanceof Array))
        commands = [commands];
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
