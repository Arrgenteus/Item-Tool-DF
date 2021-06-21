import { AggregationCursor, Collection as MongoCollection, Db } from 'mongodb';
import config from '../../config';
import { dbConnection } from '../../dbConnection';
import { capitalize, embed } from '../../utils/misc';
import SplitEmbed from '../../utils/splitEmbed';
import { getSortQueryPipeline } from './queryBuilder';
import { SHORT_RESULT_LIMIT, SortableItemType, SortFilterParams, SortSubCommand } from './types';
import { unaliasBonusName } from './sortExpressionParser';
import {
    MessageActionRowComponentResolvable,
    MessageComponentOptions,
    MessageEmbedOptions,
} from 'discord.js';
import {
    MessageComponentTypes,
    MessageButtonStyles,
    MAX_EMBED_DESC_LENGTH,
    MAX_SPLIT_EMBED_DESC_LENGTH,
    MAX_EMBED_FOOTER_LENGTH,
} from '../../commonTypes/commandStructures';
import { compressSortFilters } from './sortFilterCompression';
import { ItemTypes } from '../../commonTypes/items';

const ITEM_LIST_DELIMITER = ', `';
const itemCollection: Promise<MongoCollection> = dbConnection.then((db: Db) =>
    db.collection(config.DB_COLLECTION)
);

function prettifyType(itemType: SortableItemType): string {
    if (itemType === ItemTypes.CAPE) return 'Capes/Wings';
    return capitalize(itemType) + 's';
}

export function getFiltersUsedText({
    ascending,
    itemType,
    weaponElement,
    minLevel,
    maxLevel,
    sortExpression,
}: Partial<SortFilterParams>): string {
    const filterText: string[] = [];
    if (itemType) filterText.push(`Item type: ${prettifyType(itemType)}`);
    if (weaponElement) filterText.push(`Element: ${capitalize(weaponElement)}`);
    if (minLevel !== undefined && minLevel !== 0) filterText.push(`Min level: ${minLevel}`);
    if (maxLevel !== undefined && maxLevel !== 90) filterText.push(`Max level: ${maxLevel}`);

    let result: string = filterText.length ? `Filters used:\n${filterText.join(', ')}` : '';
    if (sortExpression) result += `\nSort exp: ${sortExpression.pretty}`;
    if (ascending) result = 'Results are in ascending order\n\n' + result;
    return result;
}

function getButtonsForMoreResults(sortFilterParams: SortFilterParams): MessageComponentOptions[] {
    const compressedFilters: string | undefined = compressSortFilters(sortFilterParams);
    if (!compressedFilters) return [];

    return [
        {
            type: MessageComponentTypes.ACTION_ROW,
            components: [
                {
                    type: MessageComponentTypes.BUTTON,
                    label: 'More Results',
                    customID: compressedFilters,
                    style: MessageButtonStyles.PRIMARY,
                },
            ],
        },
    ];
}

export function multiItemDisplayMessage(
    itemTypes: SortableItemType[],
    sortFilterParams: Omit<SortFilterParams, 'itemType'>
): { components: MessageComponentOptions[] | undefined; embeds: MessageEmbedOptions[] } {
    return {
        embeds: embed(
            'Click on one of the buttons below',
            `Sort items by ${sortFilterParams.sortExpression.pretty}`,
            getFiltersUsedText({
                ascending: sortFilterParams.ascending,
                maxLevel: sortFilterParams.maxLevel,
                minLevel: sortFilterParams.minLevel,
            })
        ).embeds,
        components: [itemTypes.slice(0, 5), itemTypes.slice(5)].map(
            (itemTypeSubset: SortableItemType[]) => ({
                type: MessageComponentTypes.ACTION_ROW,
                components: itemTypeSubset.map(
                    (itemType: SortableItemType): MessageActionRowComponentResolvable => ({
                        type: MessageComponentTypes.BUTTON,
                        label: capitalize(itemType),
                        customID: compressSortFilters(
                            Object.assign(sortFilterParams, { itemType }),
                            true
                        ),
                        style: MessageButtonStyles.PRIMARY,
                    })
                ),
            })
        ),
    };
}

