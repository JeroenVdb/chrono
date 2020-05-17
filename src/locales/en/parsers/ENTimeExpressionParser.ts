import {Parser, ParsingContext} from "../../../chrono";
import {ParsingResult} from "../../../results";
import dayjs from "dayjs";

const FIRST_REG_PATTERN  = new RegExp("(?<!\w)(^|\\s|T)" +
    "(?:(?:at|from)\\s*)??" +
    "(\\d{1,4}|noon|midnight)" +
    "(?:" +
    "(?:\\.|\\:|\\：)(\\d{1,2})" +
    "(?:" +
    "(?:\\:|\\：)(\\d{2})(?:\\.(\\d{1,6}))?" +
    ")?" +
    ")?" +
    "(?:\\s*(A\\.M\\.|P\\.M\\.|AM?|PM?|O\\W*CLOCK))?" +
    "(?=\\W|$)", 'i');

const SECOND_REG_PATTERN = new RegExp("^\\s*" +
    "(\\-|\\–|\\~|\\〜|to|\\?)\\s*" +
    "(\\d{1,4})" +
    "(?:" +
    "(?:\\.|\\:|\\：)(\\d{1,2})" +
    "(?:" +
    "(?:\\.|\\:|\\：)(\\d{1,2})(?:\\.(\\d{1,6}))?" +
    ")?" +
    ")?" +
    "(?:\\s*(A\\.M\\.|P\\.M\\.|AM?|PM?|O\\W*CLOCK))?" +
    "(?=\\W|$)", 'i');

const HOUR_GROUP    = 2;
const MINUTE_GROUP  = 3;
const SECOND_GROUP  = 4;
const MILLI_SECOND_GROUP  = 5;
const AM_PM_HOUR_GROUP = 6;

export default class ENTimeExpressionParser implements Parser {

    pattern(): RegExp {
        return FIRST_REG_PATTERN;
    }

    extract(context: ParsingContext, match: RegExpMatchArray): ParsingResult {
        const refDate = dayjs(context.refDate);
        let result = context.createParsingResult(
            match.index + match[1].length, match[0].substring(match[1].length));

        if (result.text.match(/^\d+$/)) {
            return null;
        }

        result.start.imply('day',   refDate.date());
        result.start.imply('month', refDate.month()+1);
        result.start.imply('year',  refDate.year());

        result = ENTimeExpressionParser.extractStartTimeComponent(result.clone(), match)
        if (!result) {
            return null;
        }

        const remainingText = match.input.substring(match.index + match[0].length)
        match = SECOND_REG_PATTERN.exec(remainingText);
        if (!match) {
            return result;
        }

        // Pattern "YY.YY -XXXX" is more like timezone offset
        if (match[0].match(/^\s*([+-])\s*\d{3,4}$/)) {
            return result;
        }

        const newResult = ENTimeExpressionParser.extractEndTimeComponent(result.clone(), match);
        return newResult ? newResult : result;
    }

