const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const {
  esvPassageRequest,
  esvSearchRequest,
} = require("../../helpers/esv_api_request.js");
const verseEmbed = require("../../helpers/verse_embed.js");
const {
  apiBibleResolveQuery,
  apiBibleSearch,
} = require("../../helpers/apibible_request.js");

/**
 * Mapping of user-facing translation codes to api.bible Bible IDs.
 * Keep this list aligned with `translationChoices` below.
 */
const API_BIBLE_BIBLES = {
  KJV: "de4e12af7f28f599-01",
  NKJV: "63097d2a0a2f7db3-01",
  NASB: "a761ca71e0b3ddcf-01",
  AMP: "a81b73293d3080c9-01",
  NIV: "78a9f6124f344018-01",
  NLT: "d6e14a625393b4da-01",
  CSB: "a556c5305ee15c3f-01",
  ASV: "06125adad2d5898a-01",
  GNV: "c315fa9f71d4af3a-01",
  MSG: "6f11a7de016f942e-01",
  GRCTR: "3aefb10641485092-01",
  RVR: "592420522e16049f-01",
  NVT: "41a6caa722a21d88-01",
  NTV: "826f63861180e056-01",
  DEUL: "926aa5efbc5e04e2-01",
  WLC: "2c500771ea16da93-01",
  FEB: "04fb2bec0d582d1f-01",
  TSI: "2dd568eeff29fb3c-02",
  VIE: "1b878de073afef07-01",
  CES: "c61908161b077c4c-01",
  TKJV: "2eb94132ad61ae75-01",
  IRV: "b35e70bce95d4261-01",
};

const translationChoices = [
  { name: "ESV (English Standard Version) 🇬🇧", value: "ESV" },
  { name: "NKJV (New King James Version) 🇬🇧", value: "NKJV" },
  { name: "KJV (King James (Authorized) Version) 🇬🇧", value: "KJV" },
  { name: "NASB (New American Standard Bible) 🇬🇧", value: "NASB" },
  { name: "NIV (New Interational Version) 🇬🇧", value: "NIV" },
  { name: "NLT (New Living Translation) 🇬🇧", value: "NLT" },
  { name: "AMP (Amplified Bible) 🇬🇧", value: "AMP" },
  { name: "CSB (Christian Standard Bible) 🇬🇧", value: "CSB" },
  { name: "ASV (American Standard Version) 🇬🇧", value: "ASV" },
  { name: "GNV (Geneva Bible) 🇬🇧", value: "GNV" },
  { name: "MSG (The Message) 🇬🇧", value: "MSG" },
  { name: "RVR (Reina Valera 1960) 🇪🇸", value: "RVR" },
  { name: "NTV (Nueva Traducción Viviente) 🇪🇸", value: "NTV" },
  { name: "NVT (Nova Versão Transformadora) 🇵🇹", value: "NVT" },
  { name: "DEUL (Lutherbibel 1912) 🇩🇪", value: "DEUL" },
  { name: "FEB (免费的易读圣经) 🇨🇳", value: "FEB" },
  { name: "GRCTR (Greek Textus Receptus) 🇬🇷", value: "GRCTR" },
  { name: "WLC (Westminster Leningrad Codex) 🇮🇱", value: "WLC" },
  { name: "TSI (Plain Indonesian Translation) 🇮🇩", value: "TSI" },
  { name: "VIE (Vietnamese Bible) 🇻🇳", value: "VIE" },
  { name: "CES (Czech Kralická Bible) 🇨🇿", value: "CES" },
  { name: "TKJV (Thai King James Version) 🇹🇭", value: "TKJV" },
  { name: "IRV (Indian Revised Version) 🇮🇳", value: "IRV" },
];

const data = new SlashCommandBuilder()
  .setName("verse")
  .setDescription("Get Bible verses or search for phrases")
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
      .setName("search")
      .setDescription("Search for a verse or phrase")
      .addStringOption((option) =>
        option
          .setName("query")
          .setDescription(
            "A Bible reference (e.g., John 3:16) or a phrase (e.g., in love)",
          )
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("translation")
          .setDescription("Bible translation to use")
          .addChoices(...translationChoices)
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("daily").setDescription("Get the daily verse"),
  );

const DEFAULT_TRANSLATION = "ESV";
const MAX_SEARCH_FIELDS = 10;
const PAGINATION_TIMEOUT_MS = 2 * 60 * 1000;
const EPHEMERAL_REPLY = { flags: MessageFlags.Ephemeral };

/**
 * Reusable helper for ephemeral error replies.
 */

function buildErrorMessage(content, { query, translation, hint } = {}) {
  const details = [];
  if (query) details.push(`Query: ${query}`);
  if (translation) details.push(`Translation: ${translation}`);
  if (hint) details.push(hint);
  if (details.length === 0) return content;
  return `${content}\n-# ${details.join(" • ")}`;
}

