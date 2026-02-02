import Link from "next/link";

interface UnderlineLinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  className?: string;
}

export default function UnderlineLink({
  href,
  children,
  external = false,
  className = "",
}: UnderlineLinkProps) {
  const baseClasses = "underline-link interactive";

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClasses} ${className}`}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={`${baseClasses} ${className}`}>
      {children}
    </Link>
  );
}
