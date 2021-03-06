import ENTimeUnitWithinFormatParser from "./parsers/ENTimeUnitWithinFormatParser";
import ENMonthNameLittleEndianParser from "./parsers/ENMonthNameLittleEndianParser";
import ENMonthNameMiddleEndianParser from "./parsers/ENMonthNameMiddleEndianParser";
import ENMonthNameParser from "./parsers/ENMonthNameParser";
import ENCasualYearMonthDayParser from "./parsers/ENCasualYearMonthDayParser";
import ENSlashMonthFormatParser from "./parsers/ENSlashMonthFormatParser";
import ENTimeExpressionParser from "./parsers/ENTimeExpressionParser";
import ENTimeUnitAgoFormatParser from "./parsers/ENTimeUnitAgoFormatParser";
import ENTimeUnitLaterFormatParser from "./parsers/ENTimeUnitLaterFormatParser";
import ENMergeDateRangeRefiner from "./refiners/ENMergeDateRangeRefiner";
import ENMergeDateTimeRefiner from "./refiners/ENMergeDateTimeRefiner";

import { includeCommonConfiguration } from "../../configurations";
import ENCasualDateParser from "./parsers/ENCasualDateParser";
import ENCasualTimeParser from "./parsers/ENCasualTimeParser";
import ENWeekdayParser from "./parsers/ENWeekdayParser";
import ENRelativeDateFormatParser from "./parsers/ENRelativeDateFormatParser";

import { ParsedResult, ParsingOption } from "../../index";
import { Chrono, Configuration } from "../../chrono";
import SlashDateFormatParser from "../../common/parsers/SlashDateFormatParser";
import ENTimeUnitCasualRelativeFormatParser from "./parsers/ENTimeUnitCasualRelativeFormatParser";

// Shortcuts
export const casual = new Chrono(createCasualConfiguration(false));
export const strict = new Chrono(createConfiguration(true, false));

export const GB = new Chrono(createConfiguration(false, true));

export function parse(text: string, ref?: Date, option?: ParsingOption): ParsedResult[] {
    return casual.parse(text, ref, option);
}

export function parseDate(text: string, ref?: Date, option?: ParsingOption): Date {
    return casual.parseDate(text, ref, option);
}

export function createCasualConfiguration(littleEndian = false): Configuration {
    const option = createConfiguration(false, littleEndian);
    option.parsers.unshift(new ENCasualDateParser());
    option.parsers.unshift(new ENCasualTimeParser());
    option.parsers.unshift(new ENMonthNameParser());
    option.parsers.unshift(new ENRelativeDateFormatParser());
    option.parsers.unshift(new ENTimeUnitCasualRelativeFormatParser());
    return option;
}

export function createConfiguration(strictMode = true, littleEndian = false): Configuration {
    return includeCommonConfiguration(
        {
            parsers: [
                new SlashDateFormatParser(littleEndian),
                new ENTimeUnitWithinFormatParser(),
                new ENMonthNameLittleEndianParser(),
                new ENMonthNameMiddleEndianParser(),
                new ENWeekdayParser(),
                new ENCasualYearMonthDayParser(),
                new ENSlashMonthFormatParser(),
                new ENTimeExpressionParser(),
                new ENTimeUnitAgoFormatParser(strictMode),
                new ENTimeUnitLaterFormatParser(strictMode),
            ],
            refiners: [new ENMergeDateTimeRefiner(), new ENMergeDateRangeRefiner()],
        },
        strictMode
    );
}
