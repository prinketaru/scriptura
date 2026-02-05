/**
 * Daily Verse Helper
 * 
 * Provides utilities to retrieve the daily verse reference from a JSON list.
 * The selection is deterministic based on day-of-year.
 * 
 * @module helpers/daily_verse
 */

const fs = require('node:fs');
const path = require('node:path');

const DAILY_VERSES_PATH = path.join(__dirname, '..', 'daily_verses.json'); 

let cachedVerses;

/**
 * Loads daily verses from the JSON file (cached after first load).
 * 
 * @returns {string[]} Array of verse references
 */
function loadDailyVerses() {
	if (cachedVerses) return cachedVerses;

	const raw = fs.readFileSync(DAILY_VERSES_PATH, 'utf-8');
	const data = JSON.parse(raw);
	const verses = Array.isArray(data?.daily_bible_verses)
		? data.daily_bible_verses
		: [];

	if (verses.length === 0) {
		throw new Error('daily_verses.json does not contain any verses.');
	}

	cachedVerses = verses;
	return cachedVerses;
}

/**
 * Computes the day-of-year (0-based) in UTC.
 * 
 * @param {Date} date - Date instance
 * @returns {number} Day-of-year index (0-365)
 */
function getUtcDayOfYear(date) {
	const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
	const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
	return Math.floor((current - startOfYear) / 86400000);
}

/**
 * Returns the daily verse reference for a given date.
 * 
 * Selection is deterministic and cycles through the list annually.
 * 
 * @param {Date} [date=new Date()] - Date to compute daily verse for
 * @returns {string} Verse reference (e.g., "John 3:16")
 */
function getDailyVerseReference(date = new Date()) {
	const verses = loadDailyVerses();
	const dayIndex = getUtcDayOfYear(date);
	return verses[dayIndex % verses.length];
}

module.exports = {
	getDailyVerseReference,
};
