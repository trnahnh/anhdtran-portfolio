import UnderlineLink from "./UnderlineLink";
import { contacts } from "@/lib/data/contacts";

export default function ContactSection() {
  return (
    <section id="contact" className="fade-in-up fade-in-up-delay-3">
      <h2 className="text-lg font-medium mb-4">
        <span className="text-muted-foreground mr-2">&#9670;</span>
        Contact
      </h2>
      <div className="space-y-2 pl-6 sm:pl-7">
        {contacts.map((contact) => (
          <div key={contact.label} className="text-muted-foreground">
            <span className="mr-2">&#8627;</span>
            <span className="text-foreground">{contact.label}:</span>
            <span className="ml-2">
              <UnderlineLink href={contact.href} external>
                {contact.value}
              </UnderlineLink>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
