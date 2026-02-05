/**
 * CONTRIBUTING GUIDE
 * 
 * Thank you for contributing to Scriptura! This guide will help you get started.
 * 
 * ## Code of Conduct
 * 
 * Please be respectful and constructive in all interactions.
 * 
 * ## Development Setup
 * 
 * 1. Clone the repository
 * 2. Install dependencies: `npm install`
 * 3. Copy `.env.example` to `.env` and add your API keys
 * 4. Deploy commands: `node deploy-commands.js`
 * 5. Start the bot: `node index.js`
 * 
 * ## Required API Keys
 * 
 * - **TOKEN**: Discord bot token from https://discord.com/developers/applications
 * - **CLIENT_ID**: Discord application client ID
 * - **ESV_API_KEY**: ESV API key from https://api.esv.org/
 * - **API_BIBLE_KEY**: api.bible key from https://scripture.api.bible/
 * 
 * ## Code Style
 * 
 * - Use tabs for indentation
 * - Single quotes for strings
 * - Semicolons required
 * - Run `npm run lint` before committing
 * - Follow JSDoc conventions for documentation
 * 
 * ## Coding Standards
 * 
 * ### Documentation
 * - All functions should have JSDoc comments
 * - Include @param and @returns tags
 * - Add @example for complex functions
 * - Document module purpose at file top
 * 
 * ### Error Handling
 * - Always wrap API calls in try-catch
 * - Log errors with context for debugging
 * - Provide user-friendly error messages
 * - Use ephemeral replies for errors
 * 
 * ### Testing
 * - Test all commands before submitting PR
 * - Test with multiple translations
 * - Verify error handling paths
 * - Check pagination behavior
 * 
 * ## Adding New Features
 * 
 * ### Adding a Translation
 * 
 * 1. Get the Bible ID from api.bible
 * 2. Add to `API_BIBLE_BIBLES` in `commands/verses/verse.js`
 * 3. Add to `translationChoices` array
 * 4. Test thoroughly
 * 
 * ### Adding a Command
 * 
 * 1. Create file in `commands/<category>/<name>.js`
 * 2. Export `data` (SlashCommandBuilder) and `execute` function
 * 3. Add comprehensive documentation
 * 4. Run `node deploy-commands.js` to register
 * 5. Test in Discord
 * 
 * ## Pull Request Process
 * 
 * 1. Fork the repository
 * 2. Create a feature branch (`git checkout -b feature/amazing-feature`)
 * 3. Make your changes
 * 4. Lint your code (`npm run lint`)
 * 5. Commit with clear messages
 * 6. Push to your fork
 * 7. Open a Pull Request with description
 * 
 * ## Project Structure
 * 
 * ```
 * scriptura/
 * ├── commands/           # Discord slash commands
 * │   ├── utility/       # Utility commands (ping, etc.)
 * │   └── verses/        # Bible verse commands
 * ├── helpers/           # Shared utilities
 * │   ├── apibible_request.js    # api.bible client
 * │   ├── esv_api_request.js     # ESV API client
 * │   └── verse_embed.js         # Embed builder
 * ├── index.js           # Main bot entry point
 * ├── deploy-commands.js # Command registration script
 * └── package.json       # Dependencies
 * ```
 * 
 * ## Getting Help
 * 
 * - Open an issue for bugs or feature requests
 * - Check existing issues before creating new ones
 * - Provide detailed information and reproduction steps
 * 
 * ## License
 * 
 * By contributing, you agree that your contributions will be licensed
 * under the same license as the project.
 */
