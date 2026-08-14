import { AggregationCursor, Collection as MongoCollection, Db } from 'mongodb';
import config from '../../config.js';
import { dbConnection } from '../../dbConnection.js';
import { capitalize } from '../../utils/misc.js';
import { getSortQueryPipeline } from './queryBuilder.js';
import { SortExpressionData, SortFilterParams, SortItemTypeOption } from './types.js';
import { parseSortExpression, unaliasBonusName } from './sortExpressionParser.js';
import {
    APIActionRowComponent,
    APIComponentInMessageActionRow,
    APISelectMenuOption,
    BaseMessageOptions,
    ButtonStyle,
    ComponentType,
} from 'discord.js';
import { INTERACTION_ID_ARG_SEPARATOR, MAX_EMBED_DESC_LENGTH } from '../../utils/constants.js';
import {
    ItemTag,
    ItemType,
    PRETTY_ITEM_TYPES,
    PRETTY_TAG_NAMES,
    PRETTY_TO_BASE_ITEM_TYPE,
} from '../../utils/itemTypeData.js';
import {
    QUERY_RESULT_LIMIT,
    QUERY_SHORT_RESULT_LIMIT,
    SORTABLE_TAGS,
    SORT_ACTIONS,
} from './constants.js';
import { ValidationError } from '../../errors.js';

const ITEM_LIST_DELIMITER = ', `';
type MessageActionRow = APIActionRowComponent<APIComponentInMessageActionRow>;
const itemCollection: MongoCollection = dbConnection.collection(config.DB_COLLECTION);

const allValidWeaponElements: Set<string> = new Set(
    (
        (await itemCollection
            .aggregate([
                { $unwind: { path: '$elements' } },
                { $group: { _id: null, elements: { $addToSet: '$elements' } } },
            ])
            .next()) ?? {}
    ).elements ?? []
);

function getFiltersUsedText({
    ascending,
    weaponElement,
    charID,
    minLevel,
    maxLevel,
}: Partial<SortFilterParams>): string {
    const filterText: string[] = [];
    if (weaponElement) filterText.push(`**Weapon Element:** ${capitalize(weaponElement)}`);

    const levelFilterText: string[] = [];
    if (ascending) filterText.push('**Order:** Ascending');
    if (charID) {
        levelFilterText.push(
            `**Char ID:** [${charID}](https://account.dragonfable.com/CharPage?id=${charID})`
        );
    }
    if (minLevel !== undefined && minLevel !== 0) {
        levelFilterText.push(`**Min level:** ${minLevel}`);
    }
    if (maxLevel !== undefined && maxLevel !== 90) {
        levelFilterText.push(`**Max level:** ${maxLevel}`);
    }
    if (levelFilterText.length) filterText.push(levelFilterText.join(', '));

    return filterText.join('\n');
}

function getTagFilterDropDownComponent(excludeTags?: Set<ItemTag>): [MessageActionRow] {
    return [
        {
            type: ComponentType.ActionRow,
            components: [
                {
                    custom_id: SORT_ACTIONS.TAG_SELECTION,
                    placeholder: 'All tags included in results. Click to change',
                    min_values: 0,
                    max_values: SORTABLE_TAGS.length - 1,
                    type: ComponentType.StringSelect,
                    options: SORTABLE_TAGS.map(
                        (tag: ItemTag): APISelectMenuOption => ({
                            label: 'Exclude ' + PRETTY_TAG_NAMES[tag],
                            value: tag,
                            default: excludeTags?.has(tag) ?? false,
                        })
                    ),
                },
            ],
        },
    ];
}

function getFullResultsButtonComponent(
    itemType: ItemType,
    excludeTags?: Set<ItemTag>
): [MessageActionRow] {
    const excludeTagsList: string = (excludeTags ? [...excludeTags] : []).join(',');
    return [
        {
            type: ComponentType.ActionRow,
            components: [
                {
                    type: ComponentType.Button,
                    label: 'View full results',
                    custom_id: [SORT_ACTIONS.SHOW_RESULTS, itemType, excludeTagsList].join(
                        INTERACTION_ID_ARG_SEPARATOR
                    ),
                    style: ButtonStyle.Primary,
                },
            ],
        },
    ];
}

