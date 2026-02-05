/**
 * Translation Constants
 * 
 * Centralized translation definitions used by commands and helpers.
 * 
 * @module helpers/translations
 */

/** @constant {string} Default Bible translation when none is specified */
const DEFAULT_TRANSLATION = 'ESV';

/**
 * Mapping of user-facing translation codes to api.bible Bible IDs.
 * 
 * IMPORTANT: Keep this list synchronized with the `translationChoices` array below.
 * 
 * @constant {Object.<string, string>}
 */
const API_BIBLE_BIBLES = {
	KJV: 'de4e12af7f28f599-01',
	NKJV: '63097d2a0a2f7db3-01',
	NASB: 'a761ca71e0b3ddcf-01',
	AMP: 'a81b73293d3080c9-01',
	NIV: '78a9f6124f344018-01',
	NLT: 'd6e14a625393b4da-01',
	CSB: 'a556c5305ee15c3f-01',
	ASV: '06125adad2d5898a-01',
	GNV: 'c315fa9f71d4af3a-01',
	MSG: '6f11a7de016f942e-01',
	GRCTR: '3aefb10641485092-01',
	RVR: '592420522e16049f-01',
	NVT: '41a6caa722a21d88-01',
	NTV: '826f63861180e056-01',
	DEUL: '926aa5efbc5e04e2-01',
	WLC: '2c500771ea16da93-01',
	FEB: '04fb2bec0d582d1f-01',
	TSI: '2dd568eeff29fb3c-02',
	VIE: '1b878de073afef07-01',
	CES: 'c61908161b077c4c-01',
	TKJV: '2eb94132ad61ae75-01',
	IRV: 'b35e70bce95d4261-01',
};

/**
 * Available Bible translations for the slash command.
 * 
 * @constant {Array<{name: string, value: string}>}
 */
const translationChoices = [
	{ name: 'ESV (English Standard Version) 🇬🇧', value: 'ESV' },
	{ name: 'NKJV (New King James Version) 🇬🇧', value: 'NKJV' },
	{ name: 'KJV (King James (Authorized) Version) 🇬🇧', value: 'KJV' },
	{ name: 'NASB (New American Standard Bible) 🇬🇧', value: 'NASB' },
	{ name: 'NIV (New Interational Version) 🇬🇧', value: 'NIV' },
	{ name: 'NLT (New Living Translation) 🇬🇧', value: 'NLT' },
	{ name: 'AMP (Amplified Bible) 🇬🇧', value: 'AMP' },
	{ name: 'CSB (Christian Standard Bible) 🇬🇧', value: 'CSB' },
	{ name: 'ASV (American Standard Version) 🇬🇧', value: 'ASV' },
	{ name: 'GNV (Geneva Bible) 🇬🇧', value: 'GNV' },
	{ name: 'MSG (The Message) 🇬🇧', value: 'MSG' },
	{ name: 'RVR (Reina Valera 1960) 🇪🇸', value: 'RVR' },
	{ name: 'NTV (Nueva Traducción Viviente) 🇪🇸', value: 'NTV' },
	{ name: 'NVT (Nova Versão Transformadora) 🇵🇹', value: 'NVT' },
	{ name: 'DEUL (Lutherbibel 1912) 🇩🇪', value: 'DEUL' },
	{ name: 'FEB (免费的易读圣经) 🇨🇳', value: 'FEB' },
	{ name: 'GRCTR (Greek Textus Receptus) 🇬🇷', value: 'GRCTR' },
	{ name: 'WLC (Westminster Leningrad Codex) 🇮🇱', value: 'WLC' },
	{ name: 'TSI (Plain Indonesian Translation) 🇮🇩', value: 'TSI' },
	{ name: 'VIE (Vietnamese Bible) 🇻🇳', value: 'VIE' },
	{ name: 'CES (Czech Kralická Bible) 🇨🇿', value: 'CES' },
	{ name: 'TKJV (Thai King James Version) 🇹🇭', value: 'TKJV' },
	{ name: 'IRV (Indian Revised Version) 🇮🇳', value: 'IRV' },
];

/**
 * Validates a translation code against supported options.
 * 
 * @param {string} translation - Translation code to validate
 * @returns {boolean} True if translation is supported
 */
function isValidTranslation(translation) {
	if (!translation) return false;
	if (translation === 'ESV') return true;
	return Boolean(API_BIBLE_BIBLES[translation]);
}

module.exports = {
	API_BIBLE_BIBLES,
	translationChoices,
	DEFAULT_TRANSLATION,
	isValidTranslation,
};
