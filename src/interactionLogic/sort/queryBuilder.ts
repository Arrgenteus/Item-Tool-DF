import { ItemTag, ItemType } from '../../utils/itemTypeData';
import { getCharLevelAndItems } from './characterInventory';
import { PRETTY_TO_BASE_ITEM_TYPE, QUERY_RESULT_LIMIT } from './constants';
import { parseSortExpression } from './sortExpressionParser';
import {
    CharLevelAndItems,
    ItemTypeMongoFilter,
    SortExpressionData,
    SortFilterParams,
} from './types';

function getItemTypeFilter(itemType: ItemType): ItemTypeMongoFilter {
    if (itemType === 'weapon') return { category: 'weapon' };
    if (itemType === 'capeOrWings')
        return { category: 'accessory', type: { $in: ['cape', 'wings'] } };
    return {
        category: 'accessory',
        type: itemType,
    };
}

export async function getSortQueryPipeline({
    itemType,
    ascending,
    sortExpression,
    weaponElement,
    minLevel,
    maxLevel,
    charID,
    excludeTags,
    nextPageValueLimit,
    prevPageValueLimit,
}: SortFilterParams): Promise<Object[]> {
    const primaryFilter: { [filterName: string]: any } = {
        customSortValue: { $exists: true, $ne: 0 },
        ...getItemTypeFilter(itemType),
        $and: [
            { tagSet: { $elemMatch: { tags: { $not: { $all: ['default', 'temp'] } } } } },
            { tagSet: { $elemMatch: { tags: { $not: { $all: ['rare', 'temp'] } } } } },
        ],
        ...(weaponElement ? { elements: weaponElement } : {}),
    };

    const secondaryFilter: { [filterName: string]: any } = {};

    let charLevelAndItems: CharLevelAndItems | undefined;
    if (charID) {
        charLevelAndItems = await getCharLevelAndItems(charID);
        primaryFilter.originalTitle = { $in: charLevelAndItems.items };
        secondaryFilter.level = { $lte: charLevelAndItems.level };
    }

    if (weaponElement) {
        primaryFilter.elements = weaponElement;
    }
    if (minLevel !== undefined) {
        secondaryFilter.level = { ...secondaryFilter.level, $gte: minLevel };
    }
    // Override max level based on character ID, if the max level parameter is provided
    if (maxLevel !== undefined) {
        secondaryFilter.level = { ...secondaryFilter.level, $lte: maxLevel };
    }

    const tagsToExclude: (ItemTag | [])[] = ['ak', 'alexander'];
    for (const tag of excludeTags ?? []) {
        if (tag === 'none') tagsToExclude.push([]);
        else tagsToExclude.push(tag);
    }
    primaryFilter.$and.push({ tagSet: { $elemMatch: { tags: { $nin: tagsToExclude } } } });

    if (nextPageValueLimit !== undefined) {
        secondaryFilter.customSortValue = {};
        if (ascending) secondaryFilter.customSortValue.$gt = nextPageValueLimit;
        else secondaryFilter.customSortValue.$lt = nextPageValueLimit;
    } else if (prevPageValueLimit !== undefined) {
        secondaryFilter.customSortValue = {};
        if (ascending) secondaryFilter.customSortValue.$lt = prevPageValueLimit;
        else secondaryFilter.customSortValue.$gt = prevPageValueLimit;
    }

    const sortOrder: 1 | -1 =
        (ascending && !prevPageValueLimit) || (!ascending && prevPageValueLimit) ? 1 : -1;

    return [
        {
            $addFields: {
                damage: { $avg: '$damage' },
                bonuses: { $arrayToObject: '$bonuses' },
                resists: { $arrayToObject: '$resists' },
            },
        },
        { $addFields: { customSortValue: sortExpression.mongo } },
        { $match: primaryFilter },
        // For items with the same name, only use the highest level item if the user provided a char ID
        ...(charLevelAndItems
            ? [
                  { $match: { level: { $lte: charLevelAndItems.level } } },
                  { $sort: { level: -1 } },
                  {
                      $group: {
                          _id: '$originalTitle',
                          doc: { $first: '$$CURRENT' },
                      },
                  },
                  { $replaceRoot: { newRoot: '$doc' } },
              ]
            : []),
        // Filter by level and page limit values after (possibly) performing the above grouping
        // If for example, the provided char is level 90 and has NSoD, filtering by level and page limit
        // before the above grouping would not filter out lower level versions of NSoD, when it should do so
        { $match: secondaryFilter },
        // Group documents
        {
            $group: {
                _id: {
                    customSortValue: '$customSortValue',
                    title: '$title',
                    tagSet: '$tagSet',
                },
                levels: { $push: '$level' },
            },
        },
        { $sort: { '_id.title': 1 } },
        {
            $group: {
                _id: { customSortValue: '$_id.customSortValue' },
                items: {
                    $push: {
                        title: '$_id.title',
                        levels: '$levels',
                        tagSet: '$_id.tagSet',
                    },
                },
            },
        },
        { $addFields: { customSortValue: '$_id.customSortValue' } },
        { $sort: { customSortValue: sortOrder } },
        { $limit: QUERY_RESULT_LIMIT },
    ];
}