function getPrevAndNextSortPageNavigationComponents(
    excludeTags?: Set<ItemTag>,
    prevPageValueLimit?: number | undefined,
    nextPageValueLimit?: number | undefined
): [MessageActionRow] | [] {
    const excludeTagsList: string = (excludeTags ? [...excludeTags] : []).join(',');

    const buttonComponents: APIComponentInMessageActionRow[] = [];
    if (prevPageValueLimit !== undefined) {
        buttonComponents.push({
            type: ComponentType.Button,
            label: '\u276e Prev Page',
            custom_id: [SORT_ACTIONS.PREV_PAGE, prevPageValueLimit, excludeTagsList].join(
                INTERACTION_ID_ARG_SEPARATOR
            ),
            style: ButtonStyle.Primary,
        });
    }
    if (nextPageValueLimit !== undefined) {
        buttonComponents.push({
            type: ComponentType.Button,
            label: 'Next Page \u276f',
            custom_id: [SORT_ACTIONS.NEXT_PAGE, nextPageValueLimit, excludeTagsList].join(
                INTERACTION_ID_ARG_SEPARATOR
            ),
            style: ButtonStyle.Primary,
        });
    }

    if (!buttonComponents.length) return [];

    return [{ type: ComponentType.ActionRow, components: buttonComponents }];
}

function itemButtonList(excludeTags?: Set<ItemTag>): MessageActionRow[] {
    const excludeTagsList: string = (excludeTags ? [...excludeTags] : []).join(',');

    // Display item types after the 5th in a separate action row, since a single action row can only contain 5 buttons
    const itemTypeList: ItemType[][] = [
        ['belt', 'bracer', 'capeOrWings', 'helm', 'necklace'],
        ['ring', 'trinket', 'weapon'],
    ];
    return itemTypeList.map(
        (itemTypeSubset: ItemType[]): MessageActionRow => ({
            type: ComponentType.ActionRow,
            components: itemTypeSubset.map(
                (itemType: ItemType): APIComponentInMessageActionRow => ({
                    type: ComponentType.Button,
                    label: PRETTY_ITEM_TYPES[itemType],
                    custom_id: [SORT_ACTIONS.SHOW_RESULTS, itemType, excludeTagsList].join(
                        INTERACTION_ID_ARG_SEPARATOR
                    ),
                    style: ButtonStyle.Primary,
                })
            ),
        })
    );
}

function getAllItemDisplayMessage(
    sortFilterParams: Omit<SortFilterParams, 'itemType'>
): Pick<BaseMessageOptions, 'embeds' | 'components'> {
    return {
        embeds: [
            {
                title: `Sort items by ${sortFilterParams.sortExpression.pretty}`,
                description: `${getFiltersUsedText(
                    sortFilterParams
                )}\n\nClick on one of the buttons below`,
            },
        ],

        components: getTagFilterDropDownComponent(sortFilterParams.excludeTags).concat(
            itemButtonList(sortFilterParams.excludeTags)
        ),
    };
}

