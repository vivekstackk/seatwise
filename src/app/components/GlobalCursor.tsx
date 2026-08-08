"use client";

import { useEffect, useRef } from "react";

export default function GlobalCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLSpanElement | null>(null);
  const ringRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const dot = dotRef.current;
    const ring = ringRef.current;

    if (!cursor || !dot || !ring) return;

    // Don't use custom cursor on touch devices
    const finePointer = window.matchMedia("(pointer: fine)");

    if (!finePointer.matches) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    let ringX = mouseX;
    let ringY = mouseY;

    let animationFrame = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;

      cursor.classList.add("global-cursor--visible");

      // Dot reacts immediately
      dot.style.transform = `translate3d(
        ${mouseX}px,
        ${mouseY}px,
        0
      )`;
    };

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) return;

      const clickable = target.closest(
        "a, button, [role='button'], input, textarea, select, [data-cursor='interactive']"
      );

      if (clickable) {
        cursor.classList.add("global-cursor--active");
      } else {
        cursor.classList.remove("global-cursor--active");
      }
    };

    const handleMouseLeave = () => {
      cursor.classList.remove("global-cursor--visible");
    };

    const handleMouseEnter = () => {
      cursor.classList.add("global-cursor--visible");
    };

    const animate = () => {
      // Ring intentionally follows more slowly
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;

      ring.style.transform = `translate3d(
        ${ringX}px,
        ${ringY}px,
        0
      )`;

      animationFrame = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseover", handleMouseOver);

    document.documentElement.addEventListener(
      "mouseleave",
      handleMouseLeave
    );

    document.documentElement.addEventListener(
      "mouseenter",
      handleMouseEnter
    );

    animationFrame = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseover", handleMouseOver);

      document.documentElement.removeEventListener(
        "mouseleave",
        handleMouseLeave
      );

      document.documentElement.removeEventListener(
        "mouseenter",
        handleMouseEnter
      );

      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="global-cursor"
      aria-hidden="true"
    >
      <span
        ref={ringRef}
        className="global-cursor-ring"
      />

      <span
        ref={dotRef}
        className="global-cursor-dot"
      />
    </div>
  );
}