import React, { useState, useEffect } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  onUpdate?: () => void;
  className?: string;
  renderMarkdown?: (content: string) => React.ReactNode;
}

export default function Typewriter({ 
  text, 
  speed = 15, 
  onComplete, 
  onUpdate,
  className = "",
  renderMarkdown
}: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayedText('');
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text.charAt(index));
        setIndex((prev) => prev + 1);
        if (onUpdate) onUpdate();
      }, speed);

      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, speed, onComplete, onUpdate]);

  return (
    <div className={className}>
      {renderMarkdown ? renderMarkdown(displayedText) : (
        <span className="whitespace-pre-wrap">{displayedText}</span>
      )}
      {index < text.length && (
        <span className="inline-block w-1.5 h-4 bg-brand-blue/40 ml-1 animate-pulse align-middle" />
      )}
    </div>
  );
}
