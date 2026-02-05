/**
 * Verse Embed Builder
 * 
 * Utility for creating standardized Discord embeds for Bible verses.
 * Formats verses with proper truncation, timestamps, and external links.
 * 
 * @module helpers/verse_embed
 */

const { EmbedBuilder } = require('discord.js');

/**
 * Builds a Discord embed for displaying a Bible verse.
 * 
 * Features:
 * - Automatic text truncation at 4096 characters (Discord limit)
 * - Title with reference and translation
 * - Clickable link to BibleGateway for full context
 * - Timestamp for tracking when verse was retrieved
 * - Enhanced styling with color and footer
 * 
 * @param {string} verse - The verse text to display
 * @param {string} reference - Bible reference (e.g., "John 3:16", "Psalm 23:1-6")
 * @param {string} translation - Translation code (e.g., "ESV", "NIV", "KJV")
 * @returns {Promise<EmbedBuilder>} Configured Discord embed builder
 * 
 * @example
 * const embed = await verseEmbed(
 *   "For God so loved the world...",
 *   "John 3:16",
 *   "ESV"
 * );
 * await interaction.reply({ embeds: [embed] });
 */
async function verseEmbed(verse, reference, translation) {
	const description = typeof verse === 'string' ? verse : String(verse ?? '');
	
	// Discord embeds have a 4096 character limit for descriptions
	const trimmedDescription =
		description.length > 4096
			? `${description.slice(0, 4093)}...`
			: description;

	const embed = new EmbedBuilder()
		.setDescription(trimmedDescription)
		.setTitle(`${reference} (${translation})`)
		.setURL(
			`https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=${translation}`,
		)
		.setColor(0x2F5233)
		.setFooter({
			text: translation,
			iconURL: 'https://cdn.discordapp.com/attachments/1000000000000000000/1000000000000000000/bible_icon.png',
		})
		.setTimestamp();

	return embed;
}

module.exports = verseEmbed;
