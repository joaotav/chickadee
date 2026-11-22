# 7. Export and import as a bookmarks HTML file

Status: accepted, 2026-11-22 (#41). Supersedes [ADR 0005](0005-json-export-import.md).

## Context

ADR 0005 planned a JSON file of the `Workspace` with its collapse state, to move between browsers. When the time came to build it (#41), the more useful file turned out to be the one browsers already write: the bookmarks HTML file, also called the Netscape bookmark file.

- Every browser and most bookmark tools export and import it, so one file backs up the Workspace, moves it between Firefox and Chrome, and brings links in from elsewhere.
- A browser's own full export already contains the `Workspace` folder, so it can be imported without exporting from Chickadee first.
- Collapse state is the only thing JSON would add, and losing it on a move is a small cost.

## Decision

**Export** writes the `Workspace` folder as a bookmarks HTML file, inside a folder named `Workspace`, so a browser's own import keeps it together. Separators, collapse state, settings and saved site icons are left out.

**Import** reads any bookmarks HTML file with the browser's `DOMParser`, which builds an inert document: nothing in it runs or loads.

- A file with a `Workspace` folder anywhere in it gives that folder's spaces, and the rest of the file is left out. Any other file gives its top folders as spaces and their folders as categories. Folders deeper than that are flattened into their category.
- It never changes or deletes existing bookmarks. When spaces in the file have names already taken, it asks first whether to merge them or keep them separate, numbered like "Work (2)". Merging adds to the space and category of the same name, skipping addresses already there, so importing a file twice adds nothing the second time.
- Links keep their addresses, bookmarklets and browser pages like `chrome://settings` included, so a backup comes back whole. The page shows them greyed out, as it always has, and never opens or runs them. Only what the browser refuses is left out, and the message counts it. An address without a scheme, like `example.com`, becomes a web link.
- Everything it creates is recorded, and Undo removes it.

## Consequences

- One format for backups, moving between browsers and bringing links in from other tools.
- Collapse state doesn't survive a move: every card starts expanded.
- No version field to maintain, since the format is a fixed, decades-old convention.
- Parsing and writing are pure functions with unit tests against sample Firefox, Chrome and other files.

## Alternatives considered

- **JSON with collapse state (ADR 0005).** Keeps collapse state, but only Chickadee reads it, and it needs its own validator and versioning.
- **Both formats.** Twice the code and a choice to explain, for collapse state alone.
