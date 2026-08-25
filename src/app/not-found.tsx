import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <Link className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-primary-foreground" href="/home">Back to dashboard</Link>
      </section>
    </main>
  );
}
