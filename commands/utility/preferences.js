/**
 * Preferences Command - Verse Display Settings
 * 
 * Allows users to configure how Bible verses are displayed, including
 * footnotes, headings, verse numbers, and line-by-line formatting.
 * 
 * @module commands/utility/preferences
 */

const {
	SlashCommandBuilder,
	InteractionContextType,
	ApplicationIntegrationType,
	MessageFlags,
} = require('discord.js');

const {
	translationChoices,
	DEFAULT_TRANSLATION,
	isValidTranslation,
} = require('../../helpers/translations');

const {
	getPreferredTranslation,
	setPreferredTranslation,
	getVerseDisplayPreferences,
	setVerseDisplayPreferences,
	resetVerseDisplayPreferences,
} = require('../../helpers/user_preferences');

const DISPLAY_TOGGLE_CHOICES = [
	{ name: 'Auto', value: 'auto' },
	{ name: 'On', value: 'on' },
	{ name: 'Off', value: 'off' },
];

const data = new SlashCommandBuilder()
	.setName('preferences')
	.setDescription('Manage how Bible verses are displayed')
	.setIntegrationTypes([
		ApplicationIntegrationType.GuildInstall,
		ApplicationIntegrationType.UserInstall,
	])
	.setContexts([
		InteractionContextType.Guild,
		InteractionContextType.PrivateChannel,
		InteractionContextType.BotDM,
	])
	.addSubcommand((subcommand) =>
		subcommand
			.setName('set')
			.setDescription('Update your verse display preferences')
			.addBooleanOption((option) =>
				option
					.setName('footnotes')
					.setDescription('Show footnotes and study notes'),
			)
			.addStringOption((option) =>
				option
					.setName('translation')
					.setDescription('Preferred Bible translation')
					.addChoices(...translationChoices),
			)
			.addStringOption((option) =>
				option
					.setName('headings')
					.setDescription('Show section headings')
					.addChoices(...DISPLAY_TOGGLE_CHOICES),
			)
			.addBooleanOption((option) =>
				option
					.setName('verse_numbers')
					.setDescription('Show verse numbers'),
			)
			.addStringOption((option) =>
				option
					.setName('line_by_line')
					.setDescription('Format poetry/psalms line by line')
					.addChoices(...DISPLAY_TOGGLE_CHOICES),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('view')
			.setDescription('View your current verse display preferences'),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('reset')
			.setDescription('Reset verse display preferences to defaults'),
	);

function formatToggle(value) {
	if (value === 'on') return 'On';
	if (value === 'off') return 'Off';
	return 'Auto';
}

function formatPreferences(preferences) {
	return [
		`Footnotes: **${preferences.footnotes ? 'On' : 'Off'}**`,
		`Headings: **${formatToggle(preferences.headings)}**`,
		`Verse numbers: **${preferences.verseNumbers ? 'On' : 'Off'}**`,
		`Line by line: **${formatToggle(preferences.lineByLine)}**`,
	].join('\n');
}

/**
 * Execute the preferences command.
 * 
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function execute(interaction) {
	const subcommand = interaction.options.getSubcommand(false);

	if (subcommand === 'set') {
		const footnotes = interaction.options.getBoolean('footnotes');
		const translation = interaction.options.getString('translation');
		const headings = interaction.options.getString('headings');
		const verseNumbers = interaction.options.getBoolean('verse_numbers');
		const lineByLine = interaction.options.getString('line_by_line');

		const hasAnyUpdate =
			typeof footnotes === 'boolean' ||
			typeof translation === 'string' ||
			typeof headings === 'string' ||
			typeof verseNumbers === 'boolean' ||
			typeof lineByLine === 'string';

		if (!hasAnyUpdate) {
			return interaction.reply({
				content: 'Choose at least one preference to update.',
				flags: MessageFlags.Ephemeral,
			});
		}

		try {
			if (translation) {
				if (!isValidTranslation(translation)) {
					return interaction.reply({
						content: 'Unsupported translation selected. Please choose a valid option.',
						flags: MessageFlags.Ephemeral,
					});
				}
				await setPreferredTranslation(interaction.user.id, translation);
			}

			await setVerseDisplayPreferences(interaction.user.id, {
				footnotes,
				headings,
				verseNumbers,
				lineByLine,
			});

			const updated = await getVerseDisplayPreferences(interaction.user.id);
			const preferred = await getPreferredTranslation(interaction.user.id);
			const activeTranslation = isValidTranslation(preferred)
				? preferred
				: DEFAULT_TRANSLATION;
			return interaction.reply({
				content: `Your preferences have been updated:\nTranslation: **${activeTranslation}**\n${formatPreferences(updated)}`,
				flags: MessageFlags.Ephemeral,
			});
		} catch (error) {
			console.error('[ERROR] Failed to save verse display preferences:', error);
			return interaction.reply({
				content: 'There was an error saving your preferences. Please try again later.',
				flags: MessageFlags.Ephemeral,
			});
		}
	}

	if (subcommand === 'view') {
		try {
			const preferences = await getVerseDisplayPreferences(interaction.user.id);
			const preferred = await getPreferredTranslation(interaction.user.id);
			const activeTranslation = isValidTranslation(preferred)
				? preferred
				: DEFAULT_TRANSLATION;
			return interaction.reply({
				content: `Your current preferences:\nTranslation: **${activeTranslation}**\n${formatPreferences(preferences)}`,
				flags: MessageFlags.Ephemeral,
			});
		} catch (error) {
			console.error('[ERROR] Failed to load verse display preferences:', error);
			return interaction.reply({
				content: 'There was an error loading your preferences. Please try again later.',
				flags: MessageFlags.Ephemeral,
			});
		}
	}

	if (subcommand === 'reset') {
		try {
			await resetVerseDisplayPreferences(interaction.user.id);
			const preferences = await getVerseDisplayPreferences(interaction.user.id);
			const preferred = await getPreferredTranslation(interaction.user.id);
			const activeTranslation = isValidTranslation(preferred)
				? preferred
				: DEFAULT_TRANSLATION;
			return interaction.reply({
				content: `Your preferences have been reset:\nTranslation: **${activeTranslation}**\n${formatPreferences(preferences)}`,
				flags: MessageFlags.Ephemeral,
			});
		} catch (error) {
			console.error('[ERROR] Failed to reset verse display preferences:', error);
			return interaction.reply({
				content: 'There was an error resetting your preferences. Please try again later.',
				flags: MessageFlags.Ephemeral,
			});
		}
	}

	return interaction.reply({
		content: 'Please choose a subcommand: set, view, or reset.',
		flags: MessageFlags.Ephemeral,
	});
}

module.exports = { data, execute };
