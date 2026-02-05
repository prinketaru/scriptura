/**
 * Ping Command - Bot Latency Check
 * 
 * A simple utility command that reports the bot's websocket latency.
 * Useful for checking if the bot is responsive and measuring connection quality.
 * 
 * @module commands/utility/ping
 */

const {
	SlashCommandBuilder,
	InteractionContextType,
	ApplicationIntegrationType,
	MessageFlags,
} = require('discord.js');

/**
 * Slash command definition for /ping
 * 
 * This command is available in all contexts:
 * - Guild (server) channels
 * - Private channels/DMs
 * - Bot DMs
 */
const data = new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Get the bot\'s latency')
	.setIntegrationTypes([
		ApplicationIntegrationType.GuildInstall,
		ApplicationIntegrationType.UserInstall,
	])
	.setContexts([
		InteractionContextType.Guild,
		InteractionContextType.PrivateChannel,
		InteractionContextType.BotDM,
	]);

/**
 * Execute the ping command.
 * 
 * Responds with "Pong!" and the current websocket ping time in milliseconds.
 * Lower values indicate better connection quality.
 * 
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function execute(interaction) {
	await interaction.reply({
		content: `Pong!\n-# ${interaction.client.ws.ping}ms`,
		flags: MessageFlags.Ephemeral,
	});
}

module.exports = { data, execute };
