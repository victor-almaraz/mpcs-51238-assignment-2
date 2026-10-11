# AGENTS.md

## Project Description

This project implements a web synthesizer rack with several audio synthesis types with static, client-side web technologies. The web application will be presented in a specific design style constructed as part of the project. As part of this process, several mood boards and design systems will be implemented as pages. The project will follow the steps below at the direction of the user.

1. Implement the synthesizer rack functionality with a bare, black and white design. This minimal meta-style should be used for the mood board, design system, and hub pages. The UI should be largely finalized at this stage based on this file and the documentation.
2. Implement mood board pages.
3. Implement design system pages.
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

### Mood Board 1: Industrial

This mood board focuses on mechanical and analog machines. The goal is not to reintroduce the metaphor of a physical object, but rather to draw aesthetic inspiration from their industrial design. Analog synthesizers, typewriters, oscilloscopes, industrial control panels, and the like are included in this board.

| Image Number | Citation|
|--------------|---------|
| 01 | Spaz Tacular from Germany. Goorremont Cinema Halloween Show. Derivative work by Clusternote, Wikimedia Commons, 2.0 CC BY |
| 02 | Sobczak, Chris. Moog Polymoog Synthesizer in Utrecht. Derivative work by Shoulder-synth, Wikimedia Commons, 2.0 CC BY |
| 03 | CPRdave. Wikimedia Commons |
| 04 | StingR. Wikimedia Commons |
| 05 | Raymangold22. Wikimedia Commons |
| 06 | Notreshuggie. Wikimedia Commons, 2.0 CC BY |
| 07 | Wouters, Orson. Wikimedia Commons, 3.0 CC BY-SA |
| 08 | Hewlett-Packard Company. 120B Oscilloscope Operating and Service Manual. Nov. 1966 |
| 09 | Hewlett-Packard Company. 120B Oscilloscope Operating and Service Manual. Nov. 1966 |
| 10 | Hewlett-Packard Company. Model 143A Oscilloscope Operating and Service Manual |
| 11 | "Листвица." The Typewriter Museum |
| 12 | "Adler Tippa S." The Typewriter Museum |
| 13 | "Optima M16." The Typewriter Museum |
| 14 | "Unis TBM de Luxe." The Typewriter Museum |
| 15 | "Optima M14." The Typewriter Museum |
| 16 | "Erika 100." The Typewriter Museum |
| 17 | "Olympia SM7." The Typewriter Museum |
| 18 | Ressmeyer, Roger. Japanese Mission Control Room. Tsukuba Space Center, NASDA. Corbis/VCG, Getty Images |
| 19 | Kasmauski, Karen. Control Room in Chernobyl Nuclear Plant. 1988. Corbis, Getty Images |
| 20 | CSA Images. Old Computer. Stock illustration. Getty Images |
| 21 | Dazeley, Peter. Battersea Power Station, Control Room A. Nine Elms, London. Stock photo. Getty Images |
| 22 | Arctic-Images. Control Panel. Toppstodin Old Reserve Power Station, Reykjavik, Iceland. Stock photo. Getty Images |
| 23 | Bettmann. Engine Test Facility Control Room. Arnold Engineering Development Center, US Air Force Air Research and Development Command. Getty Images |
| 24 | Mondadori Portfolio. Electronic Calculator Into a Control Room. Italy, 1960s. Getty Images |
| 25 | CSA Images. Old Time Computer with Punch Card. Stock illustration. Getty Images |

### Mood Board 2: Contrast/Form

This mood board draws primarily from early photography, Expressionist film, and early modern theater. Because of the mediums' limitations, these influences make excellent use of contrast and form in their compositions. Though static frames and stills, some preserve a sense of motion through soft and flowing forms. Illustrations of the era and hand-tinted frames are also included for a touch of color.

The typography is not contemporaneous with the other influences included in this board. All fonts are modern typefaces based on Art Deco typography from the 1920s and 1930s. This fits with many of the rigid and geometric forms of the included stills.

