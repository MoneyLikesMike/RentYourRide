import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { createLead, listLeads } from '../api/leads';
import { ApiError } from '../api/http';

export default function LeadsPage() {
  const qc = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ['admin-leads'],
    queryFn: listLeads,
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createLead({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      setName('');
      setEmail('');
      setPhone('');
      setNotes('');
      setFormError(null);
      void qc.invalidateQueries({ queryKey: ['admin-leads'] });
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : 'Could not create lead');
    },
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h1">Marketplace leads</Typography>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          New lead
        </Typography>
        {formError ? <Alert severity="error">{formError}</Alert> : null}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField size="small" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField size="small" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <TextField size="small" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button
            variant="contained"
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            Create
          </Button>
        </Stack>
      </Paper>
      {error ? (
        <Alert severity="error">{error instanceof Error ? error.message : 'Failed to load'}</Alert>
      ) : null}
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Next step</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={4}>Loading…</TableCell>
              </TableRow>
            ) : (
              (data ?? []).map((lead) => (
                <TableRow key={lead.id} hover>
                  <TableCell>
                    <Link to={`/leads/${lead.id}`}>{lead.name}</Link>
                  </TableCell>
                  <TableCell>{lead.email || lead.phone || '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={lead.status} />
                  </TableCell>
                  <TableCell>{lead.nextStep}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
