'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MailCheck, MailX, RotateCcw, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { DataState, PageHeader, Spinner } from '@/components/shared';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { errorMessage } from '@/lib/utils';
import type { SettingItem } from '@/lib/types';

type SettingsResponse = {
  settings: SettingItem[];
  notifications: {
    enabled: boolean;
    sms: { configured: boolean; provider: string; mode: string };
    email: { configured: boolean; provider: string };
  };
};

/**
 * Runtime configuration, editable without redeploying.
 *
 * These values are read by the USSD engine on every dial, so a change to the
 * booking window or the short code takes effect on the next call.
 */

const GROUPS: { title: string; description: string; keys: string[] }[] = [
  {
    title: 'Identity',
    description: 'What patients see on the USSD screen and in every message.',
    keys: ['hospital_name', 'ussd_service_code'],
  },
  {
    title: 'Booking rules',
    description: 'How far ahead and how close to the hour an appointment may be made.',
    keys: [
      'booking_horizon_days',
      'min_lead_time_minutes',
      'allow_same_day_booking',
      'max_open_appointments_per_patient',
      'cancellation_cutoff_hours',
      'auto_confirm_bookings',
    ],
  },
  {
    title: 'Messages',
    description: 'Reminder timing and what patients are told.',
    keys: ['reminder_lead_hours', 'arrive_minutes_early'],
  },
];

export default function SettingsPage() {
  const { data, error, loading, reload } = useApi<SettingsResponse>('/admin/settings');
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setValues(Object.fromEntries(data.settings.map((setting) => [setting.key, setting.value])));
  }, [data]);

  const dirtyKeys = (data?.settings ?? []).filter((setting) => values[setting.key] !== setting.value);

  async function save() {
    setSaving(true);
    try {
      const changes = Object.fromEntries(dirtyKeys.map((setting) => [setting.key, values[setting.key]]));
      const result = await api.put<{ settings: SettingItem[]; message: string }>('/admin/settings', {
        settings: changes,
      });
      toast.success(result.message);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Those settings could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  function resetChanges() {
    if (!data) return;
    setValues(Object.fromEntries(data.settings.map((setting) => [setting.key, setting.value])));
  }

  return (
    <>
      <PageHeader title="System settings" description="Configuration that takes effect immediately, on both channels.">
        {dirtyKeys.length > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={resetChanges} disabled={saving}>
              <RotateCcw className="h-4 w-4" /> Discard
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Spinner /> Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save {dirtyKeys.length} change{dirtyKeys.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </>
        )}
      </PageHeader>

      <DataState
        loading={loading}
        error={error}
        data={data}
        onRetry={reload}
        skeleton={
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-56 w-full" />
            ))}
          </div>
        }
      >
        {(response) => {
          const byKey = new Map(response.settings.map((setting) => [setting.key, setting]));

          return (
            <div className="max-w-3xl space-y-6">
              {GROUPS.map((group) => (
                <Card key={group.title}>
                  <CardHeader>
                    <CardTitle className="text-base">{group.title}</CardTitle>
                    <CardDescription>{group.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {group.keys.map((key) => {
                      const setting = byKey.get(key);
                      if (!setting) return null;
                      const value = values[key];
                      const changed = value !== setting.value;

                      if (setting.type === 'boolean') {
                        return (
                          <div key={key} className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <Label htmlFor={key} className="text-sm">
                                {setting.label}
                                {changed && <span className="ml-2 text-xs text-signal">changed</span>}
                              </Label>
                              <p className="mt-1 text-xs text-muted-foreground">{setting.description}</p>
                            </div>
                            <Switch
                              id={key}
                              checked={Boolean(value)}
                              onCheckedChange={(checked) =>
                                setValues((current) => ({ ...current, [key]: checked }))
                              }
                            />
                          </div>
                        );
                      }

                      return (
                        <div key={key} className="space-y-1.5">
                          <Label htmlFor={key} className="text-sm">
                            {setting.label}
                            {changed && <span className="ml-2 text-xs text-signal">changed</span>}
                          </Label>
                          <Input
                            id={key}
                            type={setting.type === 'number' ? 'number' : 'text'}
                            min={setting.type === 'number' ? 0 : undefined}
                            value={String(value ?? '')}
                            onChange={(event) =>
                              setValues((current) => ({
                                ...current,
                                [key]: setting.type === 'number' ? Number(event.target.value) : event.target.value,
                              }))
                            }
                            className={setting.type === 'number' ? 'max-w-[160px]' : ''}
                          />
                          <p className="text-xs text-muted-foreground">{setting.description}</p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notification providers</CardTitle>
                  <CardDescription>
                    Set in <code className="font-mono">backend/.env</code>, not here — credentials do not belong in the
                    database.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ProviderRow
                    label="SMS"
                    configured={response.notifications.sms.configured}
                    detail={
                      response.notifications.sms.configured
                        ? `${response.notifications.sms.provider} (${response.notifications.sms.mode})`
                        : 'AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY are not set'
                    }
                  />
                  <ProviderRow
                    label="Email"
                    configured={response.notifications.email.configured}
                    detail={
                      response.notifications.email.configured
                        ? response.notifications.email.provider
                        : 'SMTP_HOST, SMTP_USER and SMTP_PASS are not set'
                    }
                  />

                  {(!response.notifications.sms.configured || !response.notifications.email.configured) && (
                    <Alert variant="info" title="Development mode">
                      Messages that cannot be delivered are still composed and written to the message log with the
                      status &ldquo;skipped&rdquo;, so you can see exactly what a patient would have received. Nothing
                      else is affected.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        }}
      </DataState>
    </>
  );
}

function ProviderRow({ label, configured, detail }: { label: string; configured: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-3">
      {configured ? (
        <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      ) : (
        <MailX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">
          {label} — {configured ? 'live' : 'not configured'}
        </p>
        <p className="mt-0.5 break-words text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
