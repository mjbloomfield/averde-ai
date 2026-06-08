---
title: "What's the difference between Claude and Claude Code? (And what's a CLAUDE.md?)"
excerpt: Most people use Claude as a chat tool. Few realize that with one install and one config file, the same Claude becomes a real co-worker that does real work on real projects. Part 1 of a 2-part series.
category: Automation
publishedDate: 2099-01-01
author: Mark Bloomfield
seoDescription: What Claude is, what Claude Code (the coding version) does, and what a CLAUDE.md file is — explained in plain English for small business owners. Part 1 of 2.
---

**Part 1 of a 2-part series.** Next: [How to actually set up Claude Code as your co-worker →](/blog/how-to-set-up-claude-code)

Scene: You've been using Claude (or ChatGPT) for a year. You ask it questions, get answers, copy-paste the useful bits into emails and proposals — it's helpful, like having a smart researcher you can interrupt anytime.

Now imagine that same Claude, but it can edit the actual files on your computer, read your real customer list, push a fix to your website, draft and schedule a blog post, and hold a working memory of your business — your voice, your pricing, what you stand for — so you don't have to re-explain context every time.

That's the difference between Claude in a browser tab and Claude as a co-worker. Same underlying model, completely different ways of working with it.

This post is the conceptual half — what Claude actually is, what Claude Code is, and what a CLAUDE.md file does. [Part 2](/blog/how-to-set-up-claude-code) is the nuts-and-bolts setup guide.

## Three pieces, in order

### 1. Claude — the AI itself

Claude is the AI model from Anthropic. Same family of thing as ChatGPT (from OpenAI) or Gemini (from Google). It reads, writes, reasons, codes, summarizes, and translates between human languages.

You can talk to Claude in a few places:

- **claude.ai** in your browser — chat, document drafting, research questions
- **Claude apps** on Mac, Windows, iPhone, and Android — same chat, native interface
- **The Anthropic API** — when other software (your CRM, a custom tool, a workflow automation) wants to use Claude in the background

For most people, claude.ai is where Claude lives. That's the assistant-in-a-browser-tab version, and it's genuinely useful — but it's just one slice of what Claude can actually do.

### 2. Claude Code — Claude with hands and feet

Claude Code is a separate product from Anthropic that runs on your computer. Same Claude — same model, same intelligence — but with one critical addition: it can actually do things on your machine.

That includes:

- Reading and editing files in any project folder
- Running commands (building a website, running tests, deploying to a server)
- Searching across hundreds of files for the thing you're looking for
- Talking to other tools (GitHub, Supabase, Stripe, your file system, your terminal)

In chat-Claude, you ask "how do I add a contact form to my website?" and you get instructions. In Claude Code, you say the same thing and Claude actually opens the right files, writes the form, hooks it up to your email service, deploys it, and tells you when it's done.

The shift is from *answers* to *actions*. That's what makes Claude feel like a co-worker instead of a search engine.

### 3. CLAUDE.md — the file that gives Claude context

Here's the piece nobody talks about until they need it.

By default, every new conversation with Claude Code starts fresh — no memory of past conversations, no knowledge of your business, no idea how you write or what you've already decided. That's fine for one-off questions, useless if you want consistent work over time.

**CLAUDE.md** is a plain-text file you put at the root of a project. Claude Code reads it at the start of every session, and whatever's in there becomes the standing context for the work.

For this website's CLAUDE.md, I keep things like:

- What the business is and what I sell
- My voice patterns ("Claude first when listing AI tools," "avoid AI-speak rhythm," "honest hedges on prices")
- The blog post workflow I use
- Which files to never touch
- Repo conventions and gotchas

The result: every new Claude Code session opens already knowing what I'm building, who I am, and how I write. I don't have to re-explain context, new drafts come out closer to my voice on the first try, and decisions Claude makes match decisions I'd make. The file gets better every time something needs correcting — I add a new rule and the next session inherits it automatically.

That's the "memory" that turns Claude from assistant into actual co-worker.

## The "you direct, Claude executes" mental model

A lot of people approach AI tools by trying to delegate everything, and they end up frustrated when the results aren't quite right. That's the wrong frame.

The right frame is: you're the project manager. Claude is a fast, talented, occasionally over-eager co-worker. You set the scope, the standards, and the priorities — Claude does the keystrokes.

In practice that means I'm doing:

- Deciding what to build and why
- Setting voice rules and design constraints
- Reading drafts and pushing back when something feels off
- Saying "no, don't do that" when Claude wants to add scope I didn't ask for

Claude is doing:

- Drafting copy, then revising based on my feedback
- Writing and editing the code
- Running builds, deploys, and validations
- Reading entire codebases to answer "where does X live?"
- Remembering past patterns so we stop making the same mistakes

The whole thing works because Claude is unusually good at being told "no" and changing direction. You can interrupt it mid-task, revert what it did, or tell it the same thing different ways until it lands right. That's how a co-worker behaves — not how older AI tools did.

## What this looks like in practice

Concrete examples from this very site, which I built almost entirely through Claude Code:

- The homepage you're reading was drafted by Claude, then I edited the parts that didn't sound like me. The CLAUDE.md voice file now captures those edits, so future drafts arrive closer on the first try.
- The free AI Readiness Audit (the widget at [/ai-audit](/ai-audit)) was built end-to-end in Claude Code — front-end, back-end API, email delivery via Resend, lead logging into Supabase. A couple of working sessions, all in directly with Claude.
- This blog system has scheduled publishing, a voice-training workflow, and a draft-review pattern I built in a single session with no prior plan.
- The AI-Ready Website service I sell is itself built through Claude Code, with each client's CLAUDE.md tuned to their business so the work stays consistent across sessions.

None of that required a developer team. It required a clear sense of what I wanted, an iteration loop where I edit what's wrong, and a CLAUDE.md that keeps the context warm.

## What Claude Code isn't

Three things worth being honest about, because the hype hides them:

- **It's not a magic wand.** Claude makes mistakes — it will sometimes write code that almost works, or draft copy that's a little off, so you have to read what it does and push back. The 30 minutes I'd save by not reading the diff costs me an hour later when I find a bug I missed.
- **It's not a replacement for knowing what you're trying to build.** Claude is great at executing a clear request, but asked vaguely it makes vague choices. The "you direct" half is real work, and it's the half that matters.
- **It's not free.** Claude Code runs on a paid Claude subscription — usually $20 to $100 a month depending on how heavily you use it. For most small businesses, that's well under the value of one good co-working day.

It also isn't the answer to every problem. For copy-paste research and quick questions, claude.ai in a browser is still the right tool. Claude Code is for project work — the kind of thing you'd otherwise hire a contractor for.

## What's next: actually setting it up

If this sounds useful, [Part 2](/blog/how-to-set-up-claude-code) walks through the setup end to end — installing Claude Code, writing your first CLAUDE.md, and a starter project so you can try it on something real before you commit.

---

**Continue to Part 2:** [How to actually set up Claude Code as your co-worker →](/blog/how-to-set-up-claude-code)

---

*Want help figuring out where AI actually fits in your business? [Run the free 3-minute AI Readiness Audit](/ai-audit) — you'll get a personalized report with your top three highest-impact AI opportunities, ranked.*
