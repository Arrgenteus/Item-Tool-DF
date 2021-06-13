import { Message, TextChannel } from 'discord.js';
import { ChatCommandData } from '../commonTypes/commandStructures';
import { ItemTypes } from '../commonTypes/items';
import config from '../config';
import { ValidationError } from '../errors';
import getSortedItemList, {
    multiItemDisplayMessage,
} from '../interactionLogic/sort/getSortedItems';
import { parseSortExpression } from '../interactionLogic/sort/sortExpressionParser';
import {
    SortableItemType,
    SortExpressionData,
    SortFilterParams,
} from '../interactionLogic/sort/types';
import { embed } from '../utils/misc';

const CC: string = config.COMMAND_CHAR;

const command: ChatCommandData = {
    names: ['sort', 'sortasc'],
    run: async (message: Message, args: string, commandName: string): Promise<void> => {
        const channel: TextChannel = message.channel as TextChannel;

        let [inputItemType, inputSortExp, maxLevelInput]: string[] =
            args.split(',').map((arg) => arg.trim().toLowerCase()) || [];
        if (!inputItemType || !inputSortExp) {
            await channel.send(
                embed(
                    `Usage: ${CC}${commandName} \`item type\`, \`sort expression\`, \`max level (optional)\`\n` +
                        `\`item type\` - Valid types are: _${Object.keys(ItemTypes).join(
                            ', '
                        )}_. ` +
                        "Abbreviations such as 'acc' and 'wep' also work.\n" +
                        'If you are searching for a weapon, you may prefix the `item type` with an element ' +
                        'to only get results for weapons of that element\n' +
                        '`sort expression` can either be a single value or multiple values joined together by ' +
                        '+ and/or - signs and/or brackets (). These "values" can be any stat bonus or resistance ' +
                        '_(eg. STR, Melee Def, Bonus, All, Ice, Health, etc.)_, or in the case of weapons, _Damage_. ' +
                        'Examples: _All + Health_, _-Health_, _INT - (DEX + STR)_, etc.\n' +
                        `\`${CC}sort\` sorts in descending order. Use \`${CC}sortasc\` to sort in ascending order instead.`
                )
            );
            return;
        }

        if (maxLevelInput && maxLevelInput.match(/[^\-0-9]/)) {
            throw new ValidationError(
                `The max level should be an integer between 0 and 90 inclusive.`
            );
        }
        const maxLevel: number | undefined = Number(maxLevelInput) || undefined;
        if (maxLevel && (!Number.isInteger(maxLevel) || maxLevel < 0 || maxLevel > 90)) {
            throw new ValidationError(
                `The max level should be an integer between 0 and 90 inclusive. ${maxLevel} is not valid.`
            );
        }

        let sections: string[] = inputItemType.split(' ');
        [inputItemType] = sections.slice(-1);
        const unmodifiedItemTypeInput = inputItemType;
        if (inputItemType.slice(-1) === 's') inputItemType = inputItemType.slice(0, -1); // strip trailing s
        const weaponElement: string = sections.slice(0, -1).join(' ').trim();
        if (weaponElement.length > 10)
            throw new ValidationError(
                'That element name is too long. It should be 10 characters or less'
            );

        let itemType: SortableItemType;
        if (inputItemType === 'wep' || inputItemType === 'weapon') itemType = 'weapon';
        // "accessorie" because the trailing s would have been removed
        else if (inputItemType === 'helmet') itemType = 'helm';
        else if (inputItemType === 'wing') itemType = 'cape';
        else if (inputItemType === 'accessorie' || inputItemType === 'acc') {
            const sortExpression: SortExpressionData = parseSortExpression(inputSortExp);
            await channel.send(
                multiItemDisplayMessage(
                    ['helm', 'cape', 'belt', 'necklace', 'ring', 'trinket', 'bracer'],
                    {
                        ascending: commandName === 'sortasc',
                        sortExpression,
                        weaponElement,
                        maxLevel,
                    }
                )
            );
            return;
        } else itemType = inputItemType as SortableItemType;

        if (!(itemType in ItemTypes)) {
            throw new ValidationError(
                `"${unmodifiedItemTypeInput}" is not a valid item type. Valid types are: _${Object.keys(
                    ItemTypes
                ).join(', ')}_. ` +
                    '"acc" and "wep" are valid abbreviations for accessories and weapons.'
            );
        }

        const sortExpression: SortExpressionData = parseSortExpression(inputSortExp);

        const sortFilters: SortFilterParams = {
            ascending: commandName === 'sortasc',
            itemType,
            sortExpression,
            weaponElement,
            maxLevel,
        };
        const sortedItems = await getSortedItemList(1, sortFilters);

        await channel.send({ embeds: sortedItems.embeds, components: sortedItems.components });
    },
};

export default command;
