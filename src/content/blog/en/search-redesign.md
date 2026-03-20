---
title: "Designing for vague memories: Why I moved away from keyword-first"
description: "Why I've replaced Orbit's search bar with a visual timeline. A look into designing a lightweight entry point that matches how people actually remember."
pubDate: "Mar 20 2026"
cover: "../assets/search-redesign/hero.webp"
coverAlt: "A blurred, vintage-style black and white photo of a bulletin board covered in pinned notes, polaroid photos, and small dried flowers, representing the fragmented nature of memory."
colors: ["#CDC4B2", "#90847C"]
tags: ["Development", "Orbit", "Design"]
reference: "search-redesign"
---

# Designing for vague memories: Why I moved away from keyword-first

If you're building a tool that lets people revisit their screen history, what should it look like when it opens?

When I was first designing the entry point of [Orbit](https://reachorbit.app), it felt like an obvious answer: you need to find something, you remember a word, you type it, you land on a matching screenshot. That made complete sense to me because that's how I search.

The feedback that complicated this was simple. People kept asking for a way to open the timeline directly, without typing anything first. It came up enough that I really had to look into this and investigate why users were asking for it.

## Why I thought keyword-first was obvious

My reasoning was: if you're trying to find something you lost, you had a reason to remember it. That reason usually involves words. A name, a number, a phrase from the thing you were reading. So the shortest path should be straight from word to screen capture.

![Mockup of the old search input](../assets/search-redesign/search-1.webp)

<figcaption>A screenshot from the current design.</figcaption>

This isn't exactly wrong. But it assumes you start retrieval with a specific term already formed in your head. A lot of the time you don't. You come in with something vaguer: a rough sense of when it happened, what you were working on, maybe just a direction. Something like "I think I saw the invoice in my browser or in my emails sometime this morning." The search box has nothing to offer until you can translate any of that into a keyword.

That friction is small, but it's the kind of small that prevents a habit from forming.

## What the old flow actually looked like

To see why users were frustrated, it helps to walk through the old flow:

You'd open the search launcher, type a search query, get a grid of matching screenshots, double-click one of them, and _then_ land in the timeline view where you could scrub around from that point. The timeline was always there. It just required a search result to get to it.

Based on the feedback, I added a second shortcut that jumped directly to the timeline at the latest capture. But having two separate entry points into the same app felt wrong. It means users have to make a decision before they've even started. The whole point of a quick-access tool is that you don't want to think about how to open it.

So the goal became collapsing both paths into one.

## What I've noticed watching people use it

From watching people use the app, what's become clear is that when you're trying to find something in your screen history, you rarely remember it directly. You usually have some piece of it: a rough time range, what app you were in, maybe something visual. You start from that one thing and piece the rest together as you go. You might start to remember certain keywords or recognize a certain window arrangement that gives you important clues on how to improve your search.

What I've also noticed is that what you start from varies a lot between people. Some come in with a keyword ready. Others know it was relative to something else. Others just remember something about what it looked like on screen. None of these is more valid than another. They're just different ways in.

The search box handles the keyword case well and mostly ignores the rest. If you know the word, it gets you there fast. If you don't, it just sits there waiting. The goal with this redesign is to give everyone a better first step, regardless of which cue they happen to start from.

## The redesigned starting point

The new launcher is designed similarly to Quick Look windows on macOS: a floating window that pops up over whatever you're working on. But instead of a blank input, it opens directly to the most recent screenshot.

![Mockup of the new search input](../assets/search-redesign/search-2.webp)

<figcaption>A first exploration of the new search input.</figcaption>

When you open Orbit, you see what the app most recently captured. That orients you immediately. If you're looking for something from this morning, you just have to scroll back a few hours. There's a timeline strip along the bottom that just shows which hours of the day have recordings. That sparseness is intentional. The goal is for the window to feel like a quick tool, not something you have to sit down with. You scrub across it and get thumbnail previews as you move, like hovering over a YouTube progress bar. The detail arrives when you reach for it, not before.

![Mockup of the new search input](../assets/search-redesign/search-3.webp)

<figcaption>Another iteration of the new search input, showing the timeline strip.</figcaption>

Getting that strip to feel right took longer than almost anything else in this version. Too much information upfront and the window feels heavy and busy. Too little and it's not useful. The edge I was trying to find was: enough to navigate, not so much that reaching for it feels like work. I don't think I have it perfectly, but I have it closer than before.

![Mockup of the new search input](../assets/search-redesign/search-4.webp)

<figcaption>Another idea for the new search input. Interesting, but didn't make the cut.</figcaption>

## Powerful and lightweight at the same time

There's a tension between making a tool powerful and making it feel lightweight. Powerful usually means more commands, more context, more options. Lightweight means you open it and know immediately where to look and what to do. Getting both at once is a tough design problem, and I don't think any screen memory tool I've used has fully solved it.

The habit of reaching for a tool only forms if opening it costs less than just doing the thing manually. That's the bar I'm designing against: it should be faster and better to search for something in Orbit than to switch to your email client or browser history and search there.

## Search is still there, just harder to reach

If you come in with a keyword ready, that's now a secondary path. Text search still works: go to the search screen, type a word, and you'll pull up every screenshot where it appeared. But it now takes more steps than it used to. For people who come in with a keyword already in mind, that's a step backward.

What I want is for both approaches to feel equally fast, whether you're starting from "sometime around 3pm" or "the vegan Shakshuka recipe." Right now the timeline gets priority. Getting them to the same level without making either feel cluttered is the design problem I haven't solved. One direction I'm considering: the timeline strip swaps into a search mode, so instead of stepping through time you're stepping through keyword matches. Same pattern, different axis. I can imagine that working. I can also imagine it being exactly the kind of thing that makes the interface feel slippery and unintuitive. I'll keep you updated on future iterations of the interface.

This is shipping in 1.0.0. If you want early access, head over to [reachorbit.app](https://reachorbit.app).

If you've thought about how to design an entry point when people don't always know what they're looking for, I'd genuinely like to hear it. I'm on [X](https://x.com/mt_heckmann), or you can reach me by [email](mailto:michael@heckmann.app).
