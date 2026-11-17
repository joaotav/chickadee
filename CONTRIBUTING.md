# Contributing

Every change except small fixes starts as an issue. Changes are made on a branch and reach `main` through a pull request that is merged once CI passes.

- [Issues](#issues)
- [Branches and commits](#branches-and-commits)
- [Pull requests](#pull-requests)
- [Tests](#tests)
- [Changelog](#changelog)

## Issues

Open an issue before starting work, using one of the templates: bug report, feature request or tracking issue. Search the existing issues first.

Larger efforts get a tracking issue, with the smaller issues attached as sub-issues in the order they should be done. The [MVP tracking issue](https://github.com/joaotav/chickadee/issues/1) lists the milestones in [docs/mvp-plan.md](docs/mvp-plan.md).

Small fixes, like a typo, a broken link or a CI tweak, can skip the issue and go straight to a pull request whose description says why.

### Labels

Each issue gets one type and usually one area. The other labels are added when they apply.

| Group | Labels | Use |
|---|---|---|
| Type | `bug`, `enhancement`, `documentation`, `chore`, `tracking` | What kind of work it is. The issue templates add `bug`, `enhancement` or `tracking`. `chore` is tooling, CI and maintenance. |
| Area | `area: new tab`, `area: popup`, `area: search`, `area: design`, `area: release` | The part of the extension it touches. `design` is how things look, `release` is packaging, signing and store listings. |
| Concern | `usability`, `accessibility` | Something is hard to find, understand or use, or a barrier for people with disabilities. Can apply to any area. |
| Status | `needs decision` | The issue has open choices, listed under "To decide", to agree on before work starts. Remove it once they're settled. |

Dependabot adds `dependencies` and `javascript` to its own pull requests. GitHub's default labels, like `duplicate` and `wontfix`, keep their usual meaning.

## Branches and commits

Branch off `main`. Branch names start with your GitHub username, then the number of the issue the branch works on, then a short description: `joaotav/7-display-settings`. Branches for small fixes without an issue leave out the number: `joaotav/fix-readme-typo`.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), like `feat: add display settings` or `fix: keep collapse state after undo`. Each commit does one logical thing. Commits are signed, so GitHub shows them as Verified.

## Pull requests

Each pull request:

- does one thing, which should be clear from its title, description and issue
- links its issue with `Closes #N`, so merging closes the issue, or with `Part of #N` when the issue takes more than one pull request
- has a title in Conventional Commits form, because the title becomes the subject of its merge commit on `main`, with the PR number added: `feat: add display settings (#21)`
- includes tests and updates docs
- adds a [changelog](#changelog) entry when users will notice the change
- fills in the checklist from the template

Pull requests are merged into `main` with a merge commit once CI passes, so the branch's commits stay as they are, signed and in order. Before merging, fix-ups like "fix a typo in the last commit" are folded into the commit they fix. The branch is deleted after merging. `git log --first-parent main` shows one line per pull request.

Dependabot's pull requests are the exception: they have no issue and no changelog entry.

## Tests

| Command | What it runs |
|---|---|
| `npm test` | Unit and component tests (Vitest) |
| `npm run test:e2e` | Builds the Chrome extension and runs the end-to-end tests (Playwright) |
| `npm run check` | Type check, unit and component tests, `npm audit`, Firefox build and `web-ext lint` |

CI runs `npm run check` and `npm run test:e2e` on every pull request. Firefox can't be tested under automation, so check changes to the extension by hand with `npm run dev:firefox`. [docs/mvp-plan.md](docs/mvp-plan.md#testing) explains the test layers.

For checking by hand, development builds add two buttons to the settings panel. **Add a few bookmarks** adds a small set of spaces, categories and links that covers the awkward cases, like long names, empty categories and a category with more than 10 links. **Add many bookmarks** adds about 900 links in 16 spaces, for trying the page when the tabs don't fit in the top bar and the categories don't fit on the screen. Each click adds the set again. The development browser has its own profile, so the samples never mix with your real bookmarks. The sets are in `src/lib/sample.ts`.

## Changelog

[CHANGELOG.md](CHANGELOG.md) tells users how the extension changed. It is not a list of merged pull requests; the commit history already is one. Write entries for users, not developers, and leave out changes they won't notice, like CI, tests or refactoring.

New entries go under **Unreleased**, in one of these sections: Breaking changes, Features, Improvements, Bug fixes. If a change takes several pull requests, give it one entry describing the net effect. Link the issue:

```md
- Choose a theme, density and title style in the new settings panel ([#7](https://github.com/joaotav/chickadee/issues/7))
```

At a release, the Unreleased entries move under the new version number.

## Releasing

Releases are tagged on `main` and published as GitHub releases with both browsers' builds attached.

1. In a pull request, set the version with `npm version <version> --no-git-tag-version`, which updates `package.json` and `package-lock.json`, and move the CHANGELOG's Unreleased entries under a `## <version> - <date>` heading, leaving an empty Unreleased above it. Merge it.
2. On an up-to-date `main`, sign the Firefox build. It needs the JWT issuer (the API key) and JWT secret from [addons.mozilla.org](https://addons.mozilla.org/developers/addon/api/key/), which stay out of the repo. `read -rs` takes each one without showing it or saving it in the shell's history. Paste the key, press Enter, then do the same for the secret:

   ```sh
   git switch main && git pull
   read -rs WEB_EXT_API_KEY && read -rs WEB_EXT_API_SECRET && export WEB_EXT_API_KEY WEB_EXT_API_SECRET
   npm run sign:firefox     # the signed .xpi lands in .output/signed/
   ```

   Mozilla signs an unlisted add-on automatically, usually within minutes. The upload includes the source zip, since the build is minified. AMO refuses a version it has already signed, so every upload needs a new version.
3. Build the Chrome zip with `npm run zip`. The manifest's `key` keeps the extension ID the same on every computer.
4. Tag the release and attach both files. `.output/signed/` keeps the `.xpi` of earlier versions too, so the commands pick this version's by name and give it the same name pattern as the Chrome zip. The release notes are the version's CHANGELOG entries, after a line on what the release is about and how to install it, written to a file outside the repo:

   ```sh
   V=$(node -p "require('./package.json').version")
   cp .output/signed/*-$V.xpi .output/chickadee-$V-firefox.xpi
   git tag -s v$V -m v$V && git push origin v$V
   gh release create v$V .output/chickadee-$V-firefox.xpi .output/chickadee-$V-chrome.zip --title "Chickadee $V" --notes-file /tmp/notes-$V.md
   ```

5. Close the version's milestone, and open one for the next release with its issues.

The extension icon is drawn in `src/assets/icon.svg`. After changing it, run `node scripts/render-icons.mjs` to update the PNG sizes in `public/icon/`.