| Image Number | Citation|
|--------------|---------|
| 01 | Taber, Isaiah West. La Danseuse Loïe Fuller. 1897. Albumen print mounted on cardboard, 13.5 x 9.5 cm. Musée d’Orsay, Paris. Wikimedia Commons |
| 02 | Toulouse-Lautrec, Henri de. Miss Loïe Fuller. 1893, The Cleveland Museum of Art. Color lithograph, image: 37.9 x 25.7 cm. Gift of Ralph King, 1925.1202 |
| 03 | Moser, Koloman. Serpentine Dancer. Poster Design for Loïs Fuller. c. 1902. Watercolor on paper, 28.8 x 45.3 cm. WikiArt |
| 04 | Obsessed with Light. Directed by Sabine Krayenbühl and Zeva Oelbaum, Film Movement, 2023 |
| 05 | The Cabinet of Dr. Caligari. Directed by Robert Wiene, Decla-Bioscop, 1920 |
| 06 | The Hands of Orlac. Directed by Robert Wiene, Pan-Film, 1924 |
| 07 | The Hands of Orlac. Directed by Robert Wiene, Pan-Film, 1924 |
| 08 | Faust. Directed by F. W. Murnau, UFA, 1926 |
| 09 | La antena. Directed by Esteban Sapir, Pachamama Cine, 2007 |
| 10 | Swing Time. Directed by George Stevens, RKO Radio Pictures, 1936 |
| 11 | Metropolis. Directed by Fritz Lang, UFA, 1927 |
| 12 | Metropolis. Directed by Fritz Lang, UFA, 1927 |
| 13 | Metropolis. Directed by Fritz Lang, UFA, 1927 |
| 14 | Craig, Edward Gordon. Model for Hamlet. Eton College, Eton |
| 15 | Ellen Terry with Screens Designed by Edward Gordon Craig. Eton College, Eton |
| 16 | Craig, Edward Gordon. Design from "Scene" |
| 17 | Craig, Edward Gordon. Design from "Scene" |
| 18 | Craig, Edward Gordon. Design from "Scene" |
| 19 | Craig, Edward Gordon. Design for an Entrance Hall of a Theatre. Towards a New Theatre |
| 20 | Craig, Edward Gordon. Hamlet, Act I, Scene v. Towards a New Theatre |
| 21 | Craig, Edward Gordon. Julius Caesar, Act II, Scene ii. Towards a New Theatre |
| 22 | Craig, Edward Gordon. Screens. Towards a New Theatre |
| 23 | Craig, Edward Gordon. The Steps III. Towards a New Theatre |
| 24 | Appia, Adolphe. Design in Orpheus, Hellerau |
| 25 | Appia, Adolphe. Design in Orpheus, Hellerau |
| 26 | Svoboda, Josef. Hamlet |
| 27 | Mielziner, Jo. Faust |
| 28 | Pancini, Cosimo Lorenzo. Cocosignum. Zetafonts, 2017 |
| 29 | Fagen, Connary. Waverly CF. Connary Fagen Fonts, 2016 |
| 30 | Ciecko, Brendan. Warszawa Deco. 2012 |


### Mood Board 3: Light/Grain/Color

This mood board draws primarily from the likes of Wong Kar-Wai and Panos Cosmatos. It is focused on film frames that have an almost impressionistic nature, capturing light as vibrant grains of color. Some stills are a suggestion of a figure, gradients evoking a person or scene. Some are more concrete, yet still drenched in color and texture.

The typography here is largely incidental. It is comprised of heavy, sans-serif typefaces that are as bold as the colors and textures.

| Image Number | Citation|
|--------------|---------|
| 01 | Chungking Express. Directed by Wong Kar-wai, Jet Tone Production, 1994 |
| 02 | Chungking Express. Directed by Wong Kar-wai, Jet Tone Production, 1994 |
| 03 | Chungking Express. Directed by Wong Kar-wai, Jet Tone Production, 1994 |
| 04 | Happy Together. Directed by Wong Kar-wai, Block 2 Pictures, 1997 |
| 05 | Happy Together. Directed by Wong Kar-wai, Block 2 Pictures, 1997 |
| 06 | Happy Together. Directed by Wong Kar-wai, Block 2 Pictures, 1997 |
| 07 | Happy Together. Directed by Wong Kar-wai, Block 2 Pictures, 1997 |
| 08 | Fallen Angels. Directed by Wong Kar-wai, Jet Tone Production, 1995 |
| 09 | Fallen Angels. Directed by Wong Kar-wai, Jet Tone Production, 1995 |
| 10 | Fallen Angels. Directed by Wong Kar-wai, Jet Tone Production, 1995 |
| 11 | In the Mood for Love. Directed by Wong Kar-wai, Block 2 Pictures, 2000 |
| 12 | In the Mood for Love. Directed by Wong Kar-wai, Block 2 Pictures, 2000 |
| 13 | In the Mood for Love. Directed by Wong Kar-wai, Block 2 Pictures, 2000 |
| 14 | In the Mood for Love. Directed by Wong Kar-wai, Block 2 Pictures, 2000 |
| 15 | M83. A Necessary Escape (Dakar Chronicles Original Soundtrack). Other Suns, 2025. Cover art |
| 16 | M83. Resurrection (Original Soundtrack). Other Suns, 2025. Cover art |
| 17 | Mandy. Directed by Panos Cosmatos, RLJE Films, 2018 |
| 18 | Mandy. Directed by Panos Cosmatos, RLJE Films, 2018 |
| 19 | Mandy. Directed by Panos Cosmatos, RLJE Films, 2018 |
| 20 | Mandy. Directed by Panos Cosmatos, RLJE Films, 2018 |
| 21 | Beyond the Black Rainbow. Directed by Panos Cosmatos, Magnet Releasing, 2010 |
| 22 | Beyond the Black Rainbow. Directed by Panos Cosmatos, Magnet Releasing, 2010 |
| 23 | Beyond the Black Rainbow. Directed by Panos Cosmatos, Magnet Releasing, 2010 |
| 24 | Skinamarink. Directed by Kyle Edward Ball, IFC Midnight, 2022 |
| 25 | Skinamarink. Directed by Kyle Edward Ball, IFC Midnight, 2022 |
| 26 | Suspiria. Directed by Dario Argento, Produzioni Atlas Consolidated, 1977 |
| 27 | Deep Red. Directed by Dario Argento, Seda Spettacoli, 1975 |
| 28 | PreussType. Colombo. PreussType |

## Design Systems

Design systems are libraries of UI components styled after a mood board. There is one design system for every mood board. The system pages must contain the components the synthesizer rack uses presented in every reachable state. While the mood boards may list specific licensed fonts as inspirations, the design systems are limited to open license fonts that meet the aesthetic goal. Google Fonts are to be avoided due to privacy concerns.
