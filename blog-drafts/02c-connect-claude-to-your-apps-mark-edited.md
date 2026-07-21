**Part 3 of the series.** Catch up on [Part 1: what Claude, Cowork, and Code actually are →](/blog/claude-cowork) and [Part 2: the setup guide →](/blog/how-to-set-up-claude)

Okay — you've got Claude set up, and you've taken it around the block a few times. It's organized a folder, built a spreadsheet, drafted something in your voice. Now let's connect it to your apps, because that's where it stops being a helper you copy-paste things into and starts working with the same tools you work in.

This takes about twenty minutes, and like everything else in this series, you do it once.

## What a connector is

A [connector](/glossary#connector) is a permission you grant Claude to work inside one of your apps — your email, your calendar, your files. It's the same idea as the folder access you set up in Cowork, just pointed at your online tools instead of your computer: you choose exactly which apps Claude can see, and you can disconnect any of them anytime.

Two things to know up front, before the fun part:

- **Claude only touches a connected app when you ask it to do something that needs it.** Connecting your Gmail doesn't mean Claude sits there reading your email all day. It means when you ask "find the quote requests I haven't answered," it can go look.
- **You stay in the approval loop for anything that changes something.** The clearest example: with Gmail connected, Claude can search, read, and *draft* — but it can't send an email on its own. You read the draft, you hit send.

Same trust model as everything else in this series: you direct, Claude executes, you check the work.

## Step 1 — Connect your email, calendar, and files

If you run on Google (Gmail, Google Calendar, Google Drive), this is built in. Click your username in the bottom left, then **Settings → Connectors**. You'll see the Google connectors ready to enable — click one, sign in to your Google account, and approve the access. You can also get there mid-conversation: click the **+** button in the chat box, then **Connectors**.

If you run on Microsoft 365 (Outlook, OneDrive), there's a connector for that too — same menu.

Connect all three if you're comfortable, but one is a fine start. Email is where most small-business owners feel it first.

## Step 2 — The first tasks worth trying

Same rule as Part 2: start with something low-stakes and genuinely useful, in plain English.

**With email connected:**

- "Find the emails from last week that asked me a question I never answered."
- "Draft replies to these three — keep them short and friendly. I'll review before sending."
- "Search my email for everything from [client] about the [project] and give me the story so far."

**With calendar connected:**

- "What does my week actually look like? Flag anything that's missing a location or an agenda."
- "Find 30 minutes on Thursday or Friday for a call with Sharon, and draft the invite."

**With files connected:**

- "Find the proposal we sent [client] in March and list what we promised and by when."
- "Pull the numbers from [spreadsheet] and give me a one-paragraph summary I can send my bookkeeper."

Each of these used to be ten minutes of clicking around. Now it's one sentence, and the answer comes back with the emails, events, or files it used — so you can check its work.

## Step 3 — Put them together

The real payoff is when the apps combine. This is the "Monday morning briefing" idea from Part 1, and with connectors it's real:

> "Look at my calendar for this week, check my inbox for anything urgent I haven't answered, and give me one short briefing: what's scheduled, what needs a reply, and what can wait."

That's calendar + email + judgment, in one pass, before your first coffee is done. In Cowork you can even make something like this a recurring task, so it's waiting for you instead of you asking for it.

## What about my other tools?

The directory at [claude.ai/connectors](https://claude.ai/connectors) goes well beyond Google and Microsoft — Slack and a growing list of business tools are in there. Browse it with your own stack in mind: the question isn't "what's available," it's "which two of my tools eat the most of my week?"

And if the tool you live in isn't there — your industry's scheduling system, your point-of-sale, that database someone built you years ago — that's not a dead end. Custom connections are exactly the kind of thing I build for clients. But start with the built-in ones first; for most businesses, email + calendar + files covers the bulk of it.

## A few further thoughts

- **Start with one app.** Get comfortable with what Claude does with your email before you hand it three more tools. You can always expand — the connectors menu isn't going anywhere.
- **The contractor rule still applies.** A connected app is real business data. Give Claude the access a trusted new hire would get, not the master key to everything on day one.
- **Your data isn't training material.** On paid plans, what Claude reads through connectors isn't used to train the models (unless you've explicitly opted in). It accesses the account you connected, when you ask, and that's it.
- **Disconnecting is one click.** Same menu you connected in — Settings → Connectors. Nothing about this is permanent.

## Where this leaves you

With Parts 1 through 3 done, you've got the whole picture: Claude knows who you are (Instructions), knows your work (Projects), can do real work on your files (Cowork), and now works inside the tools your business actually runs on (connectors). That's a co-worker, not a chatbot — and you built it in a couple of hours, total.

Remember — you're still making the calls. Claude just multiplies what gets done between them.


**The series:** [Part 1: Claude, Cowork, and Code — what's the difference? →](/blog/claude-cowork) · [Part 2: the setup guide →](/blog/how-to-set-up-claude)


*Want help figuring out where AI actually fits in your business? [Run the free 3-minute AI Visibility Audit](/ai-audit) — you'll get a personalized report with your top three highest-impact AI opportunities, ranked.*
