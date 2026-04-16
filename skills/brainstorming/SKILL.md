---
name: brainstorming
description: |
  Use before creative work (features, components, behavior changes) to explore intent, requirements, and design before implementation.
  Use when exploring new features, designing components, planning behavior changes, or when the user wants to "brainstorm", "design", "think through", "explore approaches", or "grill me".
  Trigger phrases: "brainstorm", "design", "explore", "think through", "how should", "what if", "approach", "best way to", "architecture for", "grill me".
  Do NOT use for debugging, bug fixes, or code review.
license: MIT
---

# Brainstorming Ideas Into Designs (Enhanced with Grill-Me)

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far.

## The Process

### Understanding the idea

- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Focus on understanding: purpose, constraints, success criteria

### Exploring approaches

- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

### Presenting the design

- Once you believe you understand what you're building, present the design
- Break it into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing

### Grill-Me Enhancement: Relentless Questioning

When the user wants to "grill me" or stress-test a plan/design:

- Interview the user relentlessly about every aspect of the plan/design
- Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one
- For each question, provide your recommended answer
- Ask questions one at a time

## After the Design

### Documentation (if requested)

- If the user wants a written design, save it to `docs/plans/YYYY-MM-DD-<topic>-design.md`
- Follow the repo documentation policy (avoid one-off summaries)
- Commit only if explicitly asked

### Implementation (if continuing)

- Ask: "Ready to set up for implementation?"
- If non-trivial, require a **mini-spec** before coding:
  ```
  Goal → Output → Constraints → Verify
  ```

## Key Principles

- **One question at a time** - Don't overwhelm with multiple questions
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design in sections, validate each
- **Be flexible** - Go back and clarify when something doesn't make sense
- **Mini-spec before code** - Non-trivial work requires Goal → Output → Constraints → Verify
