import React, { useEffect, useState } from "react";
import { images } from "../../assets/images";

/** Renders an avatar image; swaps to the bundled placeholder on missing src or load error. */
export default function Avatar({ src, alt = "avatar", className }) {
  const [useFallback, setUseFallback] = useState(!src);

  useEffect(() => {
    setUseFallback(!src);
  }, [src]);

  const resolvedSrc = useFallback || !src ? images.avatar : src;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (!useFallback) setUseFallback(true);
      }}
    />
  );
}
