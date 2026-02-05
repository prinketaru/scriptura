# Scriptura - Quick Reference Guide

## Project Overview

**Scriptura** is a Discord bot providing Bible verse retrieval with 23+ translations and intelligent search capabilities.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Add your API keys to .env

# Deploy commands to Discord
npm run deploy

# Start the bot
npm start
```

## File Structure

```
scriptura/
├── commands/              # Discord slash commands
│   ├── utility/
│   │   └── ping.js       # Bot latency check
│   └── verses/
│       └── verse.js      # Bible verse retrieval
├── helpers/              # Shared utilities
│   ├── apibible_request.js    # api.bible client (23+ translations)
│   ├── esv_api_request.js     # ESV API client
│   └── verse_embed.js         # Embed formatting
├── index.js              # Main bot entry point
├── deploy-commands.js    # Command deployment script
├── package.json          # Dependencies & scripts
├── eslint.config.js      # Code style rules
└── .env.example          # Environment template
```

## Available Scripts

```bash
npm start         # Start the bot
npm run dev       # Start with auto-reload (Node 18+)
npm run deploy    # Register commands with Discord
npm run lint      # Check code style
npm run lint:fix  # Auto-fix style issues
```

## Common Tasks

### Adding a New Command

1. Create `commands/<category>/<name>.js`
2. Export `data` (SlashCommandBuilder) and `execute` function
3. Add JSDoc documentation
4. Run `npm run deploy`
5. Test in Discord

Template:
```javascript
/**
 * Command Description
 * @module commands/category/name
 */

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('command-name')
	.setDescription('Description here');

/**
 * Execute the command.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function execute(interaction) {
	await interaction.reply('Response here');
}

module.exports = { data, execute };
```

### Adding a Bible Translation

1. Get Bible ID from https://scripture.api.bible
2. Add to `API_BIBLE_BIBLES` in `commands/verses/verse.js`
3. Add to `translationChoices` array
4. Run `npm run deploy`
5. Test: `/verse search John 3:16 <YOUR_TRANSLATION>`

### Debugging

```javascript
// Enable verbose logging
console.log('[DEBUG]', data);

// Check API responses
console.log('[API Response]', JSON.stringify(response, null, 2));

// Test error paths
throw new Error('Test error message');
```

## Key Concepts

### Command Structure

Every command must export:
- `data`: SlashCommandBuilder instance
- `execute`: async function accepting interaction

### Error Handling

Always use ephemeral replies for errors:
```javascript
await interaction.reply({
	content: 'Error message',
	flags: MessageFlags.Ephemeral,
});
```

### API Clients

**ESV API** (esv_api_request.js):
- Used only for ESV translation
- `esvPassageRequest(verse)` - Get passage
- `esvSearchRequest(text, options)` - Search

**api.bible** (apibible_request.js):
- Used for all other translations
- `apiBibleResolveQuery(bibleId, query)` - Smart lookup
- `apiBibleSearch(bibleId, query, options)` - Search
- `apiBibleGetPassage(bibleId, passageId)` - Get passage

### Embed Formatting

```javascript
const verseEmbed = require('../helpers/verse_embed.js');

const embed = await verseEmbed(
	verseText,      // Verse content
	'John 3:16',    // Reference
	'ESV'           // Translation
);

await interaction.reply({ embeds: [embed] });
```

## Code Style Guidelines

- **Indentation**: Tabs (not spaces)
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Naming**: camelCase for variables/functions
- **Documentation**: JSDoc for all functions
- **Comments**: Explain "why", not "what"

### JSDoc Template

```javascript
/**
 * Function description.
 * 
 * Additional details about behavior, edge cases, etc.
 * 
 * @param {Type} paramName - Parameter description
 * @param {Object} [options={}] - Optional parameter
 * @param {string} [options.key] - Nested option
 * @returns {ReturnType} Description of return value
 * @throws {Error} When and why errors are thrown
 * 
 * @example
 * const result = functionName('value');
 * console.log(result); // expected output
 */
function functionName(paramName, options = {}) {
	// Implementation
}
```

## Testing Checklist

Before committing:
- [ ] Run `npm run lint` (no errors)
- [ ] Test command in Discord
- [ ] Test error cases
- [ ] Check ephemeral replies work
- [ ] Verify pagination (if applicable)
- [ ] Test multiple translations
- [ ] Check console for errors

## Troubleshooting

### "Commands not showing in Discord"
```bash
npm run deploy
# Wait 5-10 seconds, then restart Discord
```

### "Missing API key" error
Check `.env` file has all required keys:
- TOKEN
- CLIENT_ID
- ESV_API_KEY
- API_BIBLE_KEY

### "Cannot find module" error
```bash
npm install
```

### ESLint errors
```bash
npm run lint:fix
```

### Bot won't start
```bash
# Check Node version (requires 16.11.0+)
node --version

# Check for syntax errors
npm run lint
```

## Useful Resources

- **Discord.js Docs**: https://discord.js.org/
- **ESV API**: https://api.esv.org/docs/
- **api.bible Docs**: https://docs.api.bible/
- **Discord Developer Portal**: https://discord.com/developers/applications
- **Project Repository**: https://github.com/prinketaru/scriptura
- **Website**: https://scriptura.prinke.dev

## API Limits

### ESV API
- Rate limit: 5,000 requests/day
- No authentication required for low usage

### api.bible
- Rate limit: Varies by plan (check your dashboard)
- Free tier available

### Discord
- Slash command response: 3 seconds
- Follow-up time: 15 minutes
- Message length: 2,000 characters
- Embed description: 4,096 characters

## Best Practices

1. **Always defer if operation > 2 seconds**
   ```javascript
   await interaction.deferReply();
   // ... long operation ...
   await interaction.editReply({ content: 'Done!' });
   ```

2. **Use ephemeral for errors and private info**
   ```javascript
   flags: MessageFlags.Ephemeral
   ```

3. **Validate input before API calls**
   ```javascript
   if (!query || query.trim().length === 0) {
       return interaction.reply({ content: 'Query required', flags: MessageFlags.Ephemeral });
   }
   ```

4. **Handle all errors gracefully**
   ```javascript
   try {
       // API call
   } catch (error) {
       console.error('[ERROR]', error);
       return interaction.reply({ content: 'Something went wrong', flags: MessageFlags.Ephemeral });
   }
   ```

5. **Log important events**
   ```javascript
   console.log('[SUCCESS] Command executed:', commandName);
   console.error('[ERROR] Failed to fetch:', error.message);
   ```

## Performance Tips

- Use pagination for large result sets
- Implement timeouts for API calls (already done)
- Cache frequently accessed verses (future enhancement)
- Batch command deployments
- Use button collectors with timeouts

## Security Checklist

- [ ] Never log API keys
- [ ] Never commit `.env` file
- [ ] Use environment variables in production
- [ ] Validate all user input
- [ ] Use ephemeral replies for errors
- [ ] Sanitize user queries before API calls
- [ ] Keep dependencies updated
- [ ] Review Discord permissions regularly

## Getting Help

1. Check `API.md` for technical details
2. Check `CONTRIBUTING.md` for contribution guidelines
3. Search existing GitHub issues
4. Create new issue with reproduction steps
5. Join the support Discord (if available)

---

**Last Updated**: February 2026  
**Version**: 1.0.0
