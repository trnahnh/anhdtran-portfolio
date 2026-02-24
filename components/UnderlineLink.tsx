import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface UnderlineLinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  showIcon?: boolean;
  className?: string;
}

export default function UnderlineLink({
  href,
  children,
  external = false,
  showIcon = true,
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
        {showIcon && (
          <ExternalLink className="inline-block w-3.5 h-3.5 ml-1 -mt-0.5" />
        )}
      </a>
    );
  }

  return (
    <Link href={href} className={`${baseClasses} ${className}`}>
      {children}
    </Link>
  );
}
