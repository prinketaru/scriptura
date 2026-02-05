# API Documentation

This document provides technical details about the internal APIs and architecture of Scriptura.

## Architecture Overview

Scriptura uses a modular architecture with the following components:

```
┌─────────────────┐
│  Discord User   │
└────────┬────────┘
         │ Slash Command
         ▼
┌─────────────────┐
│   index.js      │ ◄── Command Loader & Event Handler
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Command Module  │ ◄── /verse, /ping
└────────┬────────┘
         │
         ├─────────────┬─────────────┐
         ▼             ▼             ▼
    ┌────────┐  ┌──────────┐  ┌──────────┐
    │ ESV API│  │api.bible │  │  Embed   │
    │ Helper │  │  Helper  │  │  Builder │
    └────────┘  └──────────┘  └──────────┘
```

## Module Reference

### Core Modules

#### `index.js`
Main bot entry point. Handles:
- Discord client initialization
- Dynamic command loading from `commands/` directory
- Event routing for slash commands
- Error handling and logging

#### `deploy-commands.js`
Command registration script. Run this after:
- Adding new commands
- Modifying command definitions
- Changing command options/choices

Usage: `node deploy-commands.js`

---

## Commands

### `/verse search <query> [translation]`

Retrieves Bible verses or searches for phrases.

**Parameters:**
- `query` (string, required): Bible reference or search phrase
  - Examples: "John 3:16", "Psalm 23", "love your neighbor"
- `translation` (string, optional): Bible translation code
  - Default: ESV
  - Choices: See `translationChoices` in verse.js

**Behavior:**
1. Query is sent to appropriate API (ESV or api.bible)
2. API attempts direct passage lookup first
3. If no passage found, falls back to search
4. Results displayed with pagination if needed

**Response Types:**
- **Single Passage**: Embed with verse text
- **Search Results**: Paginated embeds with up to 10 results per page
- **No Results**: Ephemeral error message

### `/verse daily`

Get the daily verse (not yet implemented).

### `/ping`

Returns bot latency in milliseconds.

---

## Helper Modules

### `helpers/esv_api_request.js`

**Purpose:** Client for ESV Bible API

**Functions:**

#### `esvPassageRequest(verse)`
Fetches a Bible passage by reference.

- **Parameters:** 
  - `verse` (string): Bible reference
- **Returns:** Promise<Object> with passages array
- **Throws:** Error on timeout or API failure

#### `esvSearchRequest(text, options)`
Searches ESV Bible for phrase or reference.

- **Parameters:**
  - `text` (string): Search query
  - `options.page` (number): Page number (1-indexed)
  - `options.pageSize` (number): Results per page
- **Returns:** Promise<Object> with results array

**Configuration:**
- Timeout: 10 seconds
- API URL: https://api.esv.org/v3/
- Auth: Token-based (ESV_API_KEY env var)

---

### `helpers/apibible_request.js`

**Purpose:** Client for api.bible service

**Functions:**

#### `apiBibleSearch(bibleId, query, options)`
Searches within a specific Bible translation.

- **Parameters:**
  - `bibleId` (string): api.bible Bible ID
  - `query` (string): Search query
  - `options.sort` (string): 'relevance' or 'canonical'
  - `options.limit` (number): Max results
  - `options.offset` (number): Pagination offset
- **Returns:** Promise with search results or error object

#### `apiBibleGetPassage(bibleId, passageId, options)`
Fetches a specific passage by ID.

- **Parameters:**
  - `bibleId` (string): Bible ID
  - `passageId` (string): Passage ID from search
  - `options.contentType` (string): 'json', 'text', or 'html'
  - `options.includeVerseNumbers` (boolean): Show verse numbers
  - `options.includeTitles` (boolean): Show section headings
- **Returns:** Promise with passage content

#### `apiBibleResolveQuery(bibleId, query, options)`
Smart query resolver - determines if query is passage or search.

- **Parameters:**
  - `bibleId` (string): Bible ID
  - `query` (string): User query
- **Returns:** Promise with typed result:
  - `{ kind: 'passage', text, reference, ... }`
  - `{ kind: 'search', verses, total, ... }`
  - `{ kind: 'empty', query }`
  - `{ error: true, message, ... }`

#### `passageContentToText(content, options)`
Converts api.bible JSON content to plain text.

- **Parameters:**
  - `content` (Object): api.bible JSON structure
  - `options.lineByLine` (boolean): Format verses separately (for Psalms)
- **Returns:** Formatted string with verse numbers

**Configuration:**
- Timeout: 10 seconds
- API URL: https://rest.api.bible/v1
- Auth: API key header (API_BIBLE_KEY env var)

---

### `helpers/verse_embed.js`

**Purpose:** Creates standardized Discord embeds for verses

#### `verseEmbed(verse, reference, translation)`
Builds a Discord embed with verse content.

