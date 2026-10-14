import type { Article } from "./types";

// Original prototype explainers, not syndicated publisher articles or live news.
export const articles: Article[] = [
  {
    id: "ai-curiosity", title: "A different kind of intelligence", topic: "AI", illustration: "ai", minutes: 3,
    description: "What changes when a machine learns patterns, rather than following a recipe?",
    author: "The Reading Room", source: "Original prototype essay", url: "https://www.nobelprize.org/prizes/physics/2024/summary/", kind: "editorial",
    paragraphs: [
      "We tend to understand new inventions through familiar ones. A car was once a horseless carriage. A computer became an electronic brain. Artificial intelligence invites the same temptation: we picture a mind, only faster, living inside a machine.",
      "That picture is useful until it hides the interesting differences. Many modern AI systems learn by adjusting a very large collection of numerical relationships. Examples shape those relationships; new inputs then produce outputs that reflect patterns in the training data. There is no tiny person inside, consulting a rulebook.",
      "A language model, for instance, can produce a convincing explanation because it has learned relationships among words, ideas and contexts. Conviction in its prose is not proof of accuracy. It can combine true fragments into an answer that sounds reasonable and is still wrong.",
      "The practical question is therefore less romantic than asking whether a machine thinks like us. What does this system do reliably? Where does it fail? Can we check its work, and what happens when we cannot? A useful assistant for brainstorming may be an unsuitable authority for a diagnosis.",
      "In 2024, the Nobel Prize in Physics recognised John Hopfield and Geoffrey Hinton for foundational discoveries and inventions that enable machine learning with artificial neural networks. It was a reminder that today’s tools grew from decades of research, connecting ideas in computation and physics.",
      "Curiosity and caution can belong together. We can admire a new capability, ask how it works, and insist on evidence for its claims. That combination makes room for a more interesting future than either unquestioning enthusiasm or automatic dismissal.",
    ],
  },
  {
    id: "medicine-evidence", title: "The quiet work behind a medical breakthrough", topic: "Medicine", illustration: "medicine", minutes: 3,
    description: "From a promising idea to evidence that makes a difference.",
    author: "The Reading Room", source: "Original prototype essay", url: "https://www.nobelprize.org/prizes/medicine/2023/summary/", kind: "editorial",
    paragraphs: [
      "A breakthrough usually arrives as a headline. The work that makes it possible rarely does. Before a new treatment reaches patients, researchers must ask a succession of stubborn questions: does the mechanism make sense, can it be reproduced, and does it help people more than it harms them?",
      "An early experiment may reveal an effect under carefully controlled conditions. That is a beginning, not a finished treatment. Studies in people must account for dose, side effects, comparison treatments and the differences between participants. Even a successful trial answers a particular question in a particular population.",
      "The 2023 Nobel Prize in Physiology or Medicine recognised Katalin Karikó and Drew Weissman for discoveries concerning nucleoside base modifications that enabled the development of effective mRNA vaccines against COVID-19. The award points to the patient, foundational work behind a widely noticed application.",
      "When reading medical news, notice the stage of the evidence. Was the study conducted in a laboratory, in animals, or in people? How many participants were involved? Does the headline describe what the study actually measured? A relative improvement can sound dramatic while the absolute difference remains small.",
      "None of these questions removes the excitement of discovery. They give it a scale. Good reporting makes uncertainty visible and distinguishes a promising possibility from an established benefit.",
      "This essay is general background, not guidance for personal treatment. For decisions about your own health, bring the underlying study and your questions to a qualified clinician who knows your circumstances.",
    ],
  },
  {
    id: "nobel-patience", title: "Discovery has a long memory", topic: "Nobel Prizes", illustration: "nobel", minutes: 2,
    description: "A prize can illuminate decades of questions, experiments and persistence.",
    author: "The Reading Room", source: "Original prototype essay", url: "https://www.nobelprize.org/prizes/", kind: "editorial",
    paragraphs: [
      "The announcement takes a moment. The discovery behind it may have taken a lifetime. Nobel Prizes invite us to look beyond that moment and follow an idea back through the questions that made it possible.",
      "A prize is a good doorway into a subject. The official Nobel website collects award motivations, biographical information, lectures and explanations. Reading the motivation first gives a useful anchor: what, precisely, is being recognised?",
      "Then the story opens out. Which problem had resisted earlier attempts? What new method changed the situation? Who built the instruments, refined the experiments or carried the work into other fields? A named award is only one frame around a much larger scientific community.",
      "The most rewarding reading often lives between the biography and the technical explanation. There we find the years of uncertainty, the unexpected observation and the apparently small question that later became consequential.",
      "This is an evergreen introduction, not a report of this year’s winners. For current announcements, dates and laureates, follow the official source below.",
    ],
  },
  {
    id: "tech-invisible", title: "The technology we stop noticing", topic: "Tech", illustration: "tech", minutes: 2,
    description: "Some of our most useful inventions become part of the furniture of daily life.",
    author: "The Reading Room", source: "Original prototype essay", url: "https://www.w3.org/standards/", kind: "editorial",
    paragraphs: [
      "We notice technology most when it is new, dazzling or broken. When it works quietly, it fades into the background. A link opens a page. A message arrives. A file moves between machines built by different companies.",
      "Much of that ordinary magic depends on shared agreements. Standards define how information is represented and exchanged. Their value is not always visible in a product photograph, but it becomes obvious when two systems cannot understand one another.",
      "The web is a particularly familiar example. Its usefulness comes partly from the possibility of moving between documents, devices and services through common conventions. Accessibility adds another question: can someone use the same information with a keyboard, a screen reader or enlarged text?",
      "An interface can be beautiful and still make that journey difficult. Tiny controls, text trapped in an image, and a layout that only works on one screen all put friction between a person and an idea.",
      "Perhaps the best compliment for a reading tool is that, after a few minutes, you stop thinking about it. The page settles, the controls make sense, and the article becomes the interesting thing in the room.",
    ],
  },
  {
    id: "crypto-trust", title: "What a blockchain can—and cannot—promise", topic: "Crypto", illustration: "crypto", minutes: 2,
    description: "A ledger, a set of rules, and the questions that remain outside them.",
    author: "The Reading Room", source: "Original prototype essay", url: "https://bitcoin.org/bitcoin.pdf", kind: "editorial",
    paragraphs: [
      "At its simplest, a blockchain is a way of organising records into linked batches and agreeing which history to accept. Different systems make that agreement in different ways. The details matter more than the fashionable label.",
      "Bitcoin’s original paper describes a peer-to-peer electronic cash system and a mechanism for ordering transactions without a central payment intermediary. That is a particular design for a particular problem, not a general guarantee that every project using a token is useful or trustworthy.",
      "A shared ledger can make certain records difficult to alter. It cannot, on its own, establish whether a claim about the outside world is true. If a system records that a physical item exists, someone still needs to verify the item. The ledger preserves an input; it does not magically validate reality.",
      "Likewise, the security of a network does not settle the safety of an exchange, the honesty of a promoter, or the consequences of losing a private key. Those are distinct questions, and treating them as one is an easy way to misunderstand risk.",
      "When you read about crypto, separate the technical mechanism, the proposed use and the financial claim. Each needs its own evidence. This essay explains a concept; it does not recommend buying an asset.",
    ],
  },
];
