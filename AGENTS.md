# AGENTS.md

## Project Description

This project implements a web synthesizer rack with several audio synthesis types with static, client-side web technologies. The web application will be presented in a specific design style constructed as part of the project. As part of this process, several mood boards and design system will be implemented as pages. The project will follow the steps below at the direction of the user.

1. Implement the synthesizer rack functionality with a bare, black and white design. This minimal meta-style should be used for the mood board, design system, and hub pages. The UI should be largely finalized at this stage based on this file and the documentation.
2. Implement mood board pages.
3. Implement design system page.
4. Apply design system to the synthesizer rack.
5. Create a hub page with links to all constituent parts.

## Project Constraints

This project may only use HTML, CSS, Javascript, Next.js, and Tailwind. No other Javascript frameworks, external APIS, or databases may be used. The site must be a static page, where all functionality is accomplished through the user's browser. The site must be responsive and work on mobile and desktop, though the presentation may be altered to best fit each screen type.

No agent may edit this file or `README.md`.

## Project Documentation

All project documentation can by found in the `doc\` directory. Documentation covers the project file structure, project design, audio processing, audio safety, synthesis types, MIDI standards, and IO. Agents should first refer to the relevant documents before writing or editing code. Copies of the documentation in context are sufficient unless otherwise specified by the user.

## Synthesizer Rack

The synthesizer rack implements a variety of audio synthesis approaches. The UI consists of a grid of synthesizer widgets added by the user. Each widget allows the user to change the parameters and the input MIDI voice. There are also controls for managing the IO. Documentation for synthesis and UI can be found in the `doc/` directory.

It is imperative that the synthesizer rack includes audio safety measures, as high volume bursts can injure users and damage equipment. The software should be conservative, leaning on the side of caution. Documentation for audio safety can be found in the `doc/` directory.

## Mood Boards

Mood boards are collections of 25-30 artifacts that represent a style. This project includes three stylistic directions, each of which is detailed below.

### Mood 1

TBD

### Mood 2

TBD

### Mood 3

TBD

## Design System

Design systems are libraries of UI components styled after a mood board. There is one design system for every mood board. The system pages must contain the components the synthesizer rack uses presented in every reachable state.
