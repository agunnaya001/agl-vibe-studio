import React, { useState, useEffect } from "react";

interface ImageWithFallbackProps {
  src?: any;
  alt?: any;
  className?: string;
  fallbackText?: string;
  gradientFrom?: string; // Hex color for fallback gradient start
  gradientTo?: string;   // Hex color for fallback gradient end
  referrerPolicy?: any;
  [key: string]: any;     // Support any other standard img element properties
}

export default function ImageWithFallback({
  src,
  alt,
  className = "",
  fallbackText = "AL",
  gradientFrom = "#1e1b4b", // Deep indigo-950
  gradientTo = "#09090b",   // Zinc-950
  referrerPolicy,
  ...props
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState<string | undefined>(src);
  const [hasError, setHasError] = useState<boolean>(false);

  // Sync state if src changes
  useEffect(() => {
    if (!src) {
      handleError();
    } else {
      setImgSrc(src);
      setHasError(false);
    }
  }, [src]);

  const handleError = () => {
    if (hasError) return; // Prevent infinite error loops
    setHasError(true);

    const text = (fallbackText || alt || "AL")
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .substring(0, 3)
      .toUpperCase();

    // Custom beautiful dark-themed SVG with dynamic initials and nice gradients
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="fallbackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${encodeURIComponent(gradientFrom)}"/>
            <stop offset="100%" stop-color="${encodeURIComponent(gradientTo)}"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#fallbackGrad)"/>
        <rect width="90" height="90" x="5" y="5" rx="10" fill="none" stroke="%233f3f46" stroke-width="2" stroke-opacity="0.3"/>
        <circle cx="50" cy="50" r="28" fill="%23a855f7" fill-opacity="0.04" stroke="%23a855f7" stroke-width="1.5" stroke-opacity="0.2" stroke-dasharray="3,3"/>
        <text 
          x="50%" 
          y="52%" 
          dominant-baseline="middle" 
          text-anchor="middle" 
          fill="%23a855f7" 
          font-family="system-ui, -apple-system, sans-serif" 
          font-size="22" 
          font-weight="800"
          letter-spacing="1"
          opacity="0.85"
        >
          ${text}
        </text>
      </svg>
    `.trim().replace(/\s+/g, " ");

    setImgSrc(`data:image/svg+xml;utf8,${svgString}`);
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={`${className} ${hasError ? "bg-zinc-950" : ""}`}
      onError={handleError}
      referrerPolicy={referrerPolicy || "no-referrer"}
      {...props}
    />
  );
}
