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

export function unaliasItemType(
    commandName: SearchableItemCategory | SearchableItemCategoryAlias
): SearchableItemCategory {
    return categoryAliasMapping[commandName as SearchableItemCategoryAlias] ?? commandName;
}

export function romanIntToInt(romanInt: string) {
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

function getSimilarResults(responseBody: any): string | undefined {
    const similarResultList = responseBody.aggregations?.similar_results?.filtered?.buckets;
    if (!similarResultList) return;

    const similarResults: string = similarResultList
        .slice(1)
        .map(
            (bucket: {
                items: { top: [{ metrics: { 'title.keyword': string; link: string } }] };
            }) => bucket.items.top[0].metrics
        )
        .map(
            (similarResult: { 'title.keyword': string; link: string }) =>
                `[${similarResult['title.keyword']}](${similarResult.link})`
        )
        .join(', ');
    return similarResults;
}

export function formatQueryResponse(
    responseBody: any,
    itemSearchCategory: SearchableItemCategory
): {
    message: MessageEmbedOptions;
    noResults: boolean;
} {
    const searchResult: any | undefined = responseBody.hits.hits[0]?._source;
    if (!searchResult) {
        return {
            message: { description: `No ${itemSearchCategory} was found.` },
            noResults: true,
        };
    }

    const tags: string =
        (searchResult.variant_info || [])
            .map(
                ({ tags: tagList }: { tags: ItemTag[] }) =>
                    '`' +
                    (tagList.map((tag: ItemTag): string => PRETTY_TAG_NAMES[tag]).join(', ') ||
                        'Untagged') +
                    '`'
            )
            .join(' or ') || '`Untagged`';

    const locationList: Location[] = (searchResult.variant_info || [])
        .map((variantInfo: { locations: Location[] }) => variantInfo.locations)
        .flat()
        .map((location: Location) =>
            location.link ? `[${location.name}](${location.link})` : location.name
        );
    const locations: Location[] = [...new Set(locationList)];

    const bonuses: string = formatBonusesOrResists(searchResult.bonuses);

    let embedBody: string;
    const embedFields: EmbedFieldData[] = [];
    if (itemSearchCategory === 'pet') {
        embedBody =
            `**Tags:** ${tags}\n` +
            `**Location${locations.length > 1 ? 's' : ''}:** ${locations.join(', ') || 'N/A'}\n` +
            `**Level:** ${searchResult.level}\n` +
            `**Damage:** ${Util.escapeMarkdown(searchResult.damage) || '0-0'}\n` +
            `**Element:** ${searchResult.elements.map(capitalize).join(' / ') || 'N/A'}\n` +
            `**Bonuses:** ${bonuses}`;

        const attacks: string =
            searchResult.attacks
                .map(
                    (attack: PetAttack, index: number) =>
                        (index + 1).toString() + '. ' + attack.description
                )
                .join('\n') || 'This pet has no attacks.';
        embedFields.push({ name: 'Attacks', value: attacks });
    } else {
        embedBody =
            `**Tags:** ${tags}\n` +
            `**Location${locations.length > 1 ? 's' : ''}:** ${locations.join(', ') || 'N/A'}\n` +
            `**Level:** ${searchResult.level}\n` +
            `**Type:** ${capitalize(searchResult.item_type)}`;

        const isAccessory: boolean =
            itemSearchCategory in ACCESSORY_TYPES || itemSearchCategory === 'accessory';

        const isCosmetic: boolean = searchResult.common_tags.includes('cosmetic');

        if (!isAccessory) {
            if (!isCosmetic) {
                embedBody += `\n**Damage:** ${Util.escapeMarkdown(searchResult.damage) || '0-0'}`;
            }
            embedBody += `\n**Element:** ${
                (searchResult.elements || []).map(capitalize).join(' / ') || 'N/A'
            }`;
        }
        if (!isCosmetic) {
            embedBody += `\n**Bonuses:** ${bonuses}`;
            const resists: string = formatBonusesOrResists(searchResult.resists);
            embedBody += `\n**Resists:** ${resists}`;
        }

        if (searchResult.artifact_modifiers?.length) {
            embedBody += `\n**Modifies:** ${searchResult.artifact_modifiers.join(', ')}`;
        }

        if (searchResult.trinket_skill) {
            embedFields.push({
                name: `Trinket Skill`,
                value:
                    `**Effect:** ${Util.escapeMarkdown(searchResult.trinket_skill.effect)}\n` +
                    `**Mana Cost:** ${searchResult.trinket_skill.mana_cost}\n` +
                    `**Cooldown:** ${searchResult.trinket_skill.cooldown}\n` +
                    `**Damage Type:** ${
                        capitalize(searchResult.trinket_skill.damage_type) || 'N/A'
                    }\n` +
                    `**Element:** ${
                        (searchResult.trinket_skill.element || []).map(capitalize).join(' / ') ||
                        'N/A'
                    }`,
            });
        }
    }

    const otherLevelVariants: string = getFormattedOtherLevelVariants(responseBody, searchResult);
    if (otherLevelVariants) {
        embedBody += `\n**Other Level Variants:** ${otherLevelVariants}`;
    }

    const similarResults: string | undefined = getSimilarResults(responseBody);
    if (similarResults) {
        embedFields.push({ name: 'Similar Results', value: similarResults });
    }

    if (searchResult.images && searchResult.images.length > 1) {
        embedFields.push({
            name: 'Other Appearances',
            value: searchResult.images
                .slice(1)
                .map((imageUrl: string, index: number) => `[Appearance ${index + 2}](${imageUrl})`)
                .join(', '),
        });
    }

    const messageEmbed: MessageEmbedOptions = {
        url: searchResult.link,
        title: searchResult.full_title,
        description: embedBody,
        image: { url: (searchResult.images || [])[0] },
        fields: embedFields,
    };

    if (searchResult.color_custom?.length) {
        messageEmbed.footer = {
            text: `This item is color-custom to your ${searchResult.color_custom.join(', ')} color`,
        };
    }

    return { message: messageEmbed, noResults: false };
}
