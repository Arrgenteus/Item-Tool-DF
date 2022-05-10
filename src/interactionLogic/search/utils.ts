import { EmbedFieldData, MessageEmbedOptions, Util } from 'discord.js';
import config from '../../config';
import { ACCESSORY_TYPES, ItemTag, PRETTY_TAG_NAMES } from '../../utils/itemTypeData';
import { capitalize } from '../../utils/misc';
import {
    categoryAliasMapping,
    Location,
    PetAttack,
    SearchableItemCategory,
    SearchableItemCategoryAlias,
    SearchableItemCategoryFilter,
    Stat,
} from './types';

export function getIndexNameAndCategoryFilterQuery(itemSearchCategory: SearchableItemCategory): {
    index: string[];
    query: SearchableItemCategoryFilter | undefined;
} {
    let index: string[] = [config.ACCESSORY_INDEX_NAME];
    if (itemSearchCategory === 'pet') {
        index = [config.PET_INDEX_NAME];
    }

    if (itemSearchCategory in ACCESSORY_TYPES) {
        if (itemSearchCategory in { cape: 1, wings: 1 }) {
            return { index, query: { terms: { item_type: ['cape', 'wings'] } } };
        }
        return { index, query: { terms: { item_type: [itemSearchCategory] } } };
    }

    return { index, query: undefined };
}

export function getIndexNames(itemSearchCategory: SearchableItemCategory): string[] {
    if (itemSearchCategory === 'pet') return [config.PET_INDEX_NAME];
    if (itemSearchCategory === 'weapon') return [config.WEAPON_INDEX_NAME];
    return [config.ACCESSORY_INDEX_NAME];
}

export function getCategoryFilterQuery() {
    if (itemSearchCategory in ACCESSORY_TYPES) {
        if (itemSearchCategory in { cape: 1, wings: 1 }) {
            return { terms: { item_type: ['cape', 'wings'] } };
        }
        return { terms: { item_type: [itemSearchCategory] } };
    }
}

export function unaliasItemType(
    commandName: SearchableItemCategory | SearchableItemCategoryAlias
): SearchableItemCategory {
    return categoryAliasMapping[commandName as SearchableItemCategoryAlias] ?? commandName;
}

export function romanIntToInt(romanInt: string) {
    romanInt = romanInt.toLowerCase();
    const romanPlaceValues: { [key: string]: number } = { i: 1, v: 5, x: 10 };

    let integer: number = romanPlaceValues[romanInt[0]];
    for (let i = 1; i < romanInt.length; ++i) {
        const currentLetterValue = romanPlaceValues[romanInt[i]];
        const prevLetterValue = romanPlaceValues[romanInt[i - 1]];
        if (currentLetterValue <= prevLetterValue) {
            integer += currentLetterValue;
        } else {
            integer = integer - prevLetterValue * 2 + currentLetterValue;
        }
    }

    return integer;
}

function getFormattedOtherLevelVariants(
    responseBody: any,
    searchResult: { [key: string]: any; full_title: string }
): string {
    // Get the source document of every other level variant and filter out the main result
    const otherLevelVariantList: { level: number; full_title: string; title: string }[] = (
        responseBody.aggregations?.other_level_variants?.buckets[0]?.items?.hits?.hits || []
    )
        .map(
            (searchHit: {
                [key: string]: any;
                _source: { level: number; full_title: string; title: string };
            }) => searchHit._source
        )
        .filter(
            ({ full_title, level }: { level: number; full_title: string }) =>
                !(full_title === searchResult.full_title && level === searchResult.level)
        );
    // Get all levels that are repeated more than once
    const repeatedVariantLevels: Set<number> = new Set();
    for (let index = 1; index < otherLevelVariantList.length; ++index) {
        const level: number = otherLevelVariantList[index].level;
        // Levels should be in sorted order already
        if (level === otherLevelVariantList[index - 1].level) {
            repeatedVariantLevels.add(level);
        }
    }

    return otherLevelVariantList
        .map(({ level, full_title, title }: { level: number; full_title: string; title: string }) =>
            // To differentiate variants, display the item name next to the level if
            // there are multiple variants at the same level, or if the variant is
            // at the same level as the main result
            level === searchResult.level ||
            repeatedVariantLevels.has(level) ||
            title !== searchResult.title
                ? `\`${level}\` _(${full_title})_`
                : '`' + level + '`'
        )
        .join(', ');
}

function formatBonusesOrResists(stats?: Stat[]): string {
    return (
        (stats || [])
            .map((stat: { name: string; value: string | number }) => {
                if (typeof stat.value === 'string') {
                    return `${capitalize(stat.name)} +[${stat.value}]`;
                }
                if (stat.value < 0) {
                    return `${capitalize(stat.name)} ${stat.value}`;
                }
                return `${capitalize(stat.name)} +${stat.value}`;
            })
            .join(', ') || 'None'
    );
}
