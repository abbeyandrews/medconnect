'use client';

import { useEffect, useRef, useState } from 'react';
import { BatteryFull, PhoneCall, PhoneOff, RotateCcw, Signal, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_URL } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * A working handset against the real USSD endpoint.
 *
 * Every screen comes from `POST /api/ussd`, the same request a telecom gateway
 * sends, with the same accumulated `text` format. A booking made here is a real
 * booking and shows up in the appointment list.
 *
 * The result panel shows only the CURRENT exchange and replaces it on every
 * keypress, rather than appending to a growing log. A caller on a real handset
 * sees one screen at a time, and so does whoever is testing: press an option,
 * read the answer, no scrolling. Going back a step simply shows the earlier
 * screen again, because that is what the server returns.
 */

type Exchange = { from: 'phone' | 'network'; text: string; at: string };

function newSessionId() {
  return `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Pulls the numbered choices out of a screen so they can be pressed directly.
 * USSD menus are plain text, so this reads lines like "1. Book appointment"
 * and "0. Back" — anything else on the screen is left alone.
 */
function parseOptions(screen: string | null) {
  if (!screen) return [];
  return screen
    .split('\n')
    .map((line) => /^\s*(\d{1,2})[.)]\s*(\S.*?)\s*$/.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ key: match[1], label: match[2] }));
}

export function UssdSimulator({
  serviceCode = '*920*15#',
  onSessionEnd,
}: {
  serviceCode?: string;
  onSessionEnd?: () => void;
}) {
  const [phoneNumber, setPhoneNumber] = useState('0200000000');
  const [sessionId, setSessionId] = useState(newSessionId);
  const [accumulated, setAccumulated] = useState('');
  const [screen, setScreen] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [dialled, setDialled] = useState(false);
  const [buffer, setBuffer] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [failed, setFailed] = useState(false);

  /** The one exchange on show. Replaced outright by the next keypress. */
  const [current, setCurrent] = useState<{ sent: Exchange; received: Exchange } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (live && !busy) inputRef.current?.focus();
  }, [live, busy]);

  function stamp() {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  /**
   * `session` is passed in rather than read from state: `dial` generates a new
   * id and sends in the same tick, when the state update has not applied yet.
   * Reading it from the closure there would post the *previous* session id, and
   * the next keypress would arrive on an id the server had never seen — which
   * silently restarts the caller at the root menu.
   */
  async function send(text: string, label: string, session: string) {
    setBusy(true);
    setFailed(false);
    const sent: Exchange = { from: 'phone', text: label, at: stamp() };

    try {
      const response = await fetch(`${API_URL}/ussd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Exactly the payload a gateway posts.
        body: JSON.stringify({
          sessionId: session,
          phoneNumber: phoneNumber || '0200000000',
          serviceCode,
          text,
        }),
      });

      const raw = await response.text();
      const terminal = raw.startsWith('END');
      const body = raw.replace(/^(CON|END)\s?/, '');

      setScreen(body);
      setLive(!terminal);
      setStep((count) => count + 1);
      // Replaces the previous exchange rather than being appended to it.
      setCurrent({ sent, received: { from: 'network', text: raw, at: stamp() } });

      if (terminal) onSessionEnd?.();
    } catch {
      const message = `Could not reach the API at\n${API_URL}\n\nStart the backend:\n  cd backend && npm run dev`;
      setScreen(message);
      setCurrent({ sent, received: { from: 'network', text: message, at: stamp() } });
      setLive(false);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  function dial() {
    const id = newSessionId();
    setSessionId(id);
    setAccumulated('');
    setCurrent(null);
    setStep(0);
    setDialled(true);
    setLive(true);
    setScreen(null);
    // A fresh dial posts an empty text, as a real gateway does.
    send('', `Dialled ${serviceCode}`, id);
  }

  /** Sends one value. Used by the keypad options and by the Send button. */
  function press(value: string) {
    const trimmed = value.trim();
    if (!trimmed || busy || !live) return;

    // Gateways accumulate every keypress, joined with "*".
    const next = accumulated === '' ? trimmed : `${accumulated}*${trimmed}`;
    setAccumulated(next);
    setBuffer('');
    send(next, trimmed, sessionId);
  }

  function hangUp() {
    setLive(false);
    setDialled(false);
    setScreen(null);
    setAccumulated('');
    setBuffer('');
    setCurrent(null);
    setStep(0);
    setFailed(false);
    setSessionId(newSessionId());
    onSessionEnd?.();
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  const options = live ? parseOptions(screen) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Handset */}
      <div className="space-y-3">
        <div className="mx-auto w-[280px] rounded-[2rem] border-[8px] border-panel-deep bg-panel-deep p-1 shadow-panel">
          <div className="overflow-hidden rounded-[1.5rem] bg-panel-deep">
            <div className="flex items-center justify-between px-4 pb-1 pt-2.5 text-[10px] text-white/60">
              <span className="font-mono">{serviceCode}</span>
              <span className="flex items-center gap-1">
                <Signal className="h-3 w-3" />
                <Wifi className="h-3 w-3 opacity-30" />
                <BatteryFull className="h-3 w-3" />
              </span>
            </div>

            {/* Sized to hold a full menu without scrolling. */}
            <div className="ussd-screen min-h-[300px] bg-[#dff0e6] px-3.5 py-3 text-[13px] leading-relaxed text-ink">
              {!dialled ? (
                <p className="text-ink/50">
                  Press Dial to start a session, exactly as a patient would from a feature phone.
                </p>
              ) : busy ? (
                <p className="text-ink/50">Connecting…</p>
              ) : (
                <p className="whitespace-pre-wrap">{screen}</p>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-white/10 px-2.5 py-2">
              <input
                ref={inputRef}
                value={buffer}
                onChange={(event) => setBuffer(event.target.value.slice(0, 60))}
                onKeyDown={(event) => event.key === 'Enter' && press(buffer)}
                disabled={!live || busy}
                placeholder={live ? 'Type your reply…' : 'Session closed'}
                className="h-8 min-w-0 flex-1 rounded bg-white/10 px-2 text-xs text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-40"
              />
              <button
                onClick={() => press(buffer)}
                disabled={!live || busy || !buffer.trim()}
                className="shrink-0 rounded bg-signal px-3 py-1.5 text-xs font-semibold text-ink transition-opacity disabled:opacity-30"
              >
                Send
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 p-2.5 pt-1.5">
              {keys.map((key) => (
                <button
                  key={key}
                  onClick={() => setBuffer((value) => value + key)}
                  disabled={!live || busy}
                  className="rounded bg-white/10 py-2 text-sm font-medium text-white transition-colors hover:bg-white/25 disabled:opacity-25"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto w-[280px] space-y-2">
          <div className="space-y-1.5">
            <Label htmlFor="simPhone" className="text-xs">
              Calling from
            </Label>
            <Input
              id="simPhone"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value.replace(/[^0-9+]/g, ''))}
              disabled={dialled}
              placeholder="0200000000"
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              A registered number is greeted by name. An unknown one is asked to register.
            </p>
          </div>

          <div className="flex gap-2">
            {!dialled || !live ? (
              <Button className="flex-1" onClick={dial} disabled={busy}>
                <PhoneCall className="h-4 w-4" />
                {dialled ? 'Dial again' : `Dial ${serviceCode}`}
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" onClick={hangUp}>
                <PhoneOff className="h-4 w-4" /> Hang up
              </Button>
            )}
            {dialled && (
              <Button variant="ghost" size="icon" onClick={hangUp} aria-label="Reset">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* The current exchange. Replaced on every keypress — never appended to,
          so the answer to what you just pressed is always the thing on screen. */}
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-ink">What the network sent back</p>
            <p className="text-xs text-muted-foreground">
              Only the latest screen, replaced each time you press an option — nothing to scroll through.
            </p>
          </div>
          {dialled && (
            <span className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                Screen {step}
              </span>
              <code className="rounded bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {sessionId}
              </code>
            </span>
          )}
        </div>

        {!current ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border bg-card">
            <p className="px-6 text-center text-sm text-muted-foreground">
              Nothing yet. Dial to start a session.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-tech/25 bg-tech/5 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-tech">You pressed</span>
                <span className="text-[10px] text-muted-foreground">{current.sent.at}</span>
              </div>
              <p className="font-mono text-sm text-ink">{current.sent.text}</p>
            </div>

            <div
              className={cn(
                'animate-screen-in rounded-lg border p-4',
                failed ? 'border-destructive/30 bg-destructive/5' : 'border-primary/25 bg-primary/5'
              )}
              // Re-keyed per step so the fade-in replays and the change is visible.
              key={step}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wide',
                    failed ? 'text-destructive' : 'text-primary'
                  )}
                >
                  {failed ? 'No response' : live ? 'Reply — session open' : 'Reply — session ended'}
                </span>
                <span className="text-[10px] text-muted-foreground">{current.received.at}</span>
              </div>
              <pre className="ussd-screen whitespace-pre-wrap break-words text-sm text-ink">
                {current.received.text}
              </pre>
            </div>

            {options.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Press an option — the reply above is replaced with the new screen
                </p>
                <div className="flex flex-wrap gap-2">
                  {options.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => press(option.key)}
                      disabled={busy}
                      className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm text-ink transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-40"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-xs text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                        {option.key}
                      </span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Bookings made here are real. They appear in Appointments immediately, and the patient record is created if
          the number is new. Every screen is logged — open the Sessions tab to replay a whole call step by step.
        </p>
      </div>
    </div>
  );
}
