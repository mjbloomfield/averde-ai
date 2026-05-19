# Blog drafts (voice-training corpus)

Two files per post:
- `NN-<slug>-claude-draft.md` — Claude's original draft (don't edit)
- `NN-<slug>-mark-edited.md` — Mark's edited version (this is what gets published)

## Workflow

1. Claude writes a new post → drops a draft in `src/content/blog/` AND seeds
   both files here with identical content.
2. Open the two files side-by-side in VS Code (or Cursor) and edit the
   `-mark-edited.md` version. The `-claude-draft.md` stays as the original
   for the diff comparison.
3. When the edit is final, either:
   - Paste the edited body into Keystatic UI and publish from there, OR
   - Copy the body into the actual `src/content/blog/<slug>.mdoc` file
4. In your next Claude Code session, say:
   > "I've edited post NN — read both versions in /blog-drafts and update CLAUDE.md."
5. Claude reads both, diffs them, updates CLAUDE.md with new voice patterns.
   Next post Claude writes will be closer to your voice on first try.

The system compounds: every edit makes the next draft better. By post 3-4
the diffs should be small.
