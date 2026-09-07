"use client";

import { LegalPage, type LegalSectionDef } from "@/components/legal-page";

const SECTIONS: LegalSectionDef[] = [
  {
    heading: "Who we are",
    blocks: [
      {
        type: "p",
        text: "Smash Modding Academy is an independent, community run educational project. We are not a company, and we are not affiliated with, endorsed by, or connected to Nintendo, HAL Laboratory, Sora Ltd., or any other rights holder associated with Super Smash Bros. Ultimate.",
      },
      {
        type: "p",
        text: "Super Smash Bros. Ultimate and all related names, characters and imagery are the property of their respective owners. They are referred to here only to describe and teach about the game.",
      },
    ],
  },
  {
    heading: "Modding is done at your own risk",
    blocks: [
      {
        type: "p",
        text: "This is the most important thing on this page. The site publishes information about modifying game files. Following that information is entirely your own decision and your own responsibility. In particular, you should understand that:",
      },
      {
        type: "list",
        items: [
          "Modifying a game may breach the terms of service or end user licence agreement of the game, the console, or an online service.",
          "Using mods online can get your account or hardware suspended or permanently banned from online services.",
          "Modding can corrupt save data, brick a console, or otherwise damage hardware and software beyond repair.",
          "Laws about modifying software, circumventing technical protection measures, and obtaining game files differ from country to country. You are responsible for knowing and following the law where you live.",
        ],
      },
      {
        type: "p",
        text: "We do not host, link to, or help you obtain copyrighted game files. Nothing on this site should be read as encouragement to pirate a game, break the law, or breach any agreement you are party to. You accept all risk arising from anything you do with the information here.",
      },
    ],
  },
  {
    heading: "Accounts",
    blocks: [
      {
        type: "p",
        text: "Reading the site does not require an account. If you create one, you sign in through Google, GitHub or Discord, and we never see or store your password for those services.",
      },
      {
        type: "list",
        items: [
          "You are responsible for activity that happens under your account.",
          "Choose a username that is not impersonating someone else, offensive, or misleading.",
          "We may suspend or remove an account that is being used to break these terms.",
          "You can ask us to delete your account and its data at any time. See the [Privacy Policy](/privacy).",
        ],
      },
    ],
  },
  {
    heading: "Acceptable use",
    blocks: [
      { type: "p", text: "When using the site, please do not:" },
      {
        type: "list",
        items: [
          "Post content that is unlawful, harassing, hateful, or that infringes someone else's rights.",
          "Upload malware, or link to files that would harm someone's device.",
          "Attempt to gain access to accounts, data, or administrative functions that are not yours.",
          "Disrupt or overload the site, or scrape it in a way that degrades it for other people.",
          "Misrepresent yourself as staff, or as affiliated with a rights holder.",
        ],
      },
    ],
  },
  {
    heading: "Contributions to lessons",
    blocks: [
      {
        type: "p",
        text: "Some users are granted rights to write and edit lesson content. If you contribute, you keep ownership of what you write, but you give us a non exclusive, worldwide, royalty free licence to publish, display, edit, translate and distribute it as part of the site, including after you stop contributing.",
      },
      {
        type: "p",
        text: "You confirm that what you submit is your own work, or that you have the right to submit it, and that publishing it does not infringe anyone else's rights. Contributions may be edited, reordered, or removed at our discretion, and edits from some contributors are reviewed before they go live.",
      },
    ],
  },
  {
    heading: "Our content",
    blocks: [
      {
        type: "p",
        text: "Lesson text and site design are made available for you to read, learn from, and share links to. Please do not republish substantial parts of the site elsewhere as if it were your own. If you would like to translate or reuse a lesson, ask us first. The answer is usually yes.",
      },
    ],
  },
  {
    heading: "Donations",
    blocks: [
      {
        type: "p",
        text: "Donations are voluntary and are handled by Ko-fi, not by us. They pay for hosting and running costs. A donation does not buy a product, a service, early access, or any influence over what the site publishes, and it does not create a membership or subscription with us. Refunds are subject to Ko-fi's own policies.",
      },
    ],
  },
  {
    heading: "Advertising",
    blocks: [
      {
        type: "p",
        text: "The site may display advertising in future to help cover its costs. Where it does, adverts will be identifiable as adverts, and any data practices introduced by an advertising provider will be described in the [Privacy Policy](/privacy) before or when they begin. We are not responsible for the content of third party adverts or for the sites they link to.",
      },
    ],
  },
  {
    heading: "Third party links and services",
    blocks: [
      {
        type: "p",
        text: "The site links to external places such as Discord, GitHub, Ko-fi and modding tools. We do not control those services and are not responsible for their content, availability, or how they handle your data. Their own terms and policies apply when you use them.",
      },
    ],
  },
  {
    heading: "No warranty",
    blocks: [
      {
        type: "p",
        text: "The site is provided as is, without warranties of any kind. We work to keep lessons accurate, but modding tools and games change constantly, and some information will inevitably go out of date or turn out to be wrong. We do not guarantee that the site will be available, uninterrupted, error free, or that following a lesson will produce a particular result.",
      },
    ],
  },
  {
    heading: "Limitation of liability",
    blocks: [
      {
        type: "p",
        text: "To the fullest extent permitted by law, we are not liable for any loss or damage arising out of your use of the site or of any information on it. That includes damage to hardware, software, save data or accounts, loss of access to online services, and lost data. Some jurisdictions do not allow certain limitations, so parts of this section may not apply to you.",
      },
    ],
  },
  {
    heading: "Changes",
    blocks: [
      {
        type: "p",
        text: "We may update these terms as the site changes. The date at the top shows when they were last revised. Continuing to use the site after a change means you accept the updated terms.",
      },
    ],
  },
  {
    heading: "Contact",
    blocks: [
      {
        type: "p",
        text: "Questions about these terms, or a request to remove something, can be raised on our [contact page](/contact).",
      },
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      prefix="terms"
      title="Terms of Use"
      updated="7 September 2026"
      intro="Smash Modding Academy is a free, community run site that teaches modding for Super Smash Bros. Ultimate. By using the site you agree to the terms below. If you do not agree with them, please do not use the site."
      sections={SECTIONS}
    />
  );
}
