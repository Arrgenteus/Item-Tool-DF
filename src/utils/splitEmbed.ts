import {
    MAX_EMBED_DESC_LENGTH,
    MAX_EMBED_FOOTER_LENGTH,
    MAX_SPLIT_EMBED_DESC_LENGTH,
} from '../commonTypes/commandStructures';

export default class SplitEmbed {
    private maxLength: number;
    private length: number;
    private delimiter: string;
    private _embeds: {
        title?: string;
        description: string;
        footer?: { text: string };
    }[] = [];
    private titleText: string = '';
    private footerText: string = '';

    constructor(delimiter: string, maxEmbeds: number) {
        this.delimiter = delimiter;
        if (!Number.isInteger(maxEmbeds) || maxEmbeds < 1 || maxEmbeds > 10)
            throw new RangeError('maxEmbeds must be an integer between 0 and 10');

        this.maxLength =
            maxEmbeds === 1 ? MAX_EMBED_DESC_LENGTH : MAX_SPLIT_EMBED_DESC_LENGTH * maxEmbeds;
        this.length = 0;
    }

    private get lastEmbed() {
        return this._embeds[this._embeds.length - 1];
    }
    private get firstEmbed() {
        return this._embeds[0];
    }
    private addEmbed(text: string) {
        this._embeds.push({ description: text });
        return this.lastEmbed;
    }
    private clearTitlesAndFooters() {
        for (const embed of this._embeds) {
            delete embed.title;
            delete embed.footer;
        }
    }
    public get embeds() {
        return this._embeds;
    }
    public get size() {
        return this.length;
    }

    public addText(text: string) {
        if (this.length + text.length > this.maxLength)
            throw new RangeError(`${this.maxLength} character limit for embeds exceeded`);

        const lastEmbed = this.lastEmbed || this.addEmbed('');
        const remainingLength = MAX_EMBED_DESC_LENGTH - lastEmbed.description.length;

        let separatorIndex =
            text.length <= remainingLength
                ? remainingLength
                : text.slice(0, remainingLength).lastIndexOf(this.delimiter) + 1;

        if (separatorIndex === -1)
            separatorIndex =
                text.length > MAX_EMBED_DESC_LENGTH && remainingLength === MAX_EMBED_DESC_LENGTH
                    ? remainingLength
                    : 0;

        const textToAppend = text.slice(0, separatorIndex);
        const remainingText = text.slice(separatorIndex);
        lastEmbed.description += textToAppend;
        this.length += textToAppend.length;

        if (remainingText.length) {
            this.addEmbed('');
            this.addText(remainingText);
        } else if (this.titleText || this.footerText) {
            this.clearTitlesAndFooters();
            if (this.titleText) this.setTitle(this.titleText);
            if (this.footerText) this.setFooter(this.footerText);
        }
    }

    public setTitle(text: string) {
        if (text.length > 256) throw new RangeError('Embed title cannot exceed 256 characters');
        this.footerText = text;
        this.firstEmbed.title = text;
    }

    public setFooter(text: string) {
        if (text.length > MAX_EMBED_FOOTER_LENGTH)
            throw new RangeError(
                `Embed footer cannot exceed ${MAX_EMBED_FOOTER_LENGTH} characters`
            );
        this.footerText = text;
        this.lastEmbed.footer = { text };
    }
}
