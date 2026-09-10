'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  Phone,
  ShieldCheck,
  Signal,
  Smartphone,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, homeFor } from '@/lib/auth';
import { useUssdCode } from '@/lib/public-info';
import { accentVars } from '@/lib/utils';

/**
 * The public front door.
 *
 * This page deliberately does NOT redirect a signed-in visitor into the app.
 * Typing the bare address should land you here every time — closing a tab on
 * some deep screen and coming back to "localhost:3000" used to drop you back
 * on that old screen, which read as the app having never let go. Signed-in
 * visitors simply get a "Go to my dashboard" button instead of "Sign in".
 */

const CHANNELS = [
  {
    icon: Smartphone,
    title: 'Patients dial a short code',
    body: 'No smartphone, no data bundle, no account, no app to install. Any handset that can make a call can book, check or cancel an appointment.',
    accent: 1,
  },
  {
    icon: ClipboardList,
    title: 'Staff work one diary',
    body: 'Front desk, doctors and administrators share a single appointment book. A booking made over USSD appears there the moment it is made.',
    accent: 0,
  },
  {
    icon: ShieldCheck,
    title: 'Accounts are issued, not opened',
    body: 'There is no public sign-up. An administrator creates each staff login and can switch it off the day someone leaves. Every action is logged.',
    accent: 3,
  },
];

const STEPS = [
  { icon: Phone, title: 'Dial', body: 'The patient dials the hospital short code from any phone.' },
  { icon: Users, title: 'Choose', body: 'They pick a department, a doctor and a time from the menu.' },
  { icon: CalendarCheck, title: 'Confirmed', body: 'They get a reference to read back, and the clinic sees the booking.' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();

  const signedIn = !loading && Boolean(user);
  const destination = user ? homeFor(user) : '/login';
  const ussdCode = useUssdCode();

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md panel-surface text-white">
              <Activity className="h-4 w-4" />
            </span>
            <span className="font-display text-lg text-ink">MedConnect</span>
          </span>

          {signedIn ? (
            <Button size="sm" asChild>
              <Link href={destination}>
                <LayoutDashboard className="h-4 w-4" /> Go to my dashboard
              </Link>
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link href="/login">
                Staff sign in <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="panel-surface text-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
              <Signal className="h-3.5 w-3.5" /> USSD + web, one appointment book
            </span>

            <h1 className="mt-5 font-display text-4xl leading-tight lg:text-[52px]">
              Appointments for every patient, not just the connected ones.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70">
              MedConnect lets patients book by dialling a short code from any phone — no smartphone, no internet, no
              account. Those bookings land in the same diary your front desk and doctors already work from.
            </p>

            {/* The one thing a patient needs from this page. */}
            <div className="mt-8 inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-4">
              <Phone className="h-5 w-5 shrink-0 text-white/70" />
              <div>
                <p className="text-xs uppercase tracking-wide text-white/60">Patients dial</p>
                <p className="font-mono text-2xl font-semibold tracking-wide lg:text-3xl">{ussdCode}</p>
              </div>
              <p className="text-xs leading-relaxed text-white/60">
                From any phone.
                <br />
                No internet needed.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="signal" asChild>
                <Link href={destination}>
                  {signedIn ? 'Go to my dashboard' : 'Staff sign in'} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link href="#how-it-works">How it works</Link>
              </Button>
            </div>

            <p className="mt-6 text-xs text-white/45">
              Patients never sign in here. This entrance is for hospital staff only.
            </p>
          </div>

          {/* A handset showing the menu a patient actually sees. */}
          <div className="mx-auto w-full max-w-[280px]">
            <div className="rounded-[2rem] border-[8px] border-black/25 bg-black/25 p-1 shadow-panel">
              <div className="overflow-hidden rounded-[1.5rem] bg-black/20">
                <div className="flex items-center justify-between px-4 pb-1 pt-2.5 text-[10px] text-white/50">
                  <span className="font-mono">{ussdCode}</span>
                  <span className="flex items-center gap-1">
                    <Signal className="h-3 w-3" />
                    <Smartphone className="h-3 w-3 opacity-40" />
                  </span>
                </div>
                <div className="ussd-screen min-h-[240px] bg-[#dff0e6] px-4 py-3 text-[13px] text-ink">
{`Welcome to MedConnect
1. Book an appointment
2. My appointments
3. Cancel an appointment
4. Reschedule
5. Help`}
                </div>
                <div className="px-4 py-3 text-center text-[10px] text-white/40">Works on any handset</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What it is */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
        <h2 className="max-w-2xl font-display text-2xl text-ink lg:text-3xl">
          Two ways in, and nothing falls between them.
        </h2>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {CHANNELS.map((item) => (
            <div
              key={item.title}
              style={accentVars(item.accent)}
              className="tile rounded-xl border border-border bg-card p-6 shadow-panel"
            >
              <span className="tile-icon flex h-10 w-10 items-center justify-center rounded-lg">
                <item.icon className="h-5 w-5" />
              </span>
              <p className="tile-value mt-4 font-display text-lg text-ink">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How USSD booking works */}
      <section id="how-it-works" className="border-y border-border bg-secondary/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
          <h2 className="font-display text-2xl text-ink lg:text-3xl">What a patient does</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Three steps, on a phone that costs less than a data bundle.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                style={accentVars(index)}
                className="tile rounded-xl border border-border bg-card p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="tile-icon flex h-9 w-9 items-center justify-center rounded-lg">
                    <step.icon className="h-4 w-4" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">Step {index + 1}</span>
                </div>
                <p className="tile-value mt-4 font-display text-lg text-ink">{step.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sign-in prompt */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
        <div
          style={accentVars(0)}
          className="tile flex flex-col items-start justify-between gap-6 rounded-xl border border-border bg-card p-8 shadow-panel sm:flex-row sm:items-center"
        >
          <div>
            <p className="font-display text-xl text-ink">
              {signedIn ? `Welcome back, ${user?.fullName}.` : 'Hospital staff?'}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {signedIn
                ? 'Pick up where the clinic is right now.'
                : 'Sign in with the username your administrator gave you.'}
            </p>
          </div>
          <Button size="lg" asChild>
            <Link href={destination}>
              {signedIn ? 'Open my dashboard' : 'Sign in'} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>MedConnect — a USSD-web hybrid appointment scheduling system.</p>
          <p>Authorised staff access only. Activity is logged.</p>
        </div>
      </footer>
    </main>
  );
}
