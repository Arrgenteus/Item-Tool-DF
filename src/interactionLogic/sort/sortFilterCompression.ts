// import { ItemType } from '../../utils/itemTypeData';
// import { ValueError } from '../../errors';
// import { parseCompressedSortExpression } from './sortExpressionParser';
// import { SortExpressionData, SortFilterParams } from './types';

// const compressedItemTypeMapping: {
//     [itemType: string]: ItemType;
// } = {
//     w: 'weapon',
//     c: 'cape',
//     h: 'helm',
//     b: 'belt',
//     n: 'necklace',
//     r: 'ring',
//     t: 'trinket',
//     br: 'bracer',
// };

// const uncompressedItemTypeMapping: {
//     [itemType in ItemType]: string;
// } = {
//     weapon: 'w',
//     cape: 'c',
//     helm: 'h',
//     belt: 'b',
//     necklace: 'n',
//     ring: 'r',
//     trinket: 't',
//     bracer: 'br',
// };

// function uncompressItemType(compressedItemType: string): ItemType {
//     const result: ItemType = compressedItemTypeMapping[compressedItemType];
//     if (!result) throw new ValueError(`Invalid compressed item type '${compressedItemType}'`);
//     return result;
// }

// export function uncompressSortFilters(compressedFilters: string): SortFilterParams {
//     const [
//         itemType,
//         order,
//         compressedExpression,
//         weaponElement,
//         maxLevelInput,
//         minLevelInput,
//     ]: string[] = compressedFilters.split('`');
//     const ascending: boolean = order === 'a';
//     const parsedExpression: SortExpressionData =
//         parseCompressedSortExpression(compressedExpression);
//     const maxLevel: number | undefined = maxLevelInput ? Number(maxLevelInput) : undefined;
//     const minLevel: number | undefined = minLevelInput ? Number(minLevelInput) : undefined;

//     return {
//         itemType: uncompressItemType(itemType),
//         ascending,
//         sortExpression: parsedExpression,
//         weaponElement: weaponElement || undefined,
//         maxLevel,
//         minLevel,
//     };
// }

// export function compressSortFilters(
//     { itemType, ascending, sortExpression, weaponElement, maxLevel, minLevel }: SortFilterParams,
//     small?: boolean
// ): string | undefined {
//     const compressed = [
//         small ? 'ss' : 's',
//         uncompressedItemTypeMapping[itemType],
//         ascending ? 'a' : '',
//         sortExpression.compressed,
//         weaponElement || '',
//         maxLevel !== 90 && maxLevel !== undefined ? maxLevel.toString() : '',
//         minLevel !== 0 && minLevel !== undefined ? minLevel.toString() : '',
//     ]
//         .join('`')
//         .replace(/\`+$/, '`');
//     return compressed.length <= 100 ? compressed : undefined;
// }
