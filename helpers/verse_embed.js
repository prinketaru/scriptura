const { EmbedBuilder } = require("discord.js");

/**
 * Builds a standard verse embed with a safe description length.
 */
async function verseEmbed(verse, reference, translation) {
  const description = typeof verse === "string" ? verse : String(verse ?? "");
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
    .setTimestamp();

  return embed;
}

module.exports = verseEmbed;
