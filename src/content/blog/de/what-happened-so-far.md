---
title: "Orbit: Was bisher geschah"
description: "Ein ehrliches Update zur Entwicklung von Orbit: die Herausforderungen zwischen Auftragsarbeiten und eigenem Produkt, wichtige technische Verbesserungen und warum es jetzt Zeit ist zu shippen."
pubDate: "Oct 19 2025"
cover: "../assets/what-happened-so-far/hero.webp"
coverAlt: "Nahaufnahme eines Löwenzahn-Samens, bei der einzelne Samen durch den Wind vor einem dunklen Hintergrund davongetragen werden."
colors: ["#010101", "#121414"]
tags: ["Orbit", "Entwicklung", "Entrepreneur"]
reference: "what-happened-so-far"
---

# Orbit: Was bisher geschah

Ich will ehrlich sein. Ich habe in den letzten paar Monaten bei [Orbit](https://reachorbit.app/) nicht die Fortschritte gemacht, die ich mir erhofft hatte. In diesem Post erzähle ich von der Entstehung von Orbit, was in den letzten Monaten passiert ist und wo das Projekt gerade steht.

## Hintergrund zu meinem Fortschritt

Anfang des Jahres habe ich mich selbstständig gemacht, um meine eigenen Software Produkte zu programmieren. Ich wollte Tools entwickeln, die ich selber nutzen würde. Apps, die nicht auf riesiges Wachstum ausgelegt sein müssen, die einfach gut funktionieren und einen need erfüllen, den ich selber habe.

Um finanziell nicht allzu lange auf dem Trockenen sitzen zu müssen, habe ich angefangen Auftragsarbeiten zu machen und meine Services als Softwareentwickler anzubieten. Ich habe in den letzten Monaten an tollen Projekten gearbeitet, zum Beispiel an einer [Webplattform](https://github.com/StanfordSpezi/spezi-web-study-platform), die es Researchern erlaubt Teile der technischen Infrastruktur ihrer Studien in einer no-code Umgebung zu konfigurieren.

Ich habe festgestellt, dass die Versuchung wirklich groß ist, sich hauptsächlich auf Auftragsarbeiten zu fokussieren und die eigenen Produkte zu vernachlässigen. Mit einem Projekt wie der Study Platform kann man direkt seinen Stundensatz abrechnen. Bei Orbit muss erstmal viel unbezahlte Arbeit investiert werden.

Das hat dazu geführt, dass ich mehr Zeit in den Servicearm meiner Selbstständigkeit gesteckt habe und Orbit dadurch vernachlässigt habe. Deshalb war der Fortschritt über die letzten Monate leider nicht so groß, wie geplant. Das soll sich nun aber ändern. Ich werde mich jetzt wieder mehr auf Orbit konzentrieren. Ich möchte auch mehr schreiben, mehr dokumentieren, mehr teilen. Hier auf dem Blog und auf [Twitter / X](https://x.com/mt_heckmann).

Ich war jedoch nicht untätig. Also, was hat sich an Orbit in den letzten Monaten getan?

## Orbit in den letzten Monaten

### Performance

Ich möchte, dass Orbit die beste App ist um Sachen auf deinem Mac zu finden. Dabei setze ich weniger auf AI-Features (wobei ich da ein paar spannende Features wüsste), sondern auf ein schnelles und zuverlässiges System, das mit minimalem Speicherplatz und Ressourcen möglichst viel von deiner Arbeit erfasst. Screenshots, die aktuelle URL, den Link zur aktuellen Datei, den Zustand eines Webpage Formulars, usw.

Mein größter Kritikpunkt an Rewind ist die Performance. Ich habe mit Rewind ein Jahr an Bildschirmaufzeichnungen gespeichert und muss feststellen, dass die Suchperformance mit dieser Datenmenge leider enttäuschend ist. Es dauert eine gewisse Zeit, bis Suchergebnisse kommen, die Suchmöglichkeiten sind nicht ausgeprägt genug und das Programm stürzt immer wieder ab. Da mir das Thema so wichtig ist, habe ich mich die letzten Monate nochmal an einige Performance Themen gesetzt und an einigen Stellschrauben gedreht, um die Speicher-, Systemressourcen-, Retrieval- und Renderperformance zu verbessern.

### Refactor der Recording Binary

Die Architektur der App ist sehr von [Screenstudio](https://screen.studio/) inspiriert. Screenstudio ist eine Electron-App mit einer nativen Recording Binary. Die Recording Binary übernimmt die Bildschirmaufnahme und das Erfassen von Metadaten (z.B. Mausposition) während die Electron App die UI rendert und das Editing der Videos übernimmt. Meine Expertise liegt in Webtechnologie, weshalb es für mich von Anfang an Sinn gemacht hat, die App mit dem Tech-Stack zu entwickeln, der mir vertraut ist. Auch Orbit hat eine native Recording Binary, die für die Bildschirmaufnahme und das Speichern der Metadaten zuständig ist.

Dazu musste ich mich an Swift und die verschiedenen MacOS APIs heranwagen. Gerade die Aspekte rund um concurrency, async work und threads haben mich teilweise echt zum verzweifeln gebracht und die erste Version des Codes hatte zwar funktioniert, war aber unnötig komplex und nur schwer nachvollziehbar. Deshalb habe ich mir das _simplify, simplify, simplify_ Motto zu Herzen genommen und den Code nochmal in großen Teilen umgeschrieben. Die aktuelle Version ist nun deutlich eleganter, einfacher und robuster.

### Testing

Man kann sich darüber streiten, wie wertvoll Tests sind, wann und in welchem Umfang man sie nutzen sollte und was genau getestet werden soll. Gerade bei einer App wie Orbit, die stark mit dem Betriebssystem arbeitet, war das Testing Setup nicht ganz so einfach, wie bei den Webapps, die ich sonst entwickle. Aber für mich und meinen peace of mind war es wichtig, ein paar kritische E2E tests und unit tests zu haben, die mir versichern, dass zumindest die Kernteile der App funktionieren.

Ich weiß nicht, ob das anderen Solo Developern ähnlich geht, aber ich mache mir oft Sorgen um kritische Bugs oder Performance-Einbrüche. Das ist zu einem gewissen Grad verständlich und sogar nützlich. Es hat mich allerdings auch paralysiert, was Distribution, Marketing und das Anheuern von Beta-Testern angeht. Ich hoffe, dass mir das mit dieser Testing-Infrastruktur jetzt leichter fällt.

### Verschlüsselte Bildschirmaufzeichnungen

Neben der Reliability und Performance ist mir Datenschutz und Datensicherheit sehr wichtig. Deshalb habe ich von Anfang die wichtigsten Sicherheitsfeatures priorisiert. Neben der verschlüsselten Datenbank sind jetzt auch die Bildschirmaufzeichnungen verschlüsselt. Im Gegensatz zu den Rewind Daten kann niemand einfach die rohen Orbit Aufnahmen öffnen und anschauen.

### Rewind Import

Mir war es wichtig, eine Funktionalität zu haben, die es mir erlaubt meine Rewind Daten zu importieren, schließlich hatte ich ein ganzes Jahr an Aufzeichnungen, die ich nicht verlieren wollte! Deshalb habe ich einen Importer entwickelt, der nach Rewind Daten auf deinem Gerät sucht und dir dann die Möglichkeit gibt alle Daten oder nur einzelne Monate zu importieren. Dabei bleiben die Bildschirmaufzeichnungen an ihrem Ort und nur die Metadaten werden in die Orbit Datenbank integriert.

Der Import funktioniert grundsätzlich, jedoch gibt es noch einiges an Optimierungsbedarf: Die Import-Geschwindigkeit ist noch zu langsam, die Deduplikationslogik bei mehrfachen Imports ist nicht robust genug und es fehlt noch eine Funktion um auch die Bildschirmaufzeichnungen zu kopieren (und dabei zu verschlüsseln). Das kommt alles auf die Todo Liste für die Zukunft.

## Wie es jetzt weitergeht

Ich habe, wie viele andere Entwickler bestimmt auch, Skrupel die App in die Hände von anderen zu geben. Die Todo Liste ist lang und das Produkt ist noch immer in einem Zustand, den ich nicht mit stolzer Brust präsentieren kann. Aber ich weiß, dass ich mit dem Release schon zu lange gewartet habe. Das schlimmste Szenario wäre, wenn Orbit als Projekt einfach stirbt, ohne dass es je das Licht der Welt erblickt hätte. Ich weiß, dass die App schon jetzt wertstiftend ist, auch wenn sie an vielen Stellen noch scharfe Kanten hat.

Deshalb geht es jetzt, neben der Weiterentwicklung von Orbit, für mich verstärkt darum, das Produkt in die Welt zu tragen. Die Entwicklung zu dokumentieren, Leute darauf aufmerksam zu machen, Spaß und Erfüllung an diesen Aufgaben zu finden. Neben der technischen Entwicklung, den Feature Updates, usw. werde ich auch das inner game der Reise dokumentieren. Ich glaube, dass es anderen Entwicklern helfen kann, ich glaube, dass es mir geholfen hätte.
