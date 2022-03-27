import { Message, MessageEmbedOptions, TextChannel } from 'discord.js';
import config from '../config';
import { ChatCommandData } from '../eventHandlerTypes';
import { getItemSearchResult } from '../interactionLogic/search/search';
import { SearchableItemCategory } from '../interactionLogic/search/types';
import { unaliasItemType } from '../interactionLogic/search/utils';
import { embed } from '../utils/misc';

const commandNames: (SearchableItemCategory | 'acc' | 'helmet')[] = [
    'acc',
    'accessory',
    'cape',
    'helm',
    'helmet',
    'belt',
    'necklace',
    'ring',
    'trinket',
    'bracer',
    'pet',
];

const command: ChatCommandData = {
    names: commandNames,
    run: async (
        message: Message,
        searchQuery: string,
        commandName: SearchableItemCategory | 'acc' | 'helmet'
    ): Promise<void> => {
        const searchableItemCategory: SearchableItemCategory = unaliasItemType(commandName);

        const channel: TextChannel = message.channel as TextChannel;

        if (!searchQuery) {
            await channel.send(
                embed(
                    `Usage: ${config.COMMAND_CHAR}${commandName} \`[name]\` _or_ ` +
                        `${config.COMMAND_CHAR}${commandName} \`[name]\` \`(operator)\` \`[level]\` - ` +
                        `Search for a ${commandName} with an optional level filter\n` +
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
        const operatorMatch: RegExpMatchArray | null = searchQuery.match(operatorRegexp);
        let maxLevel: number | undefined;
        let minLevel: number | undefined;
        if (operatorMatch) {
            const usedOperator: string = operatorMatch[0];
            const inputLevel: number = Number(
                searchQuery.slice(operatorMatch.index! + usedOperator.length).trim()
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
            searchQuery = searchQuery.slice(0, operatorMatch.index).trim();
        }

        if (!searchQuery) {
            await channel.send('The search query cannot be blank');
            return;
        }
        const { message: petSearchResult }: { message: MessageEmbedOptions } =
            await getItemSearchResult(searchQuery, searchableItemCategory, maxLevel, minLevel);

        await channel.send({ embeds: [petSearchResult] });
    },
};

export default command;
