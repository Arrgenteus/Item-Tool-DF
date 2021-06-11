import { AggregationCursor, Collection as MongoCollection, Db } from 'mongodb';
import { config } from '../../config';
import { dbConnection } from '../../dbConnection';
import { SimpleEmbed } from '../../commonTypes/message';
import { capitalize } from '../../utils/misc';
import SplitEmbed from '../../utils/splitEmbed';
import { getSortQueryPipeline } from './queryBuilder';
import { SortableItemType, SortFilterParams, SortSubCommand } from './types';

const ITEM_LIST_DELIMITER = ', `';

function prettifyType(itemType: SortableItemType): string {
    if (itemType === SortSubCommand.CAPE) return 'Capes/Wings';
    return capitalize(itemType) + 's';
}

function getFiltersUsedText(
    { weaponElement, minLevel, maxLevel, sortExpression }: Partial<SortFilterParams>,
    itemType?: SortableItemType
): string {
    const filterText: string[] = [];
    if (itemType) filterText.push(`Item type: ${prettifyType(itemType)}`);
    if (weaponElement) filterText.push(`Element: ${capitalize(weaponElement)}`);
    if (minLevel) filterText.push(`Min level: ${minLevel}`);
    if (maxLevel && maxLevel !== 90) filterText.push(`Max level: ${maxLevel}`);

    let result = filterText.length ? `Filters used:\n${filterText.join(', ')}` : '';
    if (sortExpression) result += `\nSort exp: ${sortExpression.pretty}`;

    return result;
}

async function sortResultsToEmbed(
    sortResults: AggregationCursor,
    embedCount: number,
    isShortResult: boolean,
    itemType: SortableItemType,
    sortFilterParams: SortFilterParams
): Promise<SimpleEmbed[]> {
    if (!Number.isInteger(embedCount) || embedCount < 1 || embedCount > 10)
        throw new RangeError('embedCount must be an integer between 1 and 10');

    let itemGroup: {
        customSortValue: number;
        items: { title: string; levels: string[]; tagSet: { tags: string[] }[] }[];
    } | null;
    let sortedList: string = '';
    let lastResult: string = '';
    while ((itemGroup = await sortResults.next()) !== null) {
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
        lastResult = `**${sign}${itemGroup.customSortValue}** ${itemDisplayList.join(', ')}\n\n`;
        if (lastResult.length + sortedList.length > 2048 * embedCount) break;

        sortedList += lastResult;
    }
    if (!sortedList && isShortResult && lastResult) {
        const ellipses = ' **...**';
        const lastItemIndexBeforeLimit: number = lastResult
            .slice(0, 2048 - ellipses.length)
            .lastIndexOf(ITEM_LIST_DELIMITER);
        if (lastItemIndexBeforeLimit !== -1)
            sortedList = lastResult.slice(0, lastItemIndexBeforeLimit) + ellipses;
    }
    sortedList = sortedList || 'No results were found';

    const splitEmbed = new SplitEmbed(ITEM_LIST_DELIMITER, embedCount);
    splitEmbed.addText(sortedList);

    const prettifiedType: string = sortFilterParams.weaponElement
        ? `${capitalize(sortFilterParams.weaponElement)} ${prettifyType(itemType)}`
        : prettifyType(itemType);
    const title: string = `Sort ${prettifiedType} by ${sortFilterParams.sortExpression.pretty}`;
    splitEmbed.setTitle(title);

    let footer =
        isShortResult || sortedList.length <= 2048
            ? getFiltersUsedText({
                  minLevel: sortFilterParams.minLevel,
                  maxLevel: sortFilterParams.maxLevel,
              })
            : getFiltersUsedText(sortFilterParams, itemType);
    if (isShortResult && itemGroup !== null)
        footer += `\n\nUse "/sort ${itemType}" for more results`;
    splitEmbed.setFooter(footer);

    return splitEmbed.embeds;
}

export default async function getSortedItemList(
    subCommand: SortSubCommand,
    sortFilterParams: SortFilterParams
): Promise<SimpleEmbed[]> {
    const itemCollection: MongoCollection = await dbConnection.then((db: Db) =>
        db.collection(config.DB_COLLECTION)
    );

    const itemTypesToFetch: SortableItemType[] =
        subCommand === SortSubCommand.ALL
            ? [
                  SortSubCommand.BRACER,
                  SortSubCommand.TRINKET,
                  SortSubCommand.BELT,
                  SortSubCommand.RING,
                  SortSubCommand.NECKLACE,
                  SortSubCommand.CAPE,
                  SortSubCommand.HELM,
                  SortSubCommand.WEAPON,
              ]
            : [subCommand];

    const results: SimpleEmbed[][] = await Promise.all(
        itemTypesToFetch.map(async (itemTypeToFetch: SortableItemType) => {
            const pipeline = getSortQueryPipeline(
                itemTypeToFetch,
                sortFilterParams,
                subCommand !== SortSubCommand.ALL
            );
            const sortResults: AggregationCursor = itemCollection.aggregate(pipeline);

            if (subCommand !== SortSubCommand.ALL)
                return await sortResultsToEmbed(
                    sortResults,
                    10,
                    false,
                    itemTypeToFetch,
                    sortFilterParams
                );
            // Allow capes and helms to have two embeds; the rest can only use 1
            return await sortResultsToEmbed(
                sortResults,
                itemTypeToFetch === SortSubCommand.CAPE || itemTypeToFetch === SortSubCommand.HELM
                    ? 2
                    : 1,
                true,
                itemTypeToFetch,
                sortFilterParams
            );
        })
    );

    return results.flat();
}
