/**
 * Exa.ai SDK for Google Apps Script
 * 
 * This SDK provides an easy way to interact with the Exa.ai API in Google Apps Script.
 * It follows a similar interface to the official exa-js npm package for consistency.
 * 
 * Before using:
 * 1. Get your API key from Exa.ai
 * 2. Store it in Google Apps Script's Script Properties with the key 'EXA_API_KEY'
 *    (File -> Project Settings -> Script Properties)
 * 
 * Basic usage:
 * ```javascript
 * function searchNews() {
 *   const exa = new Exa(PropertiesService.getScriptProperties().getProperty('EXA_API_KEY'));
 *   const results = exa.searchAndContents("AI news", { numResults: 5 });
 *   return results;
 * }
 * ```
 */

/**
 * Enhanced logging utility for debugging
 * @private
 */
const Logger = {
  enabled: false,
  setEnabled: function(state) { this.enabled = state; },
  log: function(label, data) {
    if (!this.enabled) return;
    
    if (typeof data === 'object') {
      // Handle circular references and format nested objects
      const seen = new Set();
      const formatted = JSON.stringify(data, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      }, 2);
      console.log(label + ':', formatted);
    } else {
      console.log(label + ':', data);
    }
  }
};

/**
 * Main Exa API client class
 */
class Exa {
  /**
   * Create a new Exa client
   * @param {string} apiKey - Your Exa.ai API key
   */
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.enableLogging = false;
  }

  /**
   * Enable or disable debug logging
   * @param {boolean} enabled - Whether to enable logging
   */
  setLogging(enabled) {
    this.enableLogging = enabled;
    Logger.setEnabled(enabled);
  }

  /**
   * Search and retrieve contents from Exa.ai
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @param {string} [options.type="neural"] - Search type: "neural" (uses AI embeddings), "keyword" (traditional search), or "auto"
   * @param {string} [options.category] - Filter by content category:
   *   - "company" - Company websites and profiles
   *   - "research_paper" - Academic and research papers
   *   - "news_article" - News articles
   *   - "pdf" - PDF documents
   *   - "github" - GitHub repositories
   *   - "tweet" - Twitter/X posts
   *   - "movie" - Movie-related content
   *   - "song" - Music-related content
   *   - "personal_site" - Personal websites
   * @param {boolean} [options.useAutoprompt=true] - Whether to optimize the query
   * @param {number} [options.numResults=10] - Number of results to return
   * @param {string} [options.livecrawl] - Crawl setting: "always" or "fallback"
   * @param {string[]} [options.includeDomains] - List of domains to include in search
   * @param {string[]} [options.excludeDomains] - List of domains to exclude from search
   * @param {string} [options.startPublishedDate] - Filter by publish date (ISO format)
   * @param {string} [options.endPublishedDate] - Filter by publish date (ISO format)
   * @param {string} [options.startCrawlDate] - Filter by crawl date (ISO format)
   * @param {string} [options.endCrawlDate] - Filter by crawl date (ISO format)
   * @param {Object} [options.text] - Text content options
   * @param {boolean} [options.text.includeHtmlTags] - Whether to include HTML in text
   * @param {number} [options.text.maxCharacters] - Maximum characters per result
   * @param {Object} [options.highlights] - Result highlighting options
   * @param {string} [options.highlights.query] - Custom query for highlights
   * @param {number} [options.highlights.numSentences] - Sentences per highlight
   * @param {number} [options.highlights.highlightsPerUrl] - Number of highlights per URL
   * @param {Object} [options.summary] - Summary options
   * @param {string} [options.summary.query] - Custom query for generating summary
   * @returns {Object} Search results with the following structure:
   * ```javascript
   * {
   *   requestId: string,
   *   resolvedSearchType: string,
   *   results: [{
   *     score: number,
   *     title: string,
   *     url: string,
   *     publishedDate: string,
   *     author: string,
   *     text: string,
   *     summary: string,
   *     highlights: string[],
   *     highlightScores: number[],
   *     image?: string
   *   }]
   * }
   * ```
   */
  searchAndContents(query, options = {}) {
    Logger.log('Query', query);

    const payload = {
      query,
      type: options.type || "neural",
      useAutoprompt: options.useAutoprompt !== undefined ? options.useAutoprompt : true,
      numResults: options.numResults || 10,
      ...options,
      contents: {
        text: options.text && {
          enabled: true,
          ...options.text
        },
        highlights: options.highlights,
        summary: options.summary
      }
    };

    Logger.log('Request payload', payload);

    const requestOptions = {
      method: 'post',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': this.apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch('https://api.exa.ai/search', requestOptions);
      const responseCode = response.getResponseCode();
      Logger.log('Response code', responseCode);

      if (responseCode !== 200) {
        throw new Error(`API returned status ${responseCode}: ${response.getContentText()}`);
      }

      const responseData = JSON.parse(response.getContentText());
      Logger.log('Response data', responseData);
      return responseData;
    } catch (error) {
      Logger.log('Error', error.message);
      throw error;
    }
  }
}

/**
 * Example of a complex search with all options
 * This searches for AI startups with specific filters and content processing
 */
function testExaSearch() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('EXA_API_KEY');
  const exa = new Exa(apiKey);
  exa.setLogging(true); // Enable debug logging

  return exa.searchAndContents(
    "startup that has developed a revolutionary natural language processing AI model",
    {
      type: "neural",               // Use neural search for better semantic understanding
      category: "company",          // Look for company-related content
      numResults: 20,               // Get 20 results
      useAutoprompt: true,         // Let Exa optimize the query
      livecrawl: "always",         // Always get fresh content
      
      // Date filters
      startPublishedDate: "2024-09-30T22:00:02.000Z",
      endPublishedDate: "2024-10-05T22:00:01.000Z",
      
      // Text content settings
      text: {
        includeHtmlTags: true,
        maxCharacters: 40
      },
      
      // Generate highlights focused on AI capabilities
      highlights: {
        query: "AI capabilities",
        numSentences: 1,
        highlightsPerUrl: 3
      },
      
      // Generate a summary focused on company description
      summary: {
        query: "What does this startup do?"
      }
    }
  );
}

/**
 * Example of a simple search
 * This searches for recent AI news articles
 */
function simpleSearch() {
  const exa = new Exa(PropertiesService.getScriptProperties().getProperty('EXA_API_KEY'));
  exa.setLogging(true);
  
  return exa.searchAndContents("AI news", {
    category: "news_article",    // Look for news articles
    numResults: 5               // Get 5 results
  });
}
