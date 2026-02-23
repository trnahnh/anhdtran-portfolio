import type { OutputLine } from "./commands";

export const WELCOME_LINES: OutputLine[] = [
  { type: "accent", text: "" },
  { type: "accent", text: "Anh Tran \u2014 Portfolio Terminal" },
  {
    type: "response",
    text: "Type 'help' to get started or click 'Esc' to exit.",
  },
  { type: "accent", text: "" },
];
