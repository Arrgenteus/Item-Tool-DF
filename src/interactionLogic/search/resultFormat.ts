import { EmbedFieldData, MessageEmbedOptions, Util } from 'discord.js';
import { ACCESSORY_TYPES, ItemTag, PRETTY_TAG_NAMES } from '../../utils/itemTypeData';
import { capitalize } from '../../utils/misc';
import { SearchableItemCategory, Location, ItemVariantInfo, Stat, PetAttack } from './types';

function getFormattedListOfItemTags(searchResultVariantInfo?: ItemVariantInfo[]): string {
    return (
        (searchResultVariantInfo || [])
            .map(
                ({ tags }: ItemVariantInfo) =>
                    '`' +
                    (tags.map((tag: ItemTag): string => PRETTY_TAG_NAMES[tag]).join(', ') ||
                        'Untagged') +
                    '`'
            )
            .join(' or ') || '`Untagged`'
    );
}

function getFormattedListOfLocations(searchResultVariantInfo?: ItemVariantInfo[]): string {
    return (
        (searchResultVariantInfo || [])
            .map((variantInfo: { locations: Location[] }) => variantInfo.locations)
            .flat()
            .map((location: Location) =>
                location.link ? `[${location.name}](${location.link})` : location.name
            )
            .join(', ') || 'N/A'
    );
}

function getFormattedBonusesOrResists(searchResultStats?: Stat[]) {
    return (
        (searchResultStats || [])
            .map((stat: Stat) => {
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

function getFormattedColorCustomInfo() {}

function getFormattedItemElements(searchResultElements?: string[]): string {
    return (searchResultElements || []).map(capitalize).join(' / ') || 'N/A';
}

function getFormattedPetAttackList(searchResultPetAttacks?: PetAttack[]) {
    return (searchResultPetAttacks || [])
        .map(
            (attack: PetAttack, attackIndex: number) =>
                `${attackIndex + 1}. ${attack.description}`
        )
        .join('\n') || 'This pet has no attacks.'
}

function formatPetQueryResponse(searchResult: any): MessageEmbedOptions {
    const embedBody: string =
        `**Tags:** ${getFormattedListOfItemTags(searchResult.variant_info)}\n` +
        `**Locations:** ${getFormattedListOfLocations(searchResult.variant_info)}\n` +
        `**Level:** ${searchResult.level}\n` +
        `**Damage:** ${Util.escapeMarkdown(searchResult.damage) || '0-0'}\n` +
        `**Element:** ${getFormattedItemElements(searchResult.elements)}\n` +
        `**Bonuses:** ${getFormattedBonusesOrResists(searchResult.bonuses)}`;

    return {
        url: searchResult.link,
        title: searchResult.full_title,
        description: embedBody,
        image: { url: (searchResult.images || [])[0] },
        fields: [{ name: 'Attacks', value: getFormattedPetAttackList(searchResult.attacks)}],
    };
}

function formatAccessoryQueryResponse(searchResult: any): MessageEmbedOptions {
    let embedBody =
        `**Tags:** ${getFormattedListOfItemTags(searchResult.variant_info)}\n` +
        `**Locations:** ${getFormattedListOfLocations(searchResult.variant_info)}\n` +
        `**Level:** ${searchResult.level}\n` +
        `**Type:** ${capitalize(searchResult.item_type)}`;

    const isCosmetic: boolean = searchResult.common_tags.includes('cosmetic');
    if (!isCosmetic) {
        embedBody +=
            `**Bonuses:** ${getFormattedBonusesOrResists(searchResult.bonuses)}\n` +
            `**Resists:** ${getFormattedBonusesOrResists(searchResult.resists)}`;
    }
    
    const embedFields = [];
    
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
    const isAccessory: boolean =
        itemSearchCategory in ACCESSORY_TYPES || itemSearchCategory === 'accessory';

    const formattedTagList: string = getFormattedListOfItemTags(searchResult.variant_info);
    const formattedLocationList: string = getFormattedListOfLocations(searchResult.variant_info);
    const bonuses: string = getFormattedBonusesOrResists(searchResult.bonuses);

    let embedBody: string =
        `**Tags:** ${formattedTagList}\n` +
        `**Locations:** ${formattedLocationList}\n` +
        `**Level:** ${searchResult.level}\n`;

    if (itemSearchCategory === 'pet') {
        embedBody += `**`;
    }

    const embedFields: EmbedFieldData[] = [];
    if (itemSearchCategory === 'pet') {
        embedBody =
            `**Damage:** ${Util.escapeMarkdown(searchResult.damage) || '0-0'}\n` +
            `**Element:** ${searchResult.elements.map(capitalize).join(' / ') || 'N/A'}\n` +
            `**Bonuses:** ${bonuses}`;

        const attacks: string =
            ;
        embedFields.push({ name: 'Attacks', value: attacks });
    } else {
        embedBody =
            `**Tags:** ${tags}\n` +
            `**Location${locations.length > 1 ? 's' : ''}:** ${locations.join(', ') || 'N/A'}\n` +
            `**Level:** ${searchResult.level}\n` +
            `**Type:** ${capitalize(searchResult.item_type)}`;

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
            text: getFormattedColorCustomInfo(
                `This item is color-custom to your ${searchResult.color_custom.join(', ')} color`
            ),
        };
    }

    return { message: messageEmbed, noResults: false };
}
