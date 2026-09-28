---
name: frontend-design
description: Master-level frontend UI/UX design guidelines focusing on visual hierarchy, typography, high-end aesthetics, and micro-interactions without generic AI design patterns.
license: MIT
---

# Creative Design: Frontend Design & UI/UX Pro Max

## Core Principles
1. **Geometric Silence & Intentional Restraint**:
   - Every layout uses deliberate negative space and strict grid alignment.
   - Avoid generic, uniform border radiuses; vary radiuses purposefully (e.g. 4px for tags, 8px for buttons, 14px for cards).
   - Avoid decorative clutter; let data structure and typography communicate.

2. **Color System & Contrast**:
   - Deep layered surface stack: `--s0` base, `--s1` sidebar/background, `--s2` cards, `--s3` elevated surfaces, `--s4` interactive states.
   - Curated accents: Electric Blue (`#0066ff`), Precision Cyan (`#00e5ff`), Emerald (`#00d68f`), Amber (`#ffab00`), Crimson (`#ff3366`).
   - High legibility with strict contrast ratios: primary text 95% opacity, secondary 70%, muted 45%.

3. **Typography**:
   - Avoid default generic fonts. Use geometric modern sans such as Outfit or Plus Jakarta Sans.
   - Use tabular numbers (`tabular-nums`) for all metrics, values, counts, and financial data.
   - Strict scale: Headers 1.25rem-2rem, Labels 0.72rem uppercase with letter-spacing 0.08em, Body 0.9rem.

4. **Dynamic Feedback & Micro-interactions**:
   - Fluid cubic-bezier transitions (`cubic-bezier(0.22, 1, 0.36, 1)`).
   - Immediate feedback on all interactive controls (custom checkboxes, status pills, toast notifications).
