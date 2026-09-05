'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, Eye, EyeOff, Lock, Smartphone, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/shared';
import { useAuth, homeFor } from '@/lib/auth';
import { errorMessage } from '@/lib/utils';

/**
 * The single way into the system.
 *
 * One form for all three roles: the account record decides where the person
 * lands, so nobody has to remember which URL belongs to their job. There is no
 * "create account" link anywhere, because there is no self-registration —
 * credentials come from an administrator.
 */
export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Do not make them do it again.
  useEffect(() => {
    if (!loading && user) {
      router.replace(user.mustChangePassword ? '/change-password' : homeFor(user));
    }
  }, [user, loading, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const signedIn = await signIn(identifier.trim(), password);
      router.replace(signedIn.mustChangePassword ? '/change-password' : homeFor(signedIn));
    } catch (err) {
      setError(errorMessage(err, 'Could not sign you in.'));
      setPassword('');
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-background lg:flex-row">
      {/* Identity panel */}
      <section className="flex flex-col justify-between panel-surface px-8 py-10 text-white lg:w-[42%] lg:px-14 lg:py-14">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
            <Activity className="h-4 w-4" />
          </span>
          <span className="font-display text-xl">MedConnect</span>
          <Link href="/" className="ml-auto text-xs text-white/60 transition-colors hover:text-white">
            &larr; Home
          </Link>
        </div>

        <div className="my-10 max-w-md lg:my-0">
          <h1 className="font-display text-3xl leading-tight lg:text-[40px]">
            One appointment book, two ways in.
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-white/65">
            Patients book by dialling a USSD short code from any phone — no smartphone, no data, no
            account. Every one of those bookings lands here, in the same diary your front desk and
            doctors work from.
          </p>

          <div className="mt-9 space-y-4 border-t border-white/10 pt-8">
            <div className="flex gap-3">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-white/45" />
              <p className="text-sm text-white/65">
                <span className="text-white">Patients use USSD.</span> They never sign in here.
              </p>
            </div>
            <div className="flex gap-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-white/45" />
              <p className="text-sm text-white/65">
                <span className="text-white">Staff sign in with issued credentials.</span> Accounts are
                created by an administrator only.
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/35">Authorised hospital staff only. Activity is logged.</p>
      </section>

      {/* Sign-in form */}
      <section className="flex flex-1 items-center justify-center px-6 py-12 lg:px-10">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl text-ink">Sign in</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Use the username your administrator gave you.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <Alert variant="danger" role="alert">
                {error}
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="identifier">Username</Label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="identifier"
                  name="identifier"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="Your username"
                  autoComplete="username"
                  autoFocus
                  required
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner /> Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="mt-6 rounded-md border border-border bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
            Forgotten your password, or locked out after too many attempts? An administrator can issue
            you a new one from <span className="text-ink">Staff accounts</span>. Passwords cannot be
            reset from this screen.
          </p>
        </div>
      </section>
    </main>
  );
}
