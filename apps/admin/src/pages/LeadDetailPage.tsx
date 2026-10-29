import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  getLead,
  listLeadAudit,
  revokeInvite,
  saveDraft,
  searchRides,
  sendInvite,
} from '../api/leads';
import { ApiError } from '../api/http';

const STEPS = ['legal', 'account', 'phone', 'licence', 'card', 'review'] as const;

export default function LeadDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const leadQ = useQuery({ queryKey: ['admin-lead', id], queryFn: () => getLead(id) });
  const auditQ = useQuery({ queryKey: ['admin-lead-audit', id], queryFn: () => listLeadAudit(id) });
  const lead = leadQ.data;

  const [listingQuery, setListingQuery] = useState('');
  const [listingId, setListingId] = useState(lead?.draft?.listingId ?? '');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [startTime, setStartTime] = useState('8:00 PM');
  const [endTime, setEndTime] = useState('8:00 PM');
  const [message, setMessage] = useState(lead?.draft?.introMessage ?? '');
  const [error, setError] = useState<string | null>(null);

  const ridesQ = useQuery({
    queryKey: ['admin-rides', listingQuery],
    queryFn: () => searchRides(listingQuery),
    enabled: listingQuery.trim().length > 1,
  });

  const save = useMutation({
    mutationFn: () =>
      saveDraft(id, {
        listingId,
        bookingDates: {
          start: new Date(start).getTime(),
          end: new Date(end).getTime(),
          startTime,
          endTime,
        },
        introMessage: message,
      }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['admin-lead', id] });
    },
    onError: (err: unknown) =>
      setError(err instanceof ApiError ? err.message : 'Could not save draft'),
  });

  const invite = useMutation({
    mutationFn: (channel: 'sms' | 'email') => sendInvite(id, channel),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['admin-lead', id] });
      void qc.invalidateQueries({ queryKey: ['admin-lead-audit', id] });
    },
    onError: (err: unknown) =>
      setError(err instanceof ApiError ? err.message : 'Could not send link'),
  });

  const revoke = useMutation({
    mutationFn: () => revokeInvite(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-lead', id] });
      void qc.invalidateQueries({ queryKey: ['admin-lead-audit', id] });
    },
  });

  const check = lead?.checklist;
  const quoteLabel = useMemo(() => {
    const cents = lead?.draft?.quotedGrandTotalCents;
    if (cents == null) return null;
    return `$${(cents / 100).toFixed(2)}`;
  }, [lead]);

  if (leadQ.isPending) return <Typography>Loading…</Typography>;
  if (!lead) return <Alert severity="error">Lead not found</Alert>;

  return (
    <Stack spacing={2}>
      <Typography variant="h1">{lead.name}</Typography>
      <Typography color="text.secondary">
        {lead.email || 'No email'} · {lead.phone || 'No phone'}
      </Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        <Typography variant="h2">Checklist</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {STEPS.map((step) => (
            <Chip
              key={step}
              label={step}
              color={check?.[step] ? 'success' : 'default'}
              variant={lead.nextStep === step ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h2">Booking draft</Typography>
        <Stack spacing={1} sx={{ mt: 1, maxWidth: 520 }}>
          <TextField
            size="small"
            label="Search listing"
            value={listingQuery}
            onChange={(e) => setListingQuery(e.target.value)}
          />
          {(ridesQ.data?.data ?? []).map((ride) => (
            <Button
              key={ride.id}
              size="small"
              variant={listingId === ride.id ? 'contained' : 'outlined'}
              onClick={() => setListingId(ride.id)}
            >
              {ride.vehicleInfo}
            </Button>
          ))}
          <TextField
            size="small"
            label="Listing ID"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
          />
          <TextField
            size="small"
            type="datetime-local"
            label="Start"
            InputLabelProps={{ shrink: true }}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <TextField
            size="small"
            type="datetime-local"
            label="End"
            InputLabelProps={{ shrink: true }}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <TextField
            size="small"
            label="Pickup time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <TextField
            size="small"
            label="Drop-off time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
          <TextField
            size="small"
            label="Intro message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>
            Save draft & quote
          </Button>
          {quoteLabel ? <Typography>Quoted total: {quoteLabel}</Typography> : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h2">Secure link</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Staff never see passwords, OTPs, or card numbers. The guest finishes on their own phone.
        </Typography>
        {lead.invite ? (
          <Typography sx={{ mt: 1 }}>
            Last invite via {lead.invite.deliveredVia || lead.invite.channel}, expires{' '}
            {new Date(lead.invite.expiresAt).toLocaleString()}
            {lead.invite.bound ? ' · bound to guest' : ''}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button onClick={() => invite.mutate('sms')} disabled={!lead.phone || invite.isPending}>
            Send SMS (24h)
          </Button>
          <Button onClick={() => invite.mutate('email')} disabled={!lead.email || invite.isPending}>
            Send email (72h)
          </Button>
          <Button color="warning" onClick={() => revoke.mutate()} disabled={revoke.isPending}>
            Revoke
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h2">Audit</Typography>
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {(auditQ.data ?? []).map((row) => (
            <Typography key={row.id} variant="body2">
              {new Date(row.createdAt).toLocaleString()} · {row.action}
            </Typography>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
