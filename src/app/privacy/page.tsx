"use client";

import { LegalPage, type LegalSectionDef } from "@/components/legal-page";

const SECTIONS: LegalSectionDef[] = [
  {
    heading: "If you do not sign in",
    blocks: [
      {
        type: "p",
        text: "You can browse the entire site anonymously. We do not run analytics and we do not build a profile of you. The Advertising section below covers advertising cookies, which are the one thing that can change without you signing in.",
      },
      {
        type: "p",
        text: "Two things still happen in your own browser. Your light or dark theme choice is saved in your browser's local storage so the site remembers it, and that never leaves your device. Our host, Vercel, also processes standard web server request data such as your IP address in order to serve pages and protect against abuse.",
      },
    ],
  },
  {
    heading: "If you create an account",
    blocks: [
      {
        type: "p",
        text: "Accounts are created by signing in through Google, GitHub or Discord. We never see your password for those services. From that sign in we receive and store basic profile information, typically your email address, display name and avatar image, along with:",
      },
      {
        type: "list",
        items: [
          "The username you choose for the site.",
          "Which lessons you have marked as complete, so your progress persists across devices.",
          "Any staff role you have been given, and which courses or lessons you have been granted access to edit.",
          "If you contribute lesson content: the changes you make, attributed to your account, including changes still awaiting review.",
        ],
      },
      {
        type: "p",
        text: "Signing in also sets essential cookies that keep you logged in. These are required for the account to work and are not used for tracking or advertising.",
      },
    ],
  },
  {
    heading: "Why we hold it",
    blocks: [
      {
        type: "list",
        items: [
          "To sign you in and keep you signed in.",
          "To show your lesson progress back to you.",
          "To decide what you are allowed to edit, and to attribute contributions so edits can be reviewed and credited.",
          "To investigate abuse or misuse of the site.",
        ],
      },
      {
        type: "p",
        text: "We do not sell your personal information, and we do not share it with third parties for marketing.",
      },
    ],
  },
  {
    heading: "Who processes data for us",
    blocks: [
      {
        type: "list",
        items: [
          "Supabase hosts the database and handles authentication. Account details, progress and contributions are stored there.",
          "Vercel hosts and serves the site, and processes standard server request data.",
          "Google, GitHub and Discord are involved only if you choose one of them to sign in with, and only at the point of signing in.",
          "Ko-fi handles donations. Payments happen entirely on Ko-fi's own site under their privacy policy. We never see your payment details, and a donation is not linked to your site account.",
        ],
      },
    ],
  },
  {
    heading: "Publicly visible information",
    blocks: [
      {
        type: "p",
        text: "Some information is visible to other people by design: your chosen username, and, if you write or edit lessons, your attribution as an author or editor. Your email address is never shown publicly.",
      },
    ],
  },
  {
    heading: "Advertising",
    blocks: [
      {
        type: "p",
        text: "There is no advertising on this site today, and no advertising cookies are set.",
      },
      {
        type: "p",
        text: "We intend to introduce advertising to cover the site's running costs, served by Google AdSense. This section describes what that involves, so it is on the record before anything changes rather than after.",
      },
      {
        type: "p",
        text: "Google is a third party vendor and uses cookies to serve adverts on this site. Google's use of advertising cookies lets it and its partners serve adverts to you based on your visits to this site and to other sites on the internet. Other third party vendors may also set cookies or similar identifiers to select, deliver and measure adverts.",
      },
      {
        type: "list",
        items: [
          "You can turn off personalised advertising in [Google Ads Settings](https://myadcenter.google.com/).",
          "You can opt out of many third party vendors' cookies at [aboutads.info/choices](https://www.aboutads.info/choices/) or [youronlinechoices.eu](https://www.youronlinechoices.eu/).",
          "Your browser's own settings can block or delete cookies at any time.",
        ],
      },
      {
        type: "p",
        text: "Where the law requires your consent before advertising cookies are set, including in the UK and the European Economic Area, we will ask before any advert loads, and you will be able to change your answer afterwards. We do not let advertising partners use the information we hold about your account, and adverts are never targeted using your lesson progress or anything you have written on the site.",
      },
      {
        type: "p",
        text: "When advertising begins we will update the date at the top of this page and name any provider beyond Google.",
      },
    ],
  },
  {
    heading: "How long we keep it",
    blocks: [
      {
        type: "p",
        text: "Account information and progress are kept for as long as your account exists. If you ask us to delete your account, we remove your profile, your progress and your personal details.",
      },
      {
        type: "p",
        text: "Lesson content you contributed generally stays on the site, because it forms part of the published material other people rely on, but we will detach your name from it on request.",
      },
    ],
  },
  {
    heading: "Your rights",
    blocks: [
      {
        type: "p",
        text: "Depending on where you live you may have rights over your personal data, including the right to access it, correct it, have it deleted, or object to how it is used. You can exercise any of these by contacting us. We will respond as quickly as we reasonably can, though this is a volunteer run project, so please allow a little time.",
      },
    ],
  },
  {
    heading: "Children",
    blocks: [
      {
        type: "p",
        text: "The site is not directed at young children, and accounts are not intended for anyone under 13, or the minimum age for consent to data processing where you live if that is higher. If you believe a child has created an account, contact us and we will remove it.",
      },
    ],
  },
  {
    heading: "Security",
    blocks: [
      {
        type: "p",
        text: "Access to accounts and to editing tools is controlled, and passwords are never handled by us. No online service can promise perfect security, but we take reasonable steps to protect what we store and to limit how much we store in the first place.",
      },
    ],
  },
  {
    heading: "Changes",
    blocks: [
      {
        type: "p",
        text: "When this policy changes, the date at the top is updated. Material changes, such as introducing advertising, will be described here before they take effect.",
      },
    ],
  },
  {
    heading: "Contact",
    blocks: [
      {
        type: "p",
        text: "To ask a question, request your data, or ask for your account to be deleted, reach us through our [contact page](/contact). See also our [Terms of Use](/terms).",
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      prefix="privacy"
      title="Privacy Policy"
      updated="7 September 2026"
      intro="Smash Modding Academy collects as little about you as it reasonably can. You can read every lesson on this site without an account, without being tracked, and without us storing anything about you. This page explains what changes if you do sign in, and what happens to that information."
      sections={SECTIONS}
    />
  );
}
