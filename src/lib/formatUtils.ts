/**
 * Maria AI by Zan.dev - Text Formatting Utilities
 * Automatically handles WhatsApp / Markdown formatting:
 * - `*test*` or `**test**` -> bold
 * - `~test~` or `~~test~~` -> strikethrough
 * - `_test_` -> italic
 * - `test` -> inline code
 * - ```code``` -> code block
 */

const COT_INDICATOR_REGEX =
  /\b(?:THINK\b|Thought\s*:|Thinking\s+Process|Self-correction|Mode\s+Jawaban\s+Cepat|PRIORITAS\s+UTAMA|asking\s+them\s+to|the\s+user\s+(?:is\s+(?:asking|sending|expressing|uploading|trying)|wants|needs)|I\s+need\s+to|I\s+should|I\s+will|Keep\s+it\s+concise|Acknowledge|State\s+my\s+capability|Perform\s+a\s+quick|Summarize\s+findings|Connect\s+back)/i;

const isCotLineOrParagraph = (p: string): boolean => {
  const s = p.trim();
  if (!s) return true;
  if (/^(?:THINK\b|Thought\s*:|Thinking(?:\s+Process)?\s*:|\*{0,2}Self-correction:?\*{0,2})/i.test(s)) {
    return true;
  }
  if (/^(?:\d+\.\s+\*{0,2}[A-Z][A-Za-z /-]{2,}\*{0,2}\s*:|(?:[-*•])\s+\*{0,2}(?:Acknowledge|State|Perform|Summarize|Connect|Verify|Check|Respond|Focus|Avoid|Tone|Goal|Plan|Step|Keep\s+it|Be\s+concise|Use\s+|Include\s+|Address\s+|Ask\s+|Remember\s+))/i.test(s)) {
    return true;
  }
  if (/^(?:The user is|User is|They are|I need to|I should|I will|Let me|Let's|Wait,|Actually,|Avoid definitive|Instead, focus|asking them to|to help them|since the user)/i.test(s)) {
    return true;
  }
  if (/^\(?Mode Jawaban Cepat\s*:/i.test(s)) {
    return true;
  }
  return false;
};

export function sanitizeModelText(raw: string): string {
  if (!raw) return '';

  let cleaned = raw
    // Remove closed XML-style thought blocks
    .replace(/<(?:thought|thinking)>[\s\S]*?<\/(?:thought|thinking)>\s*/gi, '')
    // Remove trailing/unclosed XML-style thought block while streaming
    .replace(/<(?:thought|thinking)>[\s\S]*$/gi, '');

  const trimmed = cleaned.trimStart();

  // Detect any CoT leak at the start: classic THINK prefix, lowercase mid-thought fragment ending with ").", or meta-bullet
  const startsWithClassicLeak = /^(?:THINK\b|Thought\s*:|Thinking(?:\s+Process)?\s*:|\*{0,2}Self-correction:?\*{0,2})/i.test(trimmed);
  const startsWithMidThoughtFragment = /^[a-z][^\n]{3,320}\)\.\s*(?:\n|$|[A-Z•*-])/.test(trimmed);
  const startsWithMetaBullet = /^(?:[-*•]\s+(?:Keep\s+it|Acknowledge|State\s+my|Respond|Focus|Avoid|Tone|Goal|Plan|Remember|Make\s+sure|Asking|Ask\s+)|\d+\.\s+\*{0,2}(?:Acknowledge|State|Perform|Summarize|Connect|Verify|Check|Respond|Keep\s+it)\b)/i.test(trimmed);

  // Also detect glued CoT/prompt-echo boundary within the leading 3500 chars: e.g. "(Mode Jawaban Cepat: ...).Wadu" or "credible sources., Zan"
  const headWindow = trimmed.slice(0, 3500);
  let strippedViaBoundary = false;

  if (COT_INDICATOR_REGEX.test(headWindow)) {
    // 1. Check Self-correction ... ., <Answer>
    const selfCorrComma = headWindow.match(
      /^[\s\S]*?\*{0,2}Self-correction:?\*{0,2}[\s\S]*?[.!?]\s*,\s+([A-Z\u00C0-\u024F][\s\S]*)$/i
    );
    if (selfCorrComma && selfCorrComma[1]) {
      const offset = headWindow.length - selfCorrComma[1].length;
      cleaned = trimmed.slice(offset);
      strippedViaBoundary = true;
    }

    // 2. Check English CoT / "(Mode Jawaban Cepat: ...).<Answer>" glued right onto reply (zero spaces after ). or newline after ).)
    if (!strippedViaBoundary) {
      const parenPeriodGlued = headWindow.match(
        /^([\s\S]*?\))\.\s*(?=[A-Z\u00C0-\u024F])/
      );
      if (parenPeriodGlued && COT_INDICATOR_REGEX.test(parenPeriodGlued[1])) {
        // Find the LAST such ).<Capital> within the CoT prefix where text before it is English/meta CoT
        let candidateSlice = trimmed.slice(parenPeriodGlued[0].length);
        // Handle chained CoT bullets ending with ).<Capital>
        let guard = 0;
        while (guard < 5) {
          guard++;
          const nextTrim = candidateSlice.trimStart();
          const nextMatch = nextTrim.slice(0, 1200).match(/^([\s\S]*?\))\.\s*(?=[A-Z\u00C0-\u024F])/);
          if (
            nextMatch &&
            (isCotLineOrParagraph(nextMatch[1]) || COT_INDICATOR_REGEX.test(nextMatch[1])) &&
            !/^https?:\/\//i.test(nextMatch[1])
          ) {
            candidateSlice = nextTrim.slice(nextMatch[0].length);
          } else {
            break;
          }
        }
        cleaned = candidateSlice;
        strippedViaBoundary = true;
      }
    }

    // 3. Check classic THINK ... ., <Answer> comma transition
    if (!strippedViaBoundary && startsWithClassicLeak) {
      const genericComma = headWindow.match(
        /^(?:THINK\b|Thought\s*:|Thinking(?:\s+Process)?\s*:)[\s\S]*?[.!?]\s*,\s+([A-Z\u00C0-\u024F][\s\S]*)$/i
      );
      if (genericComma && genericComma[1]) {
        const offset = headWindow.length - genericComma[1].length;
        cleaned = trimmed.slice(offset);
        strippedViaBoundary = true;
      }
    }
  }

  // 4. Paragraph/line stripping if still starting with classic leak, mid-thought fragment, or meta-bullet
  if (
    !strippedViaBoundary &&
    (startsWithClassicLeak || startsWithMidThoughtFragment || startsWithMetaBullet)
  ) {
    const paragraphs = cleaned.trimStart().split(/\n{2,}/);
    let firstRealIdx = 0;
    while (
      firstRealIdx < paragraphs.length &&
      (isCotLineOrParagraph(paragraphs[firstRealIdx]) ||
        (firstRealIdx === 0 && startsWithMidThoughtFragment))
    ) {
      firstRealIdx++;
    }

    cleaned =
      firstRealIdx < paragraphs.length ? paragraphs.slice(firstRealIdx).join('\n\n') : '';
  }

  // Also strip any stray leading single line that is purely an English CoT meta-bullet or trailing ")." fragment
  const afterTrim = cleaned.trimStart();
  if (/^(?:[-*•]\s+Keep\s+it\s+concise[^\n]*|asking\s+them\s+to[^\n]*\)\.)\s*/i.test(afterTrim)) {
    cleaned = afterTrim.replace(
      /^(?:[-*•]\s+Keep\s+it\s+concise[^\n]*|asking\s+them\s+to[^\n]*\)\.)\s*/i,
      ''
    );
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