function replyError(interaction, content, details) {
  return interaction.reply({
    content: buildErrorMessage(content, details),
    ...EPHEMERAL_REPLY,
  });
}

/**
 * Builds a compact embed for api.bible search results.
 */
function formatRange(start, count) {
  if (count === 0) return "0";
  return `${start + 1}-${start + count}`;
}

function buildSearchResultsEmbed(
  { query, verses, total },
  translation,
  page,
  pageSize,
  totalPages,
) {
  const start = page * pageSize;
  const pageVerses = verses;
  const embed = new EmbedBuilder()
    .setTitle(`Search results: "${query}"`)
    .setDescription(`Translation: **${translation}**`)
    .setFooter({
      text:
        typeof total === "number"
          ? `Page ${page + 1}/${totalPages} · Showing ${formatRange(start, pageVerses.length)} of ${total} results`
          : `Page ${page + 1}/${totalPages} · Showing ${formatRange(start, pageVerses.length)} results`,
    });

  for (const verse of pageVerses) {
    const value = (verse.text || "").trim();
    embed.addFields({
      name: verse.reference || "Result",
      value:
        value.length > 1024 ? value.slice(0, 1021) + "…" : value || "(no text)",
    });
  }

  return embed;
}

/**
 * Builds a compact embed for ESV search results.
 */
function buildEsvSearchResultsEmbed(
  { results, total },
  translation,
  query,
  page,
  pageSize,
  totalPages,
) {
  const start = page * pageSize;
  const pageResults = results || [];
  const embed = new EmbedBuilder()
    .setTitle(`Search results: "${query}"`)
    .setDescription(`Translation: **${translation}**`)
    .setFooter({
      text:
        typeof total === "number"
          ? `Page ${page + 1}/${totalPages} · Showing ${formatRange(start, pageResults.length)} of ${total} results`
          : `Page ${page + 1}/${totalPages} · Showing ${formatRange(start, pageResults.length)} results`,
    });

  for (const hit of pageResults) {
    const value = (hit.content || hit.text || "").trim();
    embed.addFields({
      name: hit.reference || "Result",
      value:
        value.length > 1024 ? value.slice(0, 1021) + "…" : value || "(no text)",
    });
  }

  return embed;
}

async function sendPaginatedSearch(interaction, { pageSize, fetchPage, errorDetails }) {
  let page = 0;
  let totalItems = null;
  let totalPages = 1;

  const prevId = `verse_prev_${interaction.id}`;
  const nextId = `verse_next_${interaction.id}`;

  const buildRow = () =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(prevId)
        .setLabel("Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(nextId)
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
    );

  const first = await fetchPage(0);
  if (first.error) {
    return replyError(
      interaction,
      "There was an error while executing this command!",
      errorDetails,
    );
  }

  if (!first.hasResults) {
    return replyError(interaction, "No results found.", errorDetails);
  }

  if (typeof first.totalItems === "number") {
    totalItems = first.totalItems;
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  }

  const message = await interaction.reply({
    embeds: [first.embed],
    components: totalPages > 1 ? [buildRow()] : [],
  });

  if (totalPages <= 1) return;

  const collector = message.createMessageComponentCollector({
    time: PAGINATION_TIMEOUT_MS,
    filter: (i) =>
      i.user.id === interaction.user.id && (i.customId === prevId || i.customId === nextId),
  });

  const updatePage = async (newPage, i) => {
    const res = await fetchPage(newPage);
    if (res.error) {
      await i.reply({
        content: buildErrorMessage(
          "There was an error while executing this command!",
          errorDetails,
        ),
        ...EPHEMERAL_REPLY,
      });
      return;
    }

    if (typeof res.totalItems === "number") {
      totalItems = res.totalItems;
      totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    }

    page = newPage;
    await i.update({
      embeds: [res.embed],
      components: [buildRow()],
    });
  };

  collector.on("collect", async (i) => {
    if (i.customId === prevId) {
      await updatePage(Math.max(0, page - 1), i);
    } else if (i.customId === nextId) {
      await updatePage(Math.min(totalPages - 1, page + 1), i);
    }
  });

  collector.on("end", async () => {
    if (totalPages <= 1) return;
    const row = buildRow();
    row.components.forEach((component) => component.setDisabled(true));
    await message.edit({ components: [row] });
  });
}

/**
 * Handles ESV passage-first flow with a search fallback.
 */
