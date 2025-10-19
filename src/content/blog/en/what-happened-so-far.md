---
title: "Orbit: The story so far"
description: "An honest update on Orbit's development journey: the challenges of balancing client work with building my own product, key technical improvements, and why it's time to ship despite the imperfections."
pubDate: "Oct 19 2025"
cover: "../assets/what-happened-so-far/hero.webp"
coverAlt: "Close-up image of a dandelion seed head with individual seeds being carried away by the wind against a dark background."
colors: ["#010101", "#121414"]
tags: ["Orbit", "Development", "Entrepreneur"]
reference: "what-happened-so-far"
---

# Orbit: The story so far

I want to be honest. I haven't made the progress on [Orbit](https://reachorbit.app/) over the last few months that I had hoped for. In this post, I'll share the origin story of Orbit, what's happened over the last few months, and where the project currently stands.

## Background on my progress

At the beginning of the year, I went independent to build my own software products. I wanted to develop tools that I would actually use myself. Apps that don't need to be designed for massive growth, that simply work well and fulfill a need that I personally have.

To avoid being financially stranded for too long, I started taking on client work and offering my services as a software developer. Over the last few months, I've worked on great projects, for example a [web platform](https://github.com/StanfordSpezi/spezi-web-study-platform) that allows researchers to configure parts of their study's technical infrastructure in a no-code environment.

I've realized that the temptation is really strong to focus mainly on client work and neglect your own products. With a project like the Study Platform, you can bill your hourly rate directly. With Orbit, a lot of unpaid work has to be invested first.

This led to me putting more time into the service arm of my business and consequently neglecting Orbit. That's why the progress over the last few months unfortunately wasn't as substantial as planned. But that's going to change now. I'm going to focus more on Orbit again. I also want to write more, document more, share more. Here on the blog and on [Twitter / X](https://x.com/mt_heckmann).

However, I haven't been idle. So, what's been happening with Orbit over the last few months?

## Orbit over the last few months

### Performance

I want Orbit to be the best app for finding things on your Mac. I'm focusing less on AI features (though I know of some exciting ones) and more on a fast and reliable system that captures as much of your work as possible with minimal storage space and resources. Screenshots, the current URL, the link to the current file, the state of a webpage form, etc.

My biggest criticism of Rewind is performance. I've stored a year's worth of screen recordings with Rewind and have to say that the search performance with this amount of data is unfortunately disappointing. It takes a certain amount of time for search results to appear, the search capabilities aren't sophisticated enough, and the program keeps crashing. Since this topic is so important to me, I spent the last few months tackling some performance issues and tweaking various parameters to improve storage, system resource, retrieval, and rendering performance.

### Refactor of the recording binary

The architecture of the app is heavily inspired by [Screenstudio](https://screen.studio/). Screenstudio is an Electron app with a native recording binary. The recording binary handles screen capture and metadata collection (e.g. mouse position) while the Electron app renders the UI and handles video editing. My expertise lies in web technology, which is why it made sense from the start to develop the app with the tech stack I'm familiar with. Orbit also has a native recording binary that's responsible for screen capture and saving metadata.

This required me to dive into Swift and the various macOS APIs. Especially the aspects around concurrency, async work, and threads made me pull my hair out at times, and the first version of the code worked but was unnecessarily complex and difficult to follow. So I took the _simplify, simplify, simplify_ motto to heart and rewrote large parts of the code. The current version is now significantly more elegant, simpler, and more robust.

### Testing

You can debate how valuable tests are, when and to what extent they should be used, and what exactly should be tested. Especially with an app like Orbit that works closely with the operating system, the testing setup wasn't quite as straightforward as with the web apps I usually develop. But for me and my peace of mind, it was important to have some critical E2E tests and unit tests that assure me that at least the core parts of the app are working.

I don't know if other solo developers experience this similarly, but I often worry about critical bugs or performance drops. That's understandable to a certain degree and even useful. However, it has also paralyzed me when it comes to distribution, marketing, and recruiting beta testers. I'm hoping that with this testing infrastructure, these things will be easier for me now.

### Encrypted screen recordings

Besides reliability and performance, data privacy and data security are very important to me. That's why I've prioritized the most important security features from the start. In addition to the encrypted database, the screen recordings are now also encrypted. Unlike Rewind data, no one can simply open and view the raw Orbit recordings.

### Rewind import

It was important to me to have functionality that allows me to import my Rewind data. After all, I had a whole year's worth of recordings that I didn't want to lose! So I developed an importer that searches for Rewind data on your device and then gives you the option to import all data or just individual months. The screen recordings stay in their location and only the metadata is integrated into the Orbit database.

The import works fundamentally, but there's still a lot of room for optimization: the import speed is still too slow, the deduplication logic for multiple imports isn't robust enough, and there's still a missing function to also copy (and encrypt) the screen recordings. All of that goes on the to-do list for the future.

## What happens next

Like many other developers I'm sure, I have qualms about putting the app in the hands of others. The to-do list is long and the product is still in a state that I can't present with a proud chest. But I know I've already waited too long to release. The worst-case scenario would be if Orbit as a project simply dies without ever seeing the light of day. I know the app is already valuable, even though it still has rough edges in many places.

So now, alongside the continued development of Orbit, my focus is increasingly on getting the product out into the world. Documenting the development, making people aware of it, finding joy and fulfillment in these tasks. In addition to the technical development, feature updates, etc., I'll also document the inner game of the journey. I believe it can help other developers, I believe it would have helped me.
