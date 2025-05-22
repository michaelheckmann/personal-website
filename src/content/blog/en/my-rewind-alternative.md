---
title: "Creating my own Rewind alternative"
description: "I'm building my own local-first alternative to Rewind, and in this post, I'm sharing my wishlist. Privacy, enhanced search, performance, backups, and AI integration are key features I'm aiming for in this screen memory tool. Read about my motivations and the features I plan to implement."
pubDate: "Feb 28 2025"
cover: "../assets/my-rewind-alternative/hero.webp"
coverAlt: "A symmetrical corridor lined with tall, arching pillars, bathed in warm orange and red hues, leading towards a bright, illuminated end. The reflective floor enhances the vibrant colors, creating a surreal, dreamlike atmosphere."
colors: ["#AA291D", "#E8733C"]
tags: ["MacOS", "Productivity", "Rewind"]
reference: "my-rewind-alternative"
---

# Creating my own Rewind alternative

I love tools that make me more productive. Software like [Raycast](https://www.raycast.com/), [Alfred](https://www.alfredapp.com/), and [Superwhisper](https://superwhisper.com/) are great examples – tools I rely on daily and can barely imagine working without. They save me tons of time and basically let me work in completely new ways. [Rewind](https://www.rewind.ai/), from the team at Rewind AI, also falls into this category. I've been a dedicated user since its early access period in 2022, and it remains a daily part of my workflow. The core idea behind Rewind is pretty simple but incredibly effective: it records your screen and makes it all searchable. This is incredibly useful for retrieving information you might have forgotten or lost track of. In my work, I often need to revisit information from days, months, or even years past – website URLs, file names, email addresses, code snippets, you name it. Rewind is one of those rare tools that genuinely makes me feel like I have superpowers. It doesn't just save time; it fundamentally expands what I'm capable of.

So, you can imagine my frustration when I learned that the Rewind team, now rebranded as [Limitless](https://www.limitless.ai/), had decided to shift their focus away from Rewind. While Rewind remains available, and screen recording is on the roadmap for the Limitless product, I worry that Rewind won't receive the attention it deserves. It's still missing some crucial features that I've wanted for a long time. For instance, I've often wished for more sophisticated ways to filter and search my recordings. I've also encountered occasional performance issues, and with the project's reduced priority, I’m not optimistic about these shortcomings being addressed. This drove me to explore building my own alternative.

![Dark background with two gray triangular rewind icons centered at the top, suggesting a rewind function.](../assets/my-rewind-alternative/mockup.webp)

## My wishlist for a new Rewind

I've got a few ideas for a new Rewind alternative. Here’s my wishlist for what I’d like to see in such a screen memory tool:

### Recordings

Just like Rewind, my alternative must be local-first to guarantee maximum privacy. This means all data is created, processed, and stored directly on your device, not in the cloud – a somewhat uncommon approach these days. This local approach is key to make sure users stay in control over their personal information. It's also important that it doesn't eat up all your storage or slow down your computer, so the whole architecture needs to be efficient. Rewind already uses clever techniques to optimize recording data, as detailed in Kevin Chen's insightful [blog post](https://kevinchen.co/blog/rewind-ai-app-teardown/) analyzing the Rewind application. It makes me wonder how much more efficiency can be squeezed out.
Users should have granular control over their recordings, choosing which applications and websites are recorded and defining data retention periods. Manual recording on/off toggles are also essential. For my personal workflow, screen recording is the core feature. Even though Rewind also recorded audio and meetings, I think it makes more sense to nail screen recording first. There are already excellent dedicated meeting recording solutions available, and my aim is to build a tool that truly excels at visual memory.

### Privacy

Privacy is super critical for a tool like this. So, features like an encrypted database and encrypted recording files are must-haves to ensure that only the app itself has access to your data. Being able to delete recordings manually is also essential. It should be easy to delete by date range, or even filter by the app you were using or a keyword.
Given the outcry about the [Microsoft Recall](https://www.techspot.com/news/105943-microsoft-recall-capturing-screenshots-full-sensitive-information-despite.html) feature, it’s clear that you can’t overstate how important privacy is for a product like this.

### Search

For me, the most compelling aspect of Rewind is its search functionality. While features like the AI chat and daily recaps (showing time spent per application) are interesting, I've consistently found the time-travel search to be the most valuable. And I believe there’s significant potential to improve the search experience even further. I definitely want to include more advanced ways to filter and save searches. I also want to let users filter out specific words and search within app-specific details, like text on websites or file names in text editors. I think there are a lot of possibilities here to improve the search experience.

### Performance

I keep a year's worth of recordings in Rewind. That means it's dealing with a massive amount of data. The problem is, this often leads to crashes or slow performance when I'm searching for something through Rewind. It would be great to have a more performant search engine that can handle large amounts of data better.

### Backups

I think it would be cool to have a backup feature that allows users to export and back up their recordings either locally or to a cloud service. I like how [Obsidian](https://obsidian.md/sync) does backups for their vaults. They're end-to-end encrypted, you can back up specific parts, and it's all clear and transparent. They even have a [guide](https://obsidian.md/blog/verify-obsidian-sync-encryption/) to check the encryption yourself.

### AI

The data you get from a tool like this could be super useful as context for AI. For example, AI could use screen recordings to understand what you're working on in a project, or even spot patterns in how you work.
To be honest, I never really clicked with Rewind's AI chat. It always felt like it wasn't using my search results or the context it had available. It didn't make my searches better, and often missed stuff, which made me think it wasn't filtering things properly or understanding my screen recording history.
Making AI work well with this kind of data and getting it into a format that's actually useful for LLMs is going to be tricky. I think there could be some cool use cases in having the LLM process the data to pull out insights or automate things. Imagine the app highlighting important stuff you might need to remember, like deadlines or reminders. Or AI agents that pull up the screen history to get more context on a particular task. There are so many possibilities, and I'm really excited to explore them.

### Interface

I want this product to feel polished and well-designed. I love tools like [Fey](https://www.fey.com/) or [Linear](https://linear.app/) – they pay so much attention to the little things and make their products a joy to use. I love their visual style, how easy they are to navigate, the layout, even the little animations. Even though you won't be looking at the search UI all day, a polished interface makes the whole product feel more professional and trustworthy.

## Conclusion

Building my own Rewind alternative seems like a cool project. I think there's a ton of potential for something like this, and I'm excited to try and make it happen. This is definitely something I'd use every single day. I've checked out other options like [Screenpipe](https://github.com/mediar-ai/screenpipe) and [Screen Memory](https://screenmemory.app/), but none of them hit the mark for me. They just don't seem to push the search and data insights as far as I'd like.
I'm going to be posting updates on Twitter and here on the blog as I make progress. If you want to follow along, feel free to subscribe to my newsletter or follow me on Twitter. Still figuring out a name for this thing – got a few ideas, but nothing's quite right yet. If you have any suggestions, let me know, I'm all ears!
