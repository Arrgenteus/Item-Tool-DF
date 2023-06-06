import { ItemTag, ItemType } from '../../utils/itemTypeData';
import { getCharLevelAndItems } from './characterInventory';
import { QUERY_RESULT_LIMIT, QUERY_SHORT_RESULT_LIMIT } from './constants';
import { CharLevelAndItems, ItemTypeMongoFilter, SortFilterParams } from './types';

function getItemTypeFilter(itemType: ItemType): ItemTypeMongoFilter {
    if (itemType === 'weapon') return { category: 'weapon' };
    if (itemType === 'capeOrWings')
        return { category: 'accessory', item_type: { $in: ['cape', 'wings'] } };
    return {
        category: 'accessory',
        item_type: itemType,
    };
}

export async function getSortQueryPipeline(
    {
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
    }: SortFilterParams,
    returnShortResult: boolean = false
): Promise<Object[]> {
    const itemTypeFilter = getItemTypeFilter(itemType);
    const primaryFilter: { [filterName: string]: any } = {
        customSortValue: { $exists: true, $ne: 0 },
        ...itemTypeFilter,
        $and: [
            { variant_info: { $elemMatch: { tags: { $not: { $all: ['default', 'temp'] } } } } },
            { variant_info: { $elemMatch: { tags: { $not: { $all: ['rare', 'temp'] } } } } },
        ],
    };
    if (weaponElement && itemTypeFilter.category === 'weapon') {
        primaryFilter.elements = weaponElement;
    }
    const secondaryFilter: { [filterName: string]: any } = {};

    let charLevelAndItems: CharLevelAndItems | undefined;
    if (charID) {
        charLevelAndItems = await getCharLevelAndItems(charID);
        primaryFilter.original_title = { $in: charLevelAndItems.items };
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

    const tagsToExclude: (ItemTag | [])[] = ['ak', 'alexander', 'cosmetic'];
    for (const tag of excludeTags ?? []) {
        if (tag === 'none') tagsToExclude.push([]);
        else tagsToExclude.push(tag);
    }
    primaryFilter.$and.push({ variant_info: { $elemMatch: { tags: { $nin: tagsToExclude } } } });

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
        { $addFields: { customSortValue: sortExpression.mongo } },
        { $match: primaryFilter },
        // For items with the same name, only use the highest level item if the user provided a char ID
        ...(charLevelAndItems
            ? [
                  { $match: { level: { $lte: charLevelAndItems.level } } },
                  { $sort: { level: -1 } },
                  {
                      $group: {
                          _id: '$original_title',
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
        // Group documents by sort value, title, and variant info
        {
            $group: {
                _id: {
                    customSortValue: '$customSortValue',
                    title: '$full_title',
                    variant_info: '$variant_info',
                },
                levels: { $push: '$level' },
            },
        },
        // Limit total number of documents to top/bottom 200 after applying necessary filters
        { $sort: { '_id.customSortValue': sortOrder } },
        { $limit: 200 },
        { $sort: { '_id.title': 1 } },
        {
            $group: {
                _id: { customSortValue: '$_id.customSortValue' },
                items: {
                    $push: {
                        title: '$_id.title',
                        levels: '$levels',
                        variant_info: '$_id.variant_info',
                    },
                },
            },
        },
        { $addFields: { customSortValue: '$_id.customSortValue' } },
        { $sort: { customSortValue: sortOrder } },
        { $limit: returnShortResult ? QUERY_SHORT_RESULT_LIMIT : QUERY_RESULT_LIMIT },
    ];
}