export default async function getSortedItemList(
    embedCount: number,
    sortFilterParams: SortFilterParams
): Promise<{ components: MessageComponentOptions[] | undefined; embeds: MessageEmbedOptions[] }> {
    if (!Number.isInteger(embedCount) || embedCount < 1 || embedCount > 10)
        throw new RangeError('embedCount must be an integer between 1 and 10');

    if (sortFilterParams.weaponElement)
        sortFilterParams.weaponElement = unaliasBonusName(sortFilterParams.weaponElement);

    const pipeline = getSortQueryPipeline(embedCount > 1, sortFilterParams);
    const sortResults: AggregationCursor = (await itemCollection).aggregate(pipeline);

    let itemGroup: {
        customSortValue: number;
        items: { title: string; levels: string[]; tagSet: { tags: string[] }[] }[];
    } | null;
    let sortedList: string = '';
    let lastResult: string = '';
    let groupCount: number = 0;

    while ((itemGroup = await sortResults.next()) !== null) {
        groupCount += 1;
        let items: {
            title: string;
            levels: string[];
            tagSet: { tags: string[] }[];
        }[] = itemGroup.items;

        const itemDisplayList: string[] = items.map((item) => {
            let tags: string = item.tagSet
                .map(({ tags }) => (tags.length ? tags.map(capitalize).join('+') : 'None'))
                .join(' / ');
            tags = tags === 'None' ? '' : `[${tags}]`;
            return `\`${item.title}\` (lv. ${item.levels.join(', ')}) ${tags}`.trim();
        });

        const sign: string = itemGroup.customSortValue < 0 ? '' : '+';
        lastResult = [
            `**${sign}${itemGroup.customSortValue}**`,
            `${itemDisplayList.join(', ')}\n\n`,
        ].join(embedCount === 1 ? ' ' : '\n');

        if (
            lastResult.length + sortedList.length > MAX_SPLIT_EMBED_DESC_LENGTH * embedCount ||
            (embedCount <= 2 && groupCount > SHORT_RESULT_LIMIT - 1)
        ) {
            break;
        }

        sortedList += lastResult;
    }
    if (!sortedList && embedCount === 1 && lastResult) {
        const ellipses = ' **...**';
        const lastItemIndexBeforeLimit: number = lastResult
            .slice(0, MAX_EMBED_DESC_LENGTH - ellipses.length)
            .lastIndexOf(ITEM_LIST_DELIMITER);
        if (lastItemIndexBeforeLimit !== -1)
            sortedList = lastResult.slice(0, lastItemIndexBeforeLimit) + ellipses;
    }

    const messageButtons: MessageComponentOptions[] | undefined =
        embedCount <= 5 && sortedList.length && itemGroup !== null
            ? getButtonsForMoreResults(sortFilterParams)
            : undefined;

    sortedList = sortedList || 'No results were found';

    const splitEmbed = new SplitEmbed(ITEM_LIST_DELIMITER, embedCount);
    splitEmbed.addText(sortedList);

    const prettifiedType: string = sortFilterParams.weaponElement
        ? `${capitalize(sortFilterParams.weaponElement)} ${prettifyType(sortFilterParams.itemType)}`
        : prettifyType(sortFilterParams.itemType);
    const title: string = `Sort ${prettifiedType} by ${sortFilterParams.sortExpression.pretty}`;
    splitEmbed.setTitle(title);

    let footer =
        sortedList.length <= MAX_EMBED_FOOTER_LENGTH
            ? getFiltersUsedText({
                  ascending: sortFilterParams.ascending,
                  minLevel: sortFilterParams.minLevel,
                  maxLevel: sortFilterParams.maxLevel,
              })
            : getFiltersUsedText(sortFilterParams);
    splitEmbed.setFooter(footer);

    return { embeds: splitEmbed.embeds, components: messageButtons };
}
