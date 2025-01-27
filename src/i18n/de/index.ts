import type { Translation } from "../i18n-types";

const de = {
  images: {},
  home: {
    metaTitle: "Michael Heckmann",
    metaDescription:
      "Ich entwickle digitale Lösungen, die funktionieren und sich gut anfühlen.",
    description:
      "Ich entwickle digitale Lösungen, die funktionieren und sich gut anfühlen. Mein Hintergrund liegt in der Full-Stack-Entwicklung, mit besonderem Interesse daran, neue und interessante Wege der Mensch-KI-Interaktion zu gestalten.",
    work: "Ich habe zuvor bei {0|atag} und {1|atag} in den Bereichen Datenanalyse and Automatisierung gearbeitet. Aktuell widme ich mich eigenen Projekten und entwickle Websites für ausgewählte Kunden. Mich fasziniert besonders, wie Technologie Prozesse vereinfachen und neuartige Erlebnisse schaffen kann.",
    building: {
      title: "Entwicklung",
      github: "Open-Source-Projekte und Experimente.",
      blog: "Artikel über Technologie und Design.",
    },
    projects: {
      title: "Projekte",
      amay: "Psychische Gesundheit durch KI unterstützen.",
      qart: "E-Commerce einfacher zugänglich machen.",
    },
    connect: {
      title: "Kontakt",
      linkedIn: "Berufliches Netzwerk und Lebenslauf.",
      twitter: "Gedanken, Ideen und Updates.",
      email: "Direkte Anfragen und Zusammenarbeit.",
    },
  },
  blog: {
    metaTitle: "Blog | Michael Heckmann",
    metaDescription:
      "Ich schreibe über Technologie, Design und den Schnittpunkt beider Disziplinen. Mein Ziel ist es, Wissen zu teilen und Gespräche anzuregen.",
    back: "Zurück",
    viewAll: "Alle Beiträge anzeigen",
  },
} satisfies Translation;

export default de;
