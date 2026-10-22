# Agent instructions

Make only changes required by the task. Avoid unrelated refactoring, formatting,
and dependency updates.

Preserve the public API, locitree and locitree/node entry points, ESM/CJS
outputs, type declarations, and existing compatibility targets unless the task
explicitly changes them.

Follow the existing build, test, lint, and formatting configuration. Do not
weaken checks to make changes pass.

Before completing a change, run the relevant project checks and inspect the
final diff. Report checks that could not run.

README.md is the canonical English documentation. Keep affected content
consistent across translations, including examples and safety warnings.

Keep PR descriptions focused on the changes. Do not include signing or
check-result sections.

Do not merge PRs or publish releases unless explicitly requested.
