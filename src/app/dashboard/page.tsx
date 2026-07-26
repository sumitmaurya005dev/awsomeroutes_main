"use client";

import Link from "next/link";
import { LockKeyhole, Mail } from "lucide-react";

export default function DashboardLoginPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT SIDE */}

      <section className="hidden lg:flex flex-col bg-primary text-secondary p-14 min-h-screen">

  {/* Center Content */}
  <div className="flex flex-1 items-center justify-center">
    <div className="max-w-md">
      <h1 className="text-5xl font-bold tracking-tight">
        AwesomeRoutes
      </h1>

      <div className="mt-8 space-y-2">
        <h2 className="text-3xl font-semibold leading-tight">
          Welcome Back.
        </h2>

        <p className="text-lg leading-8 text-primary-foreground/85">
          Securely access your travel management dashboard,
          manage bookings, hotels, vehicles and customers
          from one centralized platform.
        </p>
      </div>
    </div>
  </div>

  {/* Bottom Content */}
  <div>
    <div className="mb-3 h-px w-full bg-primary-foreground/20" />

    <p className="text-sm text-primary-foreground/80">
      Powerful. Secure. Built for Modern Travel Businesses.
    </p>
  </div>

</section>

        {/* RIGHT SIDE */}

        <section className="flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">

            {/* Mobile Logo */}

            <div className="mb-10 lg:hidden">
              <h1 className="text-3xl font-bold text-primary">
                AwesomeRoutes
              </h1>

              <p className="mt-2 text-muted-foreground">
                Travel Management Platform
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-lg p-8">

              <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground">
                  Log In
                </h2>

                <p className="mt-2 text-muted-foreground">
                  Login to access your dashboard.
                </p>
              </div>

              <form className="space-y-5">

                {/* Email */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

                    <input
                      type="email"
                      placeholder="admin@awesomeroutes.com"
                      className="h-12 w-full rounded-lg border border-input bg-background pl-11 pr-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </div>

                {/* Password */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

                    <input
                      type="password"
                      placeholder="••••••••"
                      className="h-12 w-full rounded-lg border border-input bg-background pl-11 pr-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                    />
                    Remember me
                  </label>

                  <Link
                    href="#"
                    className="text-primary hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <button
                  className="h-12 w-full rounded-lg bg-primary font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Login
                </button>

              </form>
            </div>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Powered by{" "}
              <span className="font-semibold text-foreground">
                Webcentrikx Technologies
              </span>
            </p>

          </div>
        </section>

      </div>
    </main>
  );
}