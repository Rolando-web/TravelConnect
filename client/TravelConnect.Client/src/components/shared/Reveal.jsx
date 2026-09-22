import { useEffect, useRef } from "react";

/**
 * Wraps children in a scroll-triggered reveal animation.
 * variant: "up" | "down" | "left" | "right" | "zoom" | "fade"
 */
export default function Reveal({
  children,
  variant = "up",
  delay = 0,
  duration = 700,
  threshold = 0.12,
  className = "",
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Intentionally NOT gated on prefers-reduced-motion: the site owner wants
    // the scroll-in effect everywhere. (Purely fade/transform, no flash.)
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("reveal-visible");
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`reveal reveal-${variant} ${className}`}
      style={{ transitionDelay: `${delay}ms`, transitionDuration: `${duration}ms` }}
      {...rest}
    >
      {children}
    </div>
  );
}