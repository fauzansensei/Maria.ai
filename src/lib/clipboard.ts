/**
 * Safely copies text to the clipboard with a fallback for environments where
 * navigator.clipboard might fail (like unfocused iframes).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Modern clipboard API failed, trying fallback:', err);
    }
  }

  // Fallback: Create a temporary textarea element
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Ensure the textarea is not visible but part of the DOM
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}
