"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRepeatedWords = findRepeatedWords;
var fs = require("fs");
var excludedWords = JSON.parse(fs.readFileSync('./src/excludeWords.json', 'utf-8'));
function findRepeatedWords(line) {
    var _a;
    var words = ((_a = line
        .toLowerCase()
        .match(/\b\w+\b/g)) === null || _a === void 0 ? void 0 : _a.filter(function (word) { return !excludedWords.includes(word); })) || [];
    var repeats = words.filter(function (word, index) { return words.indexOf(word) !== index; });
    return Array.from(new Set(repeats)); // Remove duplicates in result
}
