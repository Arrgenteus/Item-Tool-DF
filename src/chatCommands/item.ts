import { Message, MessageOptions, TextChannel } from 'discord.js';
import config from '../config';
import { ChatCommandData } from '../eventHandlerTypes';
import { getItemSearchResult } from '../interactionLogic/search/search';
import {
    SearchableItemCategory,
    SearchableItemCategoryAlias,
} from '../interactionLogic/search/types';
import { unaliasItemType } from '../interactionLogic/search/utils';
import { embed } from '../utils/misc';

const commandNames: (SearchableItemCategory | SearchableItemCategoryAlias)[] = [
    'item',
    'wep',
    'weap',
    'weapon',
    'sword',
    'axe',
    'mace',
    'staff',
    'wand',
    'dagger',
    'scythe',
    'acc',
    'accessory',
    'cape',
    'cloak',
    'wings',
    'wing',
    'helm',
    'helmet',
    'belt',
    'necklace',
    'neck',
    'ring',
    'trinket',
    'bracer',
    'pet',
];

const command: ChatCommandData = {
    names: commandNames,
    run: async (
        message: Message,
        itemNameToSearchFor: string,
        commandName: SearchableItemCategory | SearchableItemCategoryAlias
    ): Promise<void> => {
        const itemSearchCategory: SearchableItemCategory = unaliasItemType(commandName);

        const channel: TextChannel = message.channel as TextChannel;

        if (!itemNameToSearchFor) {
            await channel.send(
                embed(
                    `Usage: ${config.COMMAND_CHAR}${commandName} \`[name]\` _or_ ` +
                        `${config.COMMAND_CHAR}${commandName} \`[name]\` \`(operator)\` \`[level]\` - ` +
                        `Search for a ${itemSearchCategory} with an optional level filter\n` +
                        '`(operator)` can be one of the following: ' +
                        '`=`, `<`, `>`, `<=`, `>=`'
                )
            );
            return;
        }

        const operatorList: string[] = [
            '=',
            '==',
            '===',
            '<',
            '>',
            '<=',
            '/',
            '=<',
            '>=',
            '=>',
        ].sort((a: string, b: string) => b.length - a.length);

        const operatorRegexp: RegExp = new RegExp(
            operatorList.map((op: string) => `(?:${op})`).join('|')
        );
        const operatorMatch: RegExpMatchArray | null = itemNameToSearchFor.match(operatorRegexp);
        let maxLevel: number | undefined;
        let minLevel: number | undefined;
        if (operatorMatch) {
            const usedOperator: string = operatorMatch[0];
            const inputLevel: number = Number(
                itemNameToSearchFor.slice(operatorMatch.index! + usedOperator.length).trim()
            );
            if (!Number.isInteger(inputLevel)) {
                await channel.send(
                    'Either the number you entered is not a valid integer, or the operator you used is invalid.'
                );
                return;
            }
            if (['=', '==', '===', '<', '<=', '=<', '/'].includes(usedOperator)) {
                maxLevel = inputLevel;
                if (usedOperator === '<') maxLevel -= 1;
            }
            if (['=', '==', '===', '>', '>=', '=>'].includes(usedOperator)) {
                minLevel = inputLevel;
                if (usedOperator === '>') minLevel += 1;
            }
            itemNameToSearchFor = itemNameToSearchFor.slice(0, operatorMatch.index).trim();
        }

        if (!itemNameToSearchFor) {
            await channel.send('The search query cannot be blank');
            return;
        }

        const itemSearchResult: MessageOptions | undefined = await getItemSearchResult({
            term: itemNameToSearchFor,
            itemSearchCategory,
            maxLevel,
            minLevel,
            userIdForSimilarResults: message.author.id,
        });

        if (itemSearchResult) {
            await channel.send(itemSearchResult);
        } else {
            await channel.send({
                embeds: [{ description: `No ${itemSearchCategory} was found.` }],
            });
        }
    },
};

export default command;