- **Parameters:**
  - `verse` (string): Verse text
  - `reference` (string): Bible reference
  - `translation` (string): Translation code
- **Returns:** Promise<EmbedBuilder>
- **Features:**
  - Auto-truncates at 4096 characters
  - Links to BibleGateway
  - Includes timestamp

---

## Translation Support

### ESV API
Used exclusively for ESV (English Standard Version).

**Features:**
- Direct passage lookup
- Advanced search capabilities
- Well-formatted text output

### api.bible
Used for all other translations (KJV, NIV, NLT, etc.).

**Supported Translations:** See `API_BIBLE_BIBLES` object in verse.js
- 20+ English translations
- Multiple languages (Spanish, Portuguese, German, Chinese, etc.)
- Ancient languages (Greek, Hebrew)

**Bible IDs:**
Each translation has a unique ID in format: `{hash}-{revision}`
Example: `de4e12af7f28f599-01` (KJV)

---

## Pagination System

For search results with more than 10 hits, pagination is implemented:

**Components:**
1. Previous/Next buttons using Discord components
2. Button collector with 2-minute timeout
3. Dynamic page fetching via callback
4. Auto-disable buttons at boundaries

**Button IDs:**
- `verse_prev_{interactionId}`: Previous page
- `verse_next_{interactionId}`: Next page

**Flow:**
1. Initial page loaded and displayed
2. Buttons attached if multiple pages exist
3. User clicks button → new page fetched
4. Embed updated with new content
5. Buttons update disabled state
6. After timeout → buttons permanently disabled

---

## Error Handling

All errors follow consistent patterns:

### User-Facing Errors
- Always ephemeral (private to user)
- Include contextual details in footer
- Provide helpful hints when possible

### Error Message Format
```
{main error message}
-# Query: {query} • Translation: {translation} • {hint}
```

### Internal Errors
- Logged to console with context
- Include stack traces for debugging
- Never expose API keys or sensitive data

### Error Types
1. **API Failures**: Network errors, timeouts, auth failures
2. **No Results**: Valid query but nothing found
3. **Invalid Input**: Missing parameters, malformed data
4. **Discord Errors**: Interaction timeout, permission issues

---

## Performance Considerations

### Timeouts
- API requests: 10 second timeout
- Pagination collectors: 2 minute timeout

### Rate Limiting
- Respects Discord's rate limits
- No built-in API rate limiting (APIs handle this)

### Caching
- No caching currently implemented
- Each request hits the API directly
- Consider adding Redis cache for popular verses

### Optimization Tips
1. Use `includeRaw: false` unless debugging
2. Limit search results to reasonable page sizes
3. Abort unused pagination collectors early
4. Consider debouncing rapid requests

---

## Environment Variables

Required for production:

```bash
TOKEN=discord_bot_token
CLIENT_ID=discord_application_id
ESV_API_KEY=esv_api_token
API_BIBLE_KEY=api_bible_key
```

**Security:**
- Never commit `.env` file
- Rotate keys if exposed
- Use environment secrets in production
- Restrict API key permissions

---

## Testing

### Manual Testing Checklist

**Commands:**
- [ ] `/ping` returns latency
- [ ] `/verse search John 3:16` returns passage
- [ ] `/verse search love NIV` returns search results
- [ ] Pagination works (test with common words)
- [ ] Error messages are helpful and ephemeral

**Edge Cases:**
- [ ] Very long passages (Psalm 119)
- [ ] Invalid references
- [ ] Special characters in queries
- [ ] Multiple languages
- [ ] Timeout handling

**Translations:**
- [ ] ESV passages work
- [ ] ESV search works
- [ ] api.bible passages work (test KJV, NIV)
- [ ] api.bible search works
- [ ] All 23 translations are accessible

---

## Deployment

### Local Development
```bash
npm install
cp .env.example .env
# Edit .env with your keys
node deploy-commands.js
node index.js
```

### Production Deployment
1. Use environment variables (not .env file)
2. Enable process manager (PM2, systemd)
3. Set up logging and monitoring
4. Configure auto-restart on crash
5. Use HTTPS for API calls (default)

### Docker Deployment
See `Dockerfile` in root directory.

```bash
docker build -t scriptura .
docker run -d --env-file .env scriptura
```

---

## Future Enhancements

### Planned Features
- Daily verse implementation
- Verse of the day by email/DM
- Verse comparison across translations
- Audio Bible support
- Study notes and commentaries

### Performance Improvements
- Redis caching layer
- Response compression
- Connection pooling
- Rate limit management

### Developer Experience
- Unit test suite
- Integration tests
- CI/CD pipeline
- Automated deployment

---

## Support & Contributing

See `CONTRIBUTING.md` for development guidelines.

For API issues:
- ESV API: https://api.esv.org/docs/
- api.bible: https://docs.api.bible/

Report bugs: https://github.com/prinketaru/scriptura/issues