export async function getSortedItemListMessage(
    sortFilterParams: SortFilterParams,
    returnShortResult: boolean
): Promise<Pick<BaseMessageOptions, 'embeds' | 'components'>> {
    if (sortFilterParams.weaponElement) {
        sortFilterParams.weaponElement = unaliasBonusName(sortFilterParams.weaponElement);
        if (!allValidWeaponElements.has(sortFilterParams.weaponElement)) {
            throw new ValidationError(
                `No weapons with the element '${sortFilterParams.weaponElement}' exist.`
            );
        }
    }
    const pipeline = await getSortQueryPipeline(sortFilterParams, returnShortResult);
    const sortResults: AggregationCursor = itemCollection.aggregate(pipeline);

    let itemGroup: {
        customSortValue: number;
        items: { title: string; levels: string[]; variant_info: { tags: string[] }[] }[];
    } | null = null;
    let sortedList: string = '';
    let lastResult: string = '';
    let groupCount: number = 0;
    let firstGroupValue: number | undefined;
    let lastGroupValue: number | undefined;

    itemGroup = await sortResults.next();
    firstGroupValue = itemGroup?.customSortValue;

    // Keep populating results until itemGroups have been exhausted, or
    // if the number of read groups is less than or equal to 1 less than the query result limit
    // We stop at 1 less than the result limit to prevent the 'more results' button from
    // being redundant
    const queryResultLimit: number = returnShortResult
        ? QUERY_SHORT_RESULT_LIMIT
        : QUERY_RESULT_LIMIT;
    const maxEmbedLength = returnShortResult ? MAX_EMBED_DESC_LENGTH / 3 : MAX_EMBED_DESC_LENGTH;

    while (itemGroup !== null && groupCount < queryResultLimit - 1) {
        groupCount += 1;

        let items: {
            title: string;
            levels: string[];
            variant_info: { tags: string[] }[];
        }[] = itemGroup.items;

        // Format and concatenate items in the itemGroup
        const itemDisplayList: string[] = items.map((item) => {
            let possibleTags: string = item.variant_info
                .map(({ tags }) => (tags.length ? tags.map(capitalize).join('+') : 'None'))
                .join(' / ');
            possibleTags = possibleTags === 'None' ? '' : `[${possibleTags}]`;
            return `\`${item.title}\` (lv. ${item.levels.join(', ')}) ${possibleTags}`.trim();
        });

        // Store the last formatted result
        const sign: string = itemGroup.customSortValue < 0 ? '' : '+';
        lastResult = `**${sign}${itemGroup.customSortValue}**\n ${itemDisplayList.join(', ')}\n\n`;

        // Stop populating results if including lastResult will exceed the embed character limit
        if (lastResult.length + sortedList.length > maxEmbedLength) {
            break;
        }

        if (sortFilterParams.prevPageValueLimit) sortedList = lastResult + sortedList;
        else sortedList += lastResult;

        lastGroupValue = itemGroup.customSortValue;
        itemGroup = await sortResults.next();
    }
    if (lastGroupValue === undefined) lastGroupValue = itemGroup?.customSortValue;

    if (sortFilterParams.prevPageValueLimit) {
        [lastGroupValue, firstGroupValue] = [firstGroupValue, lastGroupValue];
    }

    // Handle case in which the first itemGroup fetched exceeds the embed's character limit
    // In this case, display as many items as possible and append ellipses '...'
    if (!sortedList && lastResult) {
        const ellipses = ' **...**';
        const lastItemIndexBeforeLimit: number = lastResult
            .slice(0, maxEmbedLength - ellipses.length)
            .lastIndexOf(ITEM_LIST_DELIMITER);
        if (lastItemIndexBeforeLimit !== -1)
            sortedList = lastResult.slice(0, lastItemIndexBeforeLimit) + ellipses;
    }

    let buttonRow: MessageActionRow[];

    if (returnShortResult) {
        buttonRow = getFullResultsButtonComponent(
            sortFilterParams.itemType,
            sortFilterParams.excludeTags
        );
    } else {
        buttonRow = getPrevAndNextSortPageNavigationComponents(
            sortFilterParams.excludeTags,
            // Add a previous page button to the message if any of the following are true:
            // 1) The next page value limit parameter exists, implying that they clicked "next page" at least once
            // 2) The previous page value limit exists (implying that the user clicked on "prev page" at least once),
            //    and not all itemGroups were exhausted (can be checked by seeing if itemGroup is non null)
            sortFilterParams.nextPageValueLimit !== undefined ||
                (sortFilterParams.prevPageValueLimit !== undefined && !!itemGroup)
                ? firstGroupValue
                : undefined,
            // Add a next page button to the message if the following are true:
            // 1) The prev page value limit parameter exists, implying that they clicked "prev page" at least once
            // 2) Both prev and next page value limits don't exist (implying that neither "prev page" nor "next page"
            //    were clicked), and not all itemGroups were exhausted (itemGroup is not null)
            // 3) The next page value limit exists (implying that the user clicked on "next page" at least once),
            //    and not all itemGroups were exhausted (can be checked by seeing if itemGroup is non null)
            sortFilterParams.prevPageValueLimit !== undefined ||
                (sortFilterParams.prevPageValueLimit === undefined &&
                    sortFilterParams.nextPageValueLimit === undefined &&
                    !!itemGroup) ||
                (sortFilterParams.nextPageValueLimit !== undefined && !!itemGroup)
                ? lastGroupValue
                : undefined
        );
    }

    sortedList = sortedList || 'No results were found';

    // Pretty print the input item type
    const title: string = `Sort ${PRETTY_ITEM_TYPES[sortFilterParams.itemType]} by ${
        sortFilterParams.sortExpression.pretty
    }`;

    // Display filters used in the first embed
    const filters: string = getFiltersUsedText(sortFilterParams);

    return {
        embeds: [{ title, description: filters }, { description: sortedList }],
        components: getTagFilterDropDownComponent(sortFilterParams.excludeTags).concat(buttonRow),
    };
}

