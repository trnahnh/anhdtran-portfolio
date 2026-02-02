export interface Contact {
  label: string;
  value: string;
  href: string;
  icon?: string;
  iconLight?: string;
  iconDark?: string;
}

export const contacts: Contact[] = [
  {
    label: "Email",
    value: "anhdtran.forwork@gmail.com",
    href: "mailto:anhdtran.forwork@gmail.com",
    icon: "/assets/gmail.png",
  },
  {
    label: "GitHub",
    value: "trnahnh",
    href: "https://github.com/trnahnh",
    iconLight: "/assets/github-lm.png",
    iconDark: "/assets/github-dm.png",
  },
  {
    label: "LinkedIn",
    value: "anhdtran11",
    href: "https://www.linkedin.com/in/anhdtran11",
    icon: "/assets/linkedin.png",
  },
  {
    label: "Instagram",
    value: "trnahnh",
    href: "https://www.instagram.com/trnahnh",
    icon: "/assets/instagram.png",
  },
];
