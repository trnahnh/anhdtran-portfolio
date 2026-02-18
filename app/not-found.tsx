import UnderlineLink from "@/components/UnderlineLink";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <main className="max-w-2xl mx-auto px-6 py-16 sm:py-24">
        <div className="space-y-4 fade-in-up">
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight">
            <span className="text-muted-foreground mr-2">&#9670;</span>
            404
          </h1>
          <p className="text-muted-foreground pl-6 sm:pl-7">
            This page doesn&apos;t exist.
          </p>
          <div className="pl-6 sm:pl-7">
            <UnderlineLink href="/">Go back home</UnderlineLink>
          </div>
        </div>
      </main>
    </div>
  );
}