    private static extractStartTimeComponent(result: ParsingResult, match: RegExpMatchArray) : ParsingResult | null {

        let hour = 0;
        let minute = 0;
        let meridiem = -1;

        // ----- Hours
        if (match[HOUR_GROUP].toLowerCase() == "noon"){
            meridiem = 1;
            hour = 12;
        } else if (match[HOUR_GROUP].toLowerCase() == "midnight") {
            meridiem = 0;
            hour = 0;
        } else {
            hour = parseInt(match[HOUR_GROUP]);
        }

        // ----- Minutes
        if(match[MINUTE_GROUP] != null){
            minute = parseInt(match[MINUTE_GROUP]);
        } else if(hour > 100) {
            minute = hour%100;
            hour   = Math.floor(hour/100);
        }

        if(minute >= 60 || hour > 24) {
            return null;
        }

        if (hour >= 12) {
            meridiem = 1;
        }

        // ----- AM & PM
        if(match[AM_PM_HOUR_GROUP] != null) {
            if(hour > 12) return null;
            var ampm = match[AM_PM_HOUR_GROUP][0].toLowerCase();
            if(ampm == "a"){
                meridiem = 0;
                if(hour == 12) hour = 0;
            }

            if(ampm == "p"){
                meridiem = 1;
                if(hour != 12) hour += 12;
            }
        }

        result.start.assign('hour', hour);
        result.start.assign('minute', minute);

        if (meridiem >= 0) {
            result.start.assign('meridiem', meridiem);
        } else {
            if (hour < 12) {
                result.start.imply('meridiem', 0);
            } else {
                result.start.imply('meridiem', 1);
            }
        }

        // ----- Millisecond
        if(match[MILLI_SECOND_GROUP] != null) {
            const millisecond = parseInt(match[MILLI_SECOND_GROUP].substring(0, 3));
            if(millisecond >= 1000) return null;

            result.start.assign('millisecond', millisecond);
        }

        // ----- Second
        if(match[SECOND_GROUP] != null){
            var second = parseInt(match[SECOND_GROUP]);
            if(second >= 60) return null;

            result.start.assign('second', second);
        }

        return result;
    }

    private static extractEndTimeComponent(result: ParsingResult, match: RegExpMatchArray) : ParsingResult | null {

        result.end = result.start.clone();

        // ----- Millisecond
        if(match[MILLI_SECOND_GROUP] != null){
            var millisecond = parseInt(match[MILLI_SECOND_GROUP].substring(0, 3));
            if(millisecond >= 1000) return null;

            result.end.assign('millisecond', millisecond);
        }

        // ----- Second
        if(match[SECOND_GROUP] != null){
            var second = parseInt(match[SECOND_GROUP]);
            if(second >= 60) return null;

            result.end.assign('second', second);
        }


        let hour = parseInt(match[HOUR_GROUP]);
        let minute = 0;
        let meridiem = -1;

        // ----- Minute
        if (match[MINUTE_GROUP] != null) {

            minute = parseInt(match[MINUTE_GROUP]);

        } else if (hour > 100) {

            minute = hour%100;
            hour   = Math.floor(hour/100);
        }

        if(minute >= 60 || hour > 24) {
            return null;
        }

        if (hour >= 12) {
            meridiem = 1;
        }

        // ----- AM & PM
        if (match[AM_PM_HOUR_GROUP] != null) {
            if (hour > 12) {
                return null;
            }

            var ampm = match[AM_PM_HOUR_GROUP][0].toLowerCase();
            if(ampm == "a"){
                meridiem = 0;
                if(hour == 12) {
                    hour = 0;
                    if (!result.end.isCertain('day')) {
                        result.end.imply('day', result.end.get('day') + 1);
                    }
                }
            }

            if(ampm == "p"){
                meridiem = 1;
                if(hour != 12) hour += 12;
            }

            if (!result.start.isCertain('meridiem')) {
                if (meridiem == 0) {

                    result.start.imply('meridiem', 0);

                    if (result.start.get('hour') == 12) {
                        result.start.assign('hour', 0);
                    }

                } else {

                    result.start.imply('meridiem', 1);

                    if (result.start.get('hour') != 12) {
                        result.start.assign('hour', result.start.get('hour') + 12);
                    }
                }
            }
        }

        result.text = result.text + match[0];
        result.end.assign('hour', hour);
        result.end.assign('minute', minute);

        if (meridiem >= 0) {
            result.end.assign('meridiem', meridiem);
        } else {
            var startAtPM = result.start.isCertain('meridiem') && result.start.get('meridiem') == 1;
            if (startAtPM && result.start.get('hour') > hour) {
                // 10pm - 1 (am)
                result.end.imply('meridiem', 0);

            } else if (hour > 12) {
                result.end.imply('meridiem', 1);
            }
        }

        if (result.end.date().getTime() < result.start.date().getTime()) {
            result.end.imply('day', result.end.get('day') + 1)
        }

        return result;
    }
}