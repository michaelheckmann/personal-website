import type { BaseTranslation } from "../i18n-types";

const en = {
  images: {},
  home: {
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
    back: "Back",
    viewAll: "View all posts",
  },
} satisfies BaseTranslation;

export default en;
