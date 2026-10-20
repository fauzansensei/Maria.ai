/**
 * Maria AI by Zan.dev - Text Formatting Utilities
 * Automatically handles WhatsApp / Markdown formatting:
 * - `*test*` or `**test**` -> bold
 * - `~test~` or `~~test~~` -> strikethrough
 * - `_test_` -> italic
 * - `test` -> inline code
 * - ```code``` -> code block
 */

export function autoFormatMarkdown(raw: string): string {
  if (!raw) return '';
  let formatted = raw;

  // 1. Convert ~word~ to ~~word~~ for strikethrough (if not already ~~)
  formatted = formatted.replace(/(?<!~)(~)([^~\r\n]+?)(~)(?!~)/g, '~~$2~~');

  // 2. Convert single asterisk *word* (WhatsApp style bold) to **word**
  // Must avoid breaking:
  // - Double asterisks like **bold**
  // - Markdown unordered list bullet at start of line like `* item` or `  * item`
  // - Space immediately after opening * or before closing *
  formatted = formatted.replace(/(^|[^\w*])\*([^\s*](?:[^*]*?[^\s*])?)\*(?!\*|\w)/gm, '$1**$2**');

  return formatted;
}

/**
 * Checks if the text has active formatting syntax to show auto-preview
 */
export function hasFormattingSyntax(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  return (
    /(?<!~)(~)([^~\r\n]+?)(~)(?!~)/.test(text) ||
    /(^|[^\w*])\*([^\s*](?:[^*]*?[^\s*])?)\*(?!\*|\w)/m.test(text) ||
    /`([^`]+)`/.test(text) ||
    /(^|[^\w_])_([^\s_](?:[^_]*?[^\s_])?)_(?!_|\w)/m.test(text)
  );
}
