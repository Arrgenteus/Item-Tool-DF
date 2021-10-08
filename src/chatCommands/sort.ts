import { Message, MessageOptions, TextChannel, Util } from 'discord.js';
import { ALL_ITEM_TYPES, ItemType } from '../utils/itemTypeData';
import config from '../config';
import { ValidationError } from '../errors';
import { ChatCommandData } from '../eventHandlerTypes';
import { parseSortExpression } from '../interactionLogic/sort/sortExpressionParser';
import { SortExpressionData } from '../interactionLogic/sort/types';
import { embed } from '../utils/misc';
import { getSortResultsMessage } from '../interactionLogic/sort/getSortedItemsResponse';

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
                        '(Yes, the commas between them matter)\n' +
                        `\`item type\` - Valid types are: _${Array.from(ALL_ITEM_TYPES).join(
                            ', '
                        )}_, and _item_. ` +
                        "Abbreviations such as 'acc' and 'wep' also work.\n" +
                        'If you are searching for a weapon, you may prefix the `item type` with an element ' +
                        'to only get results for weapons of that element (Eg. `!sort fire wep`)\n' +
                        '`sort expression` can either be a single value or multiple values joined together by ' +
                        '+ and/or - signs and/or brackets (). These "values" can be any stat bonus or resistance ' +
                        '_(eg. STR, Melee Def, Bonus, All, Ice, Health, etc.)_, or in the case of weapons, _Damage_. ' +
                        'Examples: _All + Health_, _-Health_, _INT - (DEX + STR)_, etc.\n' +
                        `\`${CC}sort\` sorts in descending order. Use \`${CC}sortasc\` to sort in ascending order instead.\n\n` +
                        `It is **recommended** to use the slash command **\`/sort\`** instead of ${CC}sort from now on, ` +
                        'since it is (arguably) easier to use and will also ' +
                        'be more usable when more sort filters are added in the future.'
                )
            );
            return;
        }

        if (maxLevelInput && maxLevelInput.match(/[^\d]/)) {
            throw new ValidationError(
                `The max level should be an integer between 0 and 90 inclusive.`
            );
        }
        let maxLevel: number | undefined = Number(maxLevelInput);
        if (isNaN(maxLevel)) maxLevel = undefined;
        if (
            maxLevel !== undefined &&
            (!Number.isInteger(maxLevel) || maxLevel < 0 || maxLevel > 90)
        ) {
            throw new ValidationError(
                `The max level should be an integer between 0 and 90 inclusive.`
            );
        }

        let sections: string[] = inputItemType.split(' ');
        [inputItemType] = sections.slice(-1);
        const unmodifiedItemTypeInput = inputItemType;
        if (inputItemType.slice(-1) === 's') inputItemType = inputItemType.slice(0, -1); // strip trailing s

        let weaponElement: string | undefined;
        if (['wep', 'weapon'].includes(inputItemType))
            weaponElement = sections.slice(0, -1).join(' ').trim() || undefined;
        if (weaponElement && weaponElement.length > 10)
            throw new ValidationError(
                'That element name is too long. It should be 10 characters or less'
            );

        let itemType: ItemType;
        let sortExpression: SortExpressionData;
        if (inputItemType === 'wep') itemType = 'weapon';
        // "accessorie" because the trailing s would have been removed
        else if (inputItemType === 'helmet') itemType = 'helm';
        else if (inputItemType in { wing: 1, cape: 1 }) itemType = 'capeOrWings';
        else if (
            ['accessory', 'accessorie', 'acc', 'item', 'all', 'all items'].includes(inputItemType)
        ) {
            sortExpression = parseSortExpression(inputSortExp);
            const results = await getSortResultsMessage('items', {
                ascending: commandName === 'sortasc',
                sortExpression,
                weaponElement,
                maxLevel,
            });
            await channel.send(results);
            return;
        } else if (!ALL_ITEM_TYPES.has(inputItemType as ItemType)) {
            throw new ValidationError(
                `"${Util.escapeMarkdown(
                    unmodifiedItemTypeInput
                )}" is not a valid item type. Valid types are: _${Array.from(ALL_ITEM_TYPES).join(
                    ', '
                )}_. ` + '"acc" and "wep" are valid abbreviations for accessories and weapons.'
            );
        } else {
            itemType = inputItemType as ItemType;
        }

        sortExpression = parseSortExpression(inputSortExp);

        const sortedItems: MessageOptions = await getSortResultsMessage(itemType, {
            ascending: commandName === 'sortasc',
            sortExpression,
            weaponElement,
            maxLevel,
        });

        await channel.send(sortedItems);
    },
};

export default command;
