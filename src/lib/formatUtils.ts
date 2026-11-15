/**
 * Maria AI by Zan.dev - Text Formatting Utilities
 * Automatically handles WhatsApp / Markdown formatting:
 * - `*test*` or `**test**` -> bold
 * - `~test~` or `~~test~~` -> strikethrough
 * - `_test_` -> italic
 * - `test` -> inline code
 * - ```code``` -> code block
 */

export function sanitizeModelText(raw: string): string {
  if (!raw) return '';

  let cleaned = raw
    // Remove closed XML-style thought blocks
    .replace(/<(?:thought|thinking)>[\s\S]*?<\/(?:thought|thinking)>\s*/gi, '')
    // Remove trailing/unclosed XML-style thought block while streaming
    .replace(/<(?:thought|thinking)>[\s\S]*$/gi, '');

  const trimmed = cleaned.trimStart();
  const startsWithLeak = /^(?:THINK\b|Thought\s*:|Thinking(?:\s+Process)?\s*:)/i.test(trimmed);

  if (startsWithLeak) {
    // Pattern 1: Model emitted "THINK ... Self-correction: ... ., <Actual Answer>"
    const selfCorrCommaTransition = trimmed.match(
      /^[\s\S]*?\*{0,2}Self-correction:?\*{0,2}[\s\S]*?[.!?]\s*,\s+([\s\S]+)$/i
    );
    if (selfCorrCommaTransition && selfCorrCommaTransition[1]) {
      cleaned = selfCorrCommaTransition[1];
    } else {
      // Pattern 2: Model emitted "THINK ... ., <Actual Answer>" without Self-correction label
      const genericCommaTransition = trimmed.match(
        /^(?:THINK\b|Thought\s*:|Thinking(?:\s+Process)?\s*:)[\s\S]*?[.!?]\s*,\s+([\s\S]+)$/i
      );
      if (genericCommaTransition && genericCommaTransition[1]) {
        cleaned = genericCommaTransition[1];
      } else {
        // Pattern 3: Paragraph-based transition after THINK / numbered steps / Self-correction
        const paragraphs = trimmed.split(/\n{2,}/);
        const isCotParagraph = (p: string): boolean => {
          const s = p.trim();
          if (!s) return true;
          if (/^(?:THINK\b|Thought\s*:|Thinking(?:\s+Process)?\s*:|\*{0,2}Self-correction:?\*{0,2})/i.test(s)) {
            return true;
          }
          if (/^(?:\d+\.\s+\*{0,2}[A-Z][A-Za-z /-]{2,}\*{0,2}\s*:|[-*]\s+\*{0,2}(?:Acknowledge|State|Perform|Summarize|Connect|Verify|Check|Respond|Focus|Avoid|Tone|Goal|Plan|Step)\b)/i.test(s)) {
            return true;
          }
          if (/^(?:The user is|I need to|I should|I will|Let me|Let's|Wait,|Actually,|Avoid definitive|Instead, focus)/i.test(s)) {
            return true;
          }
          return false;
        };

        let firstRealIdx = 0;
        while (firstRealIdx < paragraphs.length && isCotParagraph(paragraphs[firstRealIdx])) {
          firstRealIdx++;
        }

        cleaned =
          firstRealIdx < paragraphs.length
            ? paragraphs.slice(firstRealIdx).join('\n\n')
            : '';
      }
    }
  }

  // Remove simulated web search stage-direction lines
  cleaned = cleaned
    .replace(
      /^\s*\*{0,3}\((?:Melakukan pencarian web|Mencari di web|Menelusuri web|Searching the web|Performing web search)\.{0,3}\)\*{0,3}\s*$/gim,
      ''
    )
    .replace(/\n{3,}/g, '\n\n')
    .trimStart();

  return cleaned;
}

export function autoFormatMarkdown(raw: string): string {
  if (!raw) return '';

  // 1. Temporarily extract and protect code blocks & inline code from syntax collision
  const codeSnippets: string[] = [];
  let formatted = raw.replace(/(```[\s\S]*?```|`[^`\r\n]+`)/g, (match) => {
    codeSnippets.push(match);
    return `__MD_CODE_SNIPPET_${codeSnippets.length - 1}__`;
  });

  // 2. Convert ~word~ to ~~word~~ for strikethrough (if not already ~~)
  formatted = formatted.replace(/(?<!~)(~)([^~\r\n]+?)(~)(?!~)/g, '~~$2~~');

  // 3. Convert single asterisk *word* (WhatsApp style bold) to **word**
  // Must avoid breaking:
  // - Double asterisks like **bold**
  // - Markdown unordered list bullet at start of line like `* item` or `  * item`
  // - Space immediately after opening * or before closing *
  formatted = formatted.replace(/(^|[^\w*])\*([^\s*](?:[^*]*?[^\s*])?)\*(?!\*|\w)/gm, '$1**$2**');

  // 4. Restore preserved code snippets untouched
  formatted = formatted.replace(/__MD_CODE_SNIPPET_(\d+)__/g, (_, index) => {
    return codeSnippets[Number(index)] ?? '';
  });

  return formatted;
}

/**
 * Checks if the text has active formatting syntax
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


