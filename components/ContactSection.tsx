"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import UnderlineLink from "./UnderlineLink";
import { contacts } from "@/lib/data/contacts";

export default function ContactSection() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkTheme();

    const observer = new MutationObserver(() =>
      requestAnimationFrame(checkTheme),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const getIconSrc = (contact: (typeof contacts)[0]) => {
    if (contact.iconLight && contact.iconDark) {
      return isDark ? contact.iconDark : contact.iconLight;
    }
    return contact.icon;
  };

  return (
    <section id="contact" className="fade-in-up fade-in-up-delay-3">
      <h2 className="text-lg font-medium mb-4">
        <span className="text-muted-foreground mr-2" aria-hidden="true">
          &#9670;
        </span>
        Contact
      </h2>
      <div className="space-y-2 pl-6 sm:pl-7">
        {contacts.map((contact) => {
          const iconSrc = getIconSrc(contact);
          return (
            <div
              key={contact.label}
              className="group text-muted-foreground flex items-center rounded-lg p-2 -mx-2 transition-all duration-300 hover:shadow-depth hover-lift hover:bg-black/3 dark:hover:bg-white/3"
            >
              <span className="mr-2" aria-hidden="true">
                &#8627;
              </span>
              {iconSrc && (
                <Image
                  src={iconSrc}
                  alt={contact.label}
                  width={18}
                  height={18}
                  className="mr-2 transition-transform duration-300 group-hover:scale-110"
                />
              )}
              <span className="text-foreground">{contact.label}:</span>
              <span className="ml-2">
                <UnderlineLink href={contact.href} external>
                  {contact.value}
                </UnderlineLink>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
