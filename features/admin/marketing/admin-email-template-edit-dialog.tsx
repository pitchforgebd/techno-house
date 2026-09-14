"use client";

import { useMemo, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  saveEmailTemplateAction,
  sendTestEmailTemplateAction,
} from "@/features/admin/marketing/email-template-actions";
import type { AdminEmailTemplate } from "@/lib/mail/templates";

function findPlaceholders(text: string): string[] {
  const matches = text.match(/\[\[\w+\]\]/g) ?? [];
  return [...new Set(matches)];
}

export function AdminEmailTemplateEditDialog({
  template,
  open,
  onClose,
}: {
  template: AdminEmailTemplate;
  open: boolean;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [testTo, setTestTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [testPending, startTestTransition] = useTransition();

  const placeholders = useMemo(
    () => findPlaceholders(`${subject} ${body}`),
    [subject, body],
  );

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveEmailTemplateAction({ id: template.id, subject, body });
      if (!result.ok) {
        setError(result.formError);
        return;
      }
      notifySuccess("Email template saved");
      onClose();
    });
  }

  function handleSendTest() {
    setTestResult(null);
    if (!testTo.trim()) {
      notifyError("Enter an email address to send the test to.");
      return;
    }
    startTestTransition(async () => {
      const result = await sendTestEmailTemplateAction({ id: template.id, to: testTo.trim() });
      if (!result.ok) {
        setTestResult(`Not sent: ${result.formError}`);
        return;
      }
      setTestResult(`Test email sent to ${testTo.trim()}.`);
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Edit · ${template.emailType}`}>
      <div className="space-y-4">
        {error ? (
          <Alert tone="danger" title="Cannot save">
            <p className="text-caption">{error}</p>
          </Alert>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-text-muted">Subject</span>
          <Input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={pending}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-text-muted">Body</span>
          <Textarea
            rows={8}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            disabled={pending}
          />
        </label>

        {placeholders.length > 0 ? (
          <p className="text-xs text-text-muted">
            Placeholders used: {placeholders.join(", ")} — filled in with real
            order data once this template is wired to a send trigger.
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-caption font-medium text-text-muted">
            Send a real test email (placeholders filled with sample data)
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              value={testTo}
              onChange={(event) => setTestTo(event.target.value)}
              placeholder="you@example.com"
              disabled={testPending}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleSendTest}
              disabled={testPending}
            >
              {testPending ? "Sending…" : "Send test"}
            </Button>
          </div>
          {testResult ? <p className="text-caption text-text-muted">{testResult}</p> : null}
        </div>
      </div>
    </Dialog>
  );
}
