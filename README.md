# Flip 7 Scorecard

A scorecard for the card game Flip 7, made for phones: <https://flip7.benbirt.io>

- Enter each round's scores on a big keypad, with buttons for a bust and the
  Flip 7 bonus (+15).
- **With a Vengeance**: turn it on when setting up a game to allow negative
  scores.
- Plays to 200 by default, or any target. The game ends after the round in
  which someone reaches it; the highest total wins, and players tied for the
  lead play another round.
- Shows the dealer, each player's place and points to go, and every round,
  any of which can be changed or deleted.
- Celebrates the winner with champagne, fireworks, confetti, a trophy or a
  surprise, chosen in Settings, with optional sound.
- Keeps the game in the browser's local storage, so a reload loses nothing.
  There is no server and no tracking.

This is an unofficial scorecard. Flip 7 is a game by The Op.

## Development

The site is plain HTML, CSS and JavaScript modules, with no build step and no
dependencies. Bazel tests the game rules under Node and assembles the site.

```sh
bazel test //...              # the tests in tests/
bazel run //:serve            # the site at http://localhost:8080/
bazel build //:public         # the site as deployed, in bazel-bin/public
```

The rules live in `site/js/game.js`, apart from the page so that they can be
tested on their own. `site/js/app.js` is the page, `site/js/celebrate.js`
the celebrations and `site/js/sound.js` the sound effects, made with the Web
Audio API.

## Deployment and updates

- `.github/workflows/ci.yaml` runs the tests on every pull request and push,
  and deploys `main` to GitHub Pages.
- `.github/workflows/bazel-updates.yaml` opens a pull request each day when
  there is a new Bazel, Bazel module or Node release, through the shared
  workflow in [benbirt/workflows](https://github.com/benbirt/workflows);
  Dependabot does the same weekly for the GitHub Actions. Both are set to
  merge themselves once CI
  passes. They need the `AUTOMATION_TOKEN` secret, a personal token, in both
  the Actions and the Dependabot secrets, since merges made with the
  workflow's own token would not be deployed.
- The `flip7.benbirt.io` DNS record is in
  [benbirt/benbirt.io](https://github.com/benbirt/benbirt.io)'s `infra/`.
