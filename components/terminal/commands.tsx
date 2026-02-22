import { projects } from "@/lib/data/projects";
import { experiences } from "@/lib/data/experiences";
import { contacts } from "@/lib/data/contacts";

export type OutputLineType = "command" | "response" | "error" | "system" | "accent";

export interface OutputLine {
  type: OutputLineType;
  text: string;
}

const DOB = new Date(2006, 4, 11);

function getAge(): number {
  const today = new Date();
  let age = today.getFullYear() - DOB.getFullYear();
  const m = today.getMonth() - DOB.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < DOB.getDate())) age--;
  return age;
}

interface CommandDef {
  description: string;
  execute: () => OutputLine[];
}

const COMMANDS: Record<string, CommandDef> = {
  help: {
    description: "List all available commands",
    execute: () => {
      const entries = Object.entries(COMMANDS);
      const maxLen = Math.max(...entries.map(([name]) => name.length));
      const pad = maxLen + 3;
      const lines: OutputLine[] = [{ type: "accent", text: "" }];
      for (const [name, cmd] of entries) {
        lines.push({
          type: "response",
          text: `${name.padEnd(pad)}${cmd.description}`,
        });
      }
      lines.push({ type: "accent", text: "" });
      lines.push({
        type: "system",
        text: "Arrow keys for history  \u00B7  Tab to autocomplete  \u00B7  Esc to exit",
      });
      return lines;
    },
  },

  whoami: {
    description: "Who am I?",
    execute: () => [
      { type: "response", text: `Anh Tran, ${getAge()} \u2014 Full-stack Developer & Powerlifting Enthusiast` },
    ],
  },

  about: {
    description: "About me",
    execute: () => [
      { type: "accent", text: "" },
      { type: "response", text: "Hey! I'm Anh Tran, a full-stack developer from Vietnam based in Cincinnati." },
      { type: "response", text: `${getAge()} years old, currently studying and building software.` },
      { type: "response", text: "I love crafting polished user experiences and working on AI-powered tools." },
      { type: "response", text: "When I'm not coding, you'll find me powerlifting or deep-diving into anatomy." },
      { type: "accent", text: "" },
    ],
  },

  projects: {
    description: "List all projects",
    execute: () => {
      const lines: OutputLine[] = [{ type: "accent", text: "" }];
      projects.forEach((p) => {
        const alt = p.nameAlt ? ` ${p.nameAlt}` : "";
        const badge = p.status === "current" ? "  \u25CF active" : "";
        lines.push({ type: "accent", text: `${p.name}${alt}${badge}` });
        lines.push({ type: "response", text: p.description });
        if (p.techStack?.length) {
          lines.push({ type: "system", text: p.techStack.join(" \u00B7 ") });
        }
        lines.push({ type: "response", text: p.link });
        lines.push({ type: "response", text: "" });
      });
      return lines;
    },
  },

  experience: {
    description: "Work experience",
    execute: () => {
      const lines: OutputLine[] = [{ type: "accent", text: "" }];
      experiences.forEach((e) => {
        const badge = e.status === "current" ? "  \u25CF current" : "";
        lines.push({ type: "accent", text: `${e.title} @ ${e.company}${badge}` });
        if (e.description) {
          lines.push({ type: "response", text: e.description });
        }
        lines.push({ type: "response", text: "" });
      });
      return lines;
    },
  },

  contact: {
    description: "Contact information",
    execute: () => {
      const lines: OutputLine[] = [{ type: "accent", text: "" }];
      contacts.forEach((c) => {
        lines.push({ type: "response", text: `${c.label.padEnd(12)} ${c.value}` });
      });
      lines.push({ type: "accent", text: "" });
      return lines;
    },
  },

  skills: {
    description: "Technical skills",
    execute: () => {
      const techSet = new Set<string>();
      projects.forEach((p) => p.techStack?.forEach((t) => techSet.add(t)));
      const sorted = [...techSet].sort();
      return [
        { type: "accent", text: "" },
        { type: "response", text: sorted.join(" \u00B7 ") },
        { type: "accent", text: "" },
      ];
    },
  },

  clear: {
    description: "Clear terminal",
    execute: () => [],
  },

  theme: {
    description: "Toggle dark/light theme",
    execute: () => {
      const isDark = document.documentElement.classList.contains("dark");
      const newTheme = isDark ? "light" : "dark";
      localStorage.setItem("theme", newTheme);
      document.documentElement.classList.add("theme-transitioning");
      document.documentElement.classList.toggle("dark", newTheme === "dark");
      setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning");
      }, 300);
      return [
        { type: "system", text: `Switched to ${newTheme} mode.` },
      ];
    },
  },

};

export const COMMAND_NAMES = Object.keys(COMMANDS);

export function executeCommand(input: string): OutputLine[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  const commandDef = COMMANDS[cmd];
  if (!commandDef) {
    return [{ type: "error", text: `bash: ${cmd}: command not found` }];
  }

  return commandDef.execute();
}
