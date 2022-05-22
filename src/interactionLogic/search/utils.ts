import { EmbedFieldData, MessageEmbedOptions, Util } from 'discord.js';
import config from '../../config';
import { ACCESSORY_TYPES, ItemTag, PRETTY_TAG_NAMES, WEAPON_TYPES } from '../../utils/itemTypeData';
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

export function getIndexNames(itemSearchCategory: SearchableItemCategory): string[] {
    if (itemSearchCategory === 'pet') return [config.PET_INDEX_NAME];
    if (itemSearchCategory === 'weapon') return [config.WEAPON_INDEX_NAME];
    return [config.ACCESSORY_INDEX_NAME];
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
