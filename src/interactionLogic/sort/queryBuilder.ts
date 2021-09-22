import { ItemTag, ItemTypes, PRETTY_TO_BASE_TAG_NAME } from '../../utils/itemTypeData';
import { PRETTY_TO_BASE_ITEM_TYPE, QUERY_RESULT_LIMIT } from './constants';
import { parseSortExpression } from './sortExpressionParser';
import {
    ItemTypeMongoFilter,
    SortableItemType,
    SortExpressionData,
    SortFilterParams,
} from './types';

function getItemTypeFilter(itemType: SortableItemType): ItemTypeMongoFilter {
    if (itemType === ItemTypes.WEAPON) return { category: 'weapon' };
    if (itemType === ItemTypes.CAPE)
        return { category: 'accessory', type: { $in: [ItemTypes.CAPE, ItemTypes.WINGS] } };
    return {
        category: 'accessory',
        type: itemType,
    };
}

export function getFiltersFromEmbed(
    embedTitle: string,
    embedDesc: string | undefined,
    selectedTagsToExclude?: ItemTag[],
    itemType?: SortableItemType
): SortFilterParams {
    const sortExpressionMatch: RegExpMatchArray = embedTitle.match(
        /^Sort ([a-zA-Z/]+?) by (.+)$/i
    )!;
    if (!itemType) itemType = PRETTY_TO_BASE_ITEM_TYPE[sortExpressionMatch[1]];
    const sortExpressionInput: string = sortExpressionMatch[2];
    const sortExpression: SortExpressionData = parseSortExpression(sortExpressionInput);
    let excludeTags: Set<ItemTag> | undefined;
    if (selectedTagsToExclude) {
        excludeTags = new Set(selectedTagsToExclude as ItemTag[]);
    }

    if (!embedDesc) return { sortExpression, itemType, excludeTags };

    const [, weaponElement]: RegExpMatchArray | [] =
        embedDesc.match(/\*\*Weapon Element:\*\* ([a-z0-9?]+)/i) || [];
    const [, minLevel]: RegExpMatchArray | [] =
        embedDesc.match(/\*\*Min Level:\*\* ([0-9]+)/i) || [];
    const [, maxLevel]: RegExpMatchArray | [] =
        embedDesc.match(/\*\*Max Level:\*\* ([0-9]+)/i) || [];
    const ascending: boolean = !!embedDesc.match(/\*\*Order:\*\* Ascending/);

    return {
        sortExpression,
        itemType,
        excludeTags,
        weaponElement: weaponElement ? weaponElement.toLowerCase() : undefined,
        minLevel: minLevel !== undefined ? Number(minLevel) : undefined,
        maxLevel: maxLevel !== undefined ? Number(maxLevel) : undefined,
        ascending,
    };
}

export function getSortQueryPipeline({
    itemType,
    ascending,
    sortExpression,
    weaponElement,
    minLevel,
    maxLevel,
    excludeTags,
    nextPageValueLimit,
    prevPageValueLimit,
}: SortFilterParams): Object[] {
    const filter: { [filterName: string]: any } = {
        customSortValue: { $exists: true, $ne: 0 },
        ...getItemTypeFilter(itemType),
        $and: [
            { tagSet: { $elemMatch: { tags: { $not: { $all: ['default', 'temp'] } } } } },
            { tagSet: { $elemMatch: { tags: { $not: { $all: ['rare', 'temp'] } } } } },
        ],
        ...(weaponElement ? { elements: weaponElement } : {}),
    };

    if (weaponElement) {
        filter.elements = weaponElement;
    }
    if (minLevel !== undefined || maxLevel !== undefined) {
        filter.level = {
            ...(minLevel !== undefined ? { $gte: minLevel } : {}),
            ...(maxLevel !== undefined ? { $lte: maxLevel } : {}),
        };
    }
    if (nextPageValueLimit !== undefined) {
        if (ascending) filter.customSortValue.$gt = nextPageValueLimit;
        else filter.customSortValue.$lt = nextPageValueLimit;
    } else if (prevPageValueLimit !== undefined) {
        if (ascending) filter.customSortValue.$lt = prevPageValueLimit;
        else filter.customSortValue.$gt = prevPageValueLimit;
    }

    // Exclude items whose all possible tags contain any item from tagsToExclude
    // Eg. excluding 'dc' will not filter out mogloween masks, but filtering out 'cosmetic' will
    const tagsToExclude: (ItemTag | [])[] = ['ak', 'alexander'];
    for (const tag of excludeTags ?? []) {
        if (tag === 'none') tagsToExclude.push([]);
        else tagsToExclude.push(tag);
    }
    filter.$and.push({ tagSet: { $elemMatch: { tags: { $nin: tagsToExclude } } } });

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
        { $match: filter },
        // { $sort: { customSortValue: sortOrder, level: -1 } },
        // Group documents that belong to the same family
        // {
        //     $group: {
        //         _id: { family: '$family' },
        //         doc: { $first: '$$CURRENT' },
        //     }
        // },
        // { $sort: { 'doc.customSortValue': sortOrder, 'doc.level': -1 } },
        // { $replaceRoot: { newRoot: '$doc' } },
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
