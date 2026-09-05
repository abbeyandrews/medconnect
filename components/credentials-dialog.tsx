'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import type { Credentials } from '@/lib/types';

/**
 * Shows the sign-in details for a newly created or reset account.
 *
 * The password is not generated and not secret — every account starts on the
 * same known default — so this dialog is a hand-over aid rather than a
 * one-time reveal. It still cannot be read back out of the database, which is
 * why the reset button exists.
 */
export function CredentialsDialog({
  credentials,
  personName,
  onClose,
}: {
  credentials: Credentials | null;
  personName?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // Clipboard access can be blocked; the value is on screen to read out anyway.
    }
  }

  return (
    <Dialog open={Boolean(credentials)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Sign-in details
          </DialogTitle>
          <DialogDescription>
            {personName ? `Give these to ${personName}.` : 'Give these to the staff member.'} They can change the
            password themselves from My profile.
          </DialogDescription>
        </DialogHeader>

        {credentials && (
          <div className="space-y-3 py-2">
            <Alert variant="info" title="This is the standard starting password">
              Every account begins with it. Ask them to set their own once they are in, and use the key icon on the
              list to put an account back to it if they forget.
            </Alert>

            <CredentialRow
              label="Username"
              value={credentials.username}
              copied={copied === 'Username'}
              onCopy={() => copy('Username', credentials.username)}
            />
            <CredentialRow
              label="Password"
              value={credentials.password}
              copied={copied === 'Password'}
              onCopy={() => copy('Password', credentials.password)}
            />
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            I have shared these
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/40 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <code className="select-all break-all font-mono text-base text-ink">{value}</code>
        <Button variant="ghost" size="icon" onClick={onCopy} aria-label={`Copy ${label}`}>
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
