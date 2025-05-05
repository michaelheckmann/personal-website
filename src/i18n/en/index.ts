import type { BaseTranslation } from "../i18n-types";

const en = {
  images: {},
  layout: {
    back: "Back",
    click: "Click",
    tap: "Tap",
  },
  home: {
    metaTitle: "Michael Heckmann",
    metaDescription:
      "I build digital things that work well and feel right. My background is in full-stack development, with a particular interest in exploring new ways to interact with AI.",
    description:
      "I build digital things that work well and feel right. My background is in full-stack development, with a particular interest in exploring new ways to interact with AI.",
    work: " Previously worked on analytics and automation at {0|atag} and {1|atag}. Currently working on independent projects and crafting websites for select clients. Interested in exploring how technology can simplify tasks and create meaningful digital experiences.",
    building: {
      title: "Building",
      github: "Open source work and experiments.",
      blog: "Articles on technology and design.",
    },
    projects: {
      title: "Projects",
      orbit: "Find again what you didn't save.",
      amay: "Preventing mental health issues through AI.",
      qart: "Making e-commerce accessible for everyone.",
    },
    connect: {
      title: "Connect",
      linkedIn: "Professional network and resume.",
      twitter: "Thoughts, ideas, and updates.",
      email: "Direct inquiries and collaborations.",
    },
  },
  blog: {
    metaTitle: "Blog | Michael Heckmann",
    metaDescription:
      "I write about technology, design, and the intersection of the two. My goal is to share knowledge and spark conversations.",
    viewAll: "View all posts",
    copy: "Copy",
    copied: "Copied",
    autoTranslated: "AI translation from {0}",
    english: "English",
    german: "German",
    newsletter:
      "Want to know when I publish new content? Enter your email to join my free newsletter.",
    enterEmail: "Enter your email",
    newsletterSuccess: "You're now subscribed to the newsletter!",
  },
} satisfies BaseTranslation;

export default en;
