"use client";

import React from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '../lib/cn';

export interface AyahQuoteProps {
  /** Arabic text of the ayah */
  arabic: string;
  /** English translation */
  translation: string;
  /** Source reference (e.g., "Al-Baqarah 2:255") */
  source: string;
  /** Optional transliteration */
  transliteration?: string;
  /** Custom className */
  className?: string;
  /** Show copy button */
  showCopy?: boolean;
}

export function AyahQuote({
  arabic,
  translation,
  source,
  transliteration,
  className,
  showCopy = true,
}: AyahQuoteProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    const textToCopy = `${arabic}\n\n${translation}\n\n— ${source}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-xl bg-accent-soft/30 p-lg shadow-soft',
        'before:absolute before:inset-x-0 before:top-0 before:h-px',
        'before:bg-gradient-to-r before:from-transparent before:via-accent/30 before:to-transparent',
        className
      )}
    >
      {/* Copy button */}
      {showCopy && (
        <button
          onClick={handleCopy}
          className={cn(
            'absolute top-md right-md flex h-8 w-8 items-center justify-center',
            'rounded-md bg-card-bg/80 text-fg-muted transition-all duration-fast',
            'hover:bg-card-bg hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent/20'
          )}
          aria-label="Copy ayah"
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Arabic text */}
      <div
        className="mb-md text-xl font-medium leading-relaxed text-fg"
        lang="ar"
        dir="rtl"
      >
        {arabic}
      </div>

      {/* Transliteration */}
      {transliteration && (
        <div className="mb-sm text-sm italic text-fg-muted leading-normal">
          {transliteration}
        </div>
      )}

      {/* Translation */}
      <div className="mb-sm text-md text-fg leading-normal">
        {translation}
      </div>

      {/* Source */}
      <div className="text-sm font-medium text-date">
        — {source}
      </div>
    </div>
  );
}