export async function getSortResultsMessage(
    itemTypeOption: SortItemTypeOption,
    sortFilterParams: Omit<SortFilterParams, 'itemType'>,
    returnShortResult: boolean = false
): Promise<Pick<BaseMessageOptions, 'embeds' | 'components'>> {
    if (sortFilterParams.weaponElement?.match(/[^a-z\?]/i)) {
        throw new ValidationError('The weapon element name cannot include special characters.');
    }
    if (sortFilterParams.charID && !sortFilterParams.charID.match(/^[\d]{2,12}$/)) {
        throw new ValidationError('Character IDs must be between 2 and 12 digits long.');
    }

    if (itemTypeOption === 'items') {
        return getAllItemDisplayMessage(sortFilterParams);
    }

    return getSortedItemListMessage(
        { ...sortFilterParams, itemType: itemTypeOption },
        returnShortResult
    );
}

export async function getSortResultsMessageUsingMessageFilters(
    embedTitle: string,
    embedDesc: string | undefined,
    selectedTagsToExclude?: ItemTag[],
    itemType?: SortItemTypeOption,
    valueLimit?:
        | Pick<SortFilterParams, 'nextPageValueLimit'>
        | Pick<SortFilterParams, 'prevPageValueLimit'>
): Promise<Pick<BaseMessageOptions, 'embeds' | 'components'>> {
    const sortExpressionMatch: RegExpMatchArray = embedTitle.match(/^Sort ([a-z/]+?) by (.+)$/i)!;
    const itemTypeMatch: string = sortExpressionMatch[1];
    if (!itemType) itemType = PRETTY_TO_BASE_ITEM_TYPE[itemTypeMatch] || 'items';

    const sortExpressionInput: string = sortExpressionMatch[2];
    const sortExpression: SortExpressionData = parseSortExpression(sortExpressionInput, true);
    let excludeTags: Set<ItemTag> | undefined;
    if (selectedTagsToExclude) {
        excludeTags = new Set(selectedTagsToExclude);
    }

    const sortFilterParams: Omit<SortFilterParams, 'itemType'> = {
        sortExpression,
        excludeTags,
        ...valueLimit,
    };

    if (embedDesc) {
        if (itemType === 'weapon') {
            const [, weaponElement]: RegExpMatchArray | [] =
                embedDesc.match(/\*\*Weapon Element:\*\* ([a-z0-9?]+)/i) || [];
            sortFilterParams.weaponElement = weaponElement?.toLowerCase();
        }
        const [, charID]: RegExpMatchArray | [] =
            embedDesc.match(/\*\*Char ID:\*\* \[(\d+)\]/i) || [];
        const [, minLevel]: RegExpMatchArray | [] =
            embedDesc.match(/\*\*Min Level:\*\* (\d+)/i) || [];
        const [, maxLevel]: RegExpMatchArray | [] =
            embedDesc.match(/\*\*Max Level:\*\* (\d+)/i) || [];
        const ascending: boolean = !!embedDesc.match(/\*\*Order:\*\* Ascending/);

        sortFilterParams.charID = charID;
        sortFilterParams.minLevel = minLevel !== undefined ? Number(minLevel) : undefined;
        sortFilterParams.maxLevel = maxLevel !== undefined ? Number(maxLevel) : undefined;
        sortFilterParams.ascending = ascending;
    }

    return getSortResultsMessage(itemType, sortFilterParams);
}