async function handleEsv(interaction, verseQuery, translation) {
  let passageResult;
  try {
    passageResult = await esvPassageRequest(verseQuery);
  } catch (error) {
    console.error("ESV passage request failed:", error);
    return replyError(
      interaction,
      "There was an error while executing this command!",
      { query: verseQuery, translation, hint: "ESV passage request failed." },
    );
  }

  if (passageResult?.passages && passageResult.passages.length > 0) {
    const embed = await verseEmbed(
      passageResult.passages[0],
      passageResult.passage_meta?.[0]?.canonical ?? verseQuery,
      translation,
    );

    return interaction.reply({ embeds: [embed] });
  }

  let searchResult;
  try {
    searchResult = await esvSearchRequest(verseQuery);
  } catch (error) {
    console.error("ESV search request failed:", error);
    return replyError(
      interaction,
      "There was an error while executing this command!",
      { query: verseQuery, translation, hint: "ESV search request failed." },
    );
  }

  if (!searchResult?.results || searchResult.results.length === 0) {
    return replyError(interaction, "No results found.", {
      query: verseQuery,
      translation,
    });
  }

  return sendPaginatedSearch(interaction, {
    pageSize: MAX_SEARCH_FIELDS,
    errorDetails: {
      query: verseQuery,
      translation,
      hint: "ESV search request failed.",
    },
    fetchPage: async (page) => {
      try {
        const pageNumber = page + 1;
        const res = await esvSearchRequest(verseQuery, {
          page: pageNumber,
          pageSize: MAX_SEARCH_FIELDS,
        });

        const totalItems =
          typeof res?.total_results === "number" ? res.total_results : null;
        const results = Array.isArray(res?.results) ? res.results : [];
        const totalPages =
          typeof totalItems === "number"
            ? Math.max(1, Math.ceil(totalItems / MAX_SEARCH_FIELDS))
            : 1;

        return {
          error: false,
          hasResults: results.length > 0,
          totalItems,
          embed: buildEsvSearchResultsEmbed(
            { results, total: totalItems },
            translation,
            verseQuery,
            page,
            MAX_SEARCH_FIELDS,
            totalPages,
          ),
        };
      } catch (error) {
        console.error("ESV search request failed:", error);
        return { error: true };
      }
    },
  });
}

/**
 * Handles api.bible passage and search flows for non-ESV translations.
 */
async function handleApiBible(interaction, verseQuery, translation) {
  const bibleId = API_BIBLE_BIBLES[translation];
  if (!bibleId) {
    return replyError(interaction, `Unsupported translation: ${translation}.`, {
      translation,
    });
  }

  const result = await apiBibleResolveQuery(bibleId, verseQuery);

  if (result?.error) {
    return replyError(
      interaction,
      "There was an error while executing this command!",
      { query: verseQuery, translation, hint: "api.bible request failed." },
    );
  }

  if (result.kind === "empty") {
    return replyError(interaction, "No results found.", {
      query: verseQuery,
      translation,
    });
  }

  if (result.kind === "passage") {
    if (!result.text) {
      return replyError(
        interaction,
        "Verse found, but could not parse passage content.",
        { query: verseQuery, translation, hint: "Try a different translation." },
      );
    }

    const embed = await verseEmbed(
      result.text,
      result.reference ?? verseQuery,
      translation,
    );
    return interaction.reply({ embeds: [embed] });
  }

  if (result.kind === "search") {
    return sendPaginatedSearch(interaction, {
      pageSize: MAX_SEARCH_FIELDS,
      errorDetails: {
        query: verseQuery,
        translation,
        hint: "api.bible search request failed.",
      },
      fetchPage: async (page) => {
        const offset = page * MAX_SEARCH_FIELDS;
        const res = await apiBibleSearch(bibleId, verseQuery, {
          limit: MAX_SEARCH_FIELDS,
          offset,
        });

        if (res.error) {
          return { error: true };
        }

        const data = res.data?.data;
        const verses = Array.isArray(data?.verses) ? data.verses : [];
        const totalItems = typeof data?.total === "number" ? data.total : null;
        const totalPages =
          typeof totalItems === "number"
            ? Math.max(1, Math.ceil(totalItems / MAX_SEARCH_FIELDS))
            : 1;

        return {
          error: false,
          hasResults: verses.length > 0,
          totalItems,
          embed: buildSearchResultsEmbed(
            {
              query: data?.query ?? verseQuery,
              verses: verses.map((v) => ({
                reference: v.reference,
                text: v.text,
              })),
              total: totalItems,
            },
            translation,
            page,
            MAX_SEARCH_FIELDS,
            totalPages,
          ),
        };
      },
    });
  }

  return replyError(interaction, "Unexpected response while searching.", {
    query: verseQuery,
    translation,
  });
}

/**
 * Entrypoint for the /verse command.
 */
async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand(false);
  if (!subcommand) {
    return replyError(
      interaction,
      "Please choose a subcommand: search or daily.",
      { hint: "Try /verse search with a reference or phrase." },
    );
  }

  if (subcommand === "daily") {
    return replyError(interaction, "Daily verse is not implemented yet.", {
      hint: "Use /verse search for now.",
    });
  }

  const verseQuery = interaction.options.getString("query");
  const translation =
    interaction.options.getString("translation") ?? DEFAULT_TRANSLATION;

  if (translation === "ESV") {
    return handleEsv(interaction, verseQuery, translation);
  }

  return handleApiBible(interaction, verseQuery, translation);
}

module.exports = { data, execute };
