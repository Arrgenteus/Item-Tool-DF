import config from '../../config';
import { WEAPON_TYPES } from '../../utils/itemTypeData';
import { ACCESSORY_ALIASES, PET_ALIASES, WEAPON_ALIASES } from './aliases';
import {
    categoryAliasMapping,
    ItemCategoryTypes,
    SearchableItemCategory,
    SearchableItemCategoryAlias,
} from './types';

const ITEM_CATEGORY_TYPE_TO_INDEX_NAMES = {
    [ItemCategoryTypes.GEAR]: [config.WEAPON_INDEX_NAME, config.ACCESSORY_INDEX_NAME],
    [ItemCategoryTypes.WEAPON]: [config.WEAPON_INDEX_NAME],
    [ItemCategoryTypes.ACCESSORY]: [config.ACCESSORY_INDEX_NAME],
    [ItemCategoryTypes.PET]: [config.PET_INDEX_NAME],
};

const ITEM_CATEGORY_TYPE_TO_ALIAS_DICT = {
    [ItemCategoryTypes.GEAR]: { ...ACCESSORY_ALIASES, ...WEAPON_ALIASES },
    [ItemCategoryTypes.WEAPON]: WEAPON_ALIASES,
    [ItemCategoryTypes.ACCESSORY]: ACCESSORY_ALIASES,
    [ItemCategoryTypes.PET]: PET_ALIASES,
};

function getItemCategoryType(itemCategory: SearchableItemCategory): ItemCategoryTypes {
    if (itemCategory === 'item' || itemCategory === 'cosmetic') return ItemCategoryTypes.GEAR;
    if (itemCategory === 'pet') return ItemCategoryTypes.PET;
    if (itemCategory in WEAPON_TYPES || itemCategory === 'weapon') return ItemCategoryTypes.WEAPON;
    return ItemCategoryTypes.ACCESSORY;
}

export function getIndexNames(itemSearchCategory: SearchableItemCategory): string[] {
    const itemCategoryType: ItemCategoryTypes = getItemCategoryType(itemSearchCategory);
    return ITEM_CATEGORY_TYPE_TO_INDEX_NAMES[itemCategoryType];
}

export function getVariantAndUnaliasTokens(
    searchTerm: string,
    itemSearchCategory: SearchableItemCategory
): { unaliasedTokens: string[]; variantNumber?: number } {
    const words: string[] = searchTerm.split(/[ _\\-]+/);

    const romanNumberRegex: RegExp = /^((?:x{0,3})(ix|iv|v?i{0,3}))$/i;
    let variantNumber: number | undefined;
    for (const index of [words.length - 1, words.length - 2].filter((i: number) => i > 0)) {
        if (words[index].match(romanNumberRegex)) {
            variantNumber = romanIntToInt(words[index]);
            words.splice(index, 1);
            break;
        }
    }

    const itemCategoryType: ItemCategoryTypes = getItemCategoryType(itemSearchCategory);
    const aliasDict = ITEM_CATEGORY_TYPE_TO_ALIAS_DICT[itemCategoryType];

    const unaliasedTokens: string[] = words.map(
        (word: string) => aliasDict[word.toLowerCase()] || word
    );
    return { unaliasedTokens, variantNumber };
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
