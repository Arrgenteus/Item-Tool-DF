import cheerio from 'cheerio';
import { ValidationError } from '../../errors';
import { EphemeralMap } from '../../utils/EphemeralMap';
import got from 'got';
const FETCH_TIMEOUT = 3 * 1000; // 3 seconds
const CHAR_INV_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes
const charLevelAndItems = new EphemeralMap(CHAR_INV_EXPIRATION_TIME);
export async function getCharPage(charID, retries = 3) {
    return got('https://account.dragonfable.com/CharPage?id=' + charID, {
        timeout: { request: FETCH_TIMEOUT },
        http2: true,
        responseType: 'text',
        resolveBodyOnly: true,
        retry: {
            calculateDelay: ({ attemptCount }) => (attemptCount <= retries ? 100 : 0),
        },
    });
}
export async function getCharLevelAndItems(charID) {
    if (charLevelAndItems.has(charID)) {
        return charLevelAndItems.get(charID);
    }
    if (!charID.match(/^[\d]{2,12}$/)) {
        throw new ValidationError('Character IDs must be between 2 and 12 digits long.');
    }
    const body = await getCharPage(charID);
    const $ = cheerio.load(body);
    const playerInfoSection = $('.card:nth-child(1) .card-body');
    const levelMatch = playerInfoSection
        .text()
        .match(/Level: ([\d]{1,2})\n/);
    if (!levelMatch) {
        throw new ValidationError(`Character ID \`${charID}\` was not found.`);
    }
    const level = Number(levelMatch[1]);
    const inventoryAndBankItems = $('.card:nth-child(2) .card-body, .card:nth-child(3) .card-body');
    const items = inventoryAndBankItems
        .text()
        .split('\n')
        .map((itemName) => itemName.trim())
        // Filter out stackable items
        .filter((item) => !!item && !item.match(/\(x[\d]+\)$/));
    const levelAndItems = { level, items };
    charLevelAndItems.set(charID, levelAndItems);
    return levelAndItems;
}
