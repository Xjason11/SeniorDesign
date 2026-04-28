import { QuickPhraseEnvironment } from "../types/sign";

export const defaultQuickPhraseEnvironments: QuickPhraseEnvironment[] = [
  {
    id: "emergency",
    name: "Emergency",
    phrases: [
      "I need medical help.",
      "I do not feel safe.",
      "Please call my caregiver.",
      "I need help moving safely."
    ]
  },
  {
    id: "public",
    name: "Public",
    phrases: [
      "Where is the restroom?",
      "Please write that down.",
      "I need a quiet place.",
      "Can you repeat that slowly?"
    ]
  },
  {
    id: "school",
    name: "School",
    phrases: [
      "I need help with this assignment.",
      "Can I have more time?",
      "Please email the instructions.",
      "I need an interpreter.",
      "I do not understand the instructions.",
      "Can you write the homework down?"
    ]
  },
  {
    id: "doctor",
    name: "Doctor",
    phrases: [
      "I need a sign language interpreter.",
      "Where do I check in?",
      "I am in pain.",
      "Please explain the medicine.",
      "Can you write the diagnosis down?",
      "I need more time to answer."
    ]
  },
  {
    id: "restaurant",
    name: "Restaurant",
    phrases: [
      "Can I see the menu?",
      "I have a food allergy.",
      "Please point to the total.",
      "Can I have water?",
      "I am ready to order.",
      "Can I get the check?"
    ]
  }
];

export const defaultQuickPhraseEnvironmentId = defaultQuickPhraseEnvironments[0].id;
