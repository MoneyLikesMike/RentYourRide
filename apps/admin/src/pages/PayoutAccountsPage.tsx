import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  fetchPayoutAccounts,
  type AdminPayoutAccount,
} from '../api/payoutAccounts';
import { resyncPayoutAccount } from '../api/payoutAccounts';

type Filter = '' | 'past_due' | 'restricted' | 'pending_payouts';

export default function PayoutAccountsPage() {
  const [filter, setFilter] = useState<Filter>('');
  const qc = useQueryClient();

  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ['admin-payout-accounts', filter],
    queryFn: () =>
      fetchPayoutAccounts(filter || undefined) as Promise<AdminPayoutAccount[]>,
  });

  const resync = useMutation({
    mutationFn: (userId: string) => resyncPayoutAccount(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payout-accounts'] }),
  });

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <Stack spacing={2}>
      <Typography variant="h1">Payout accounts</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {(
          [
            ['', 'All'],
            ['past_due', 'Past due'],
            ['restricted', 'Restricted'],
            ['pending_payouts', 'Pending payouts'],
          ] as const
        ).map(([key, label]) => (
          <Chip
            key={key || 'all'}
            label={label}
            color={filter === key ? 'primary' : 'default'}
            variant={filter === key ? 'filled' : 'outlined'}
            onClick={() => setFilter(key)}
          />
        ))}
      </Stack>
      {error ? (
        <Alert severity="error">
          {(error as Error).message || 'Failed to load payout accounts'}
        </Alert>
      ) : null}
      {isPending || isFetching ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Host</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payouts</TableCell>
                <TableCell>Due</TableCell>
                <TableCell>Deadline</TableCell>
                <TableCell>Last synced</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {[row.firstName, row.lastName].filter(Boolean).join(' ') ||
                        '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.email}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>
                    {row.payoutsReady
                      ? 'Ready'
                      : row.payoutsEnabled
                        ? 'Enabled (transfers pending)'
                        : 'Off'}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>
                    {[...row.pastDue, ...row.currentlyDue].slice(0, 4).join(', ') ||
                      '—'}
                  </TableCell>
                  <TableCell>
                    {row.currentDeadline
                      ? new Date(row.currentDeadline).toLocaleString()
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {row.lastSyncedAt
                      ? new Date(row.lastSyncedAt).toLocaleString()
                      : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={resync.isPending}
                      onClick={() => resync.mutate(row.userId)}
                    >
                      Resync
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography color="text.secondary">No accounts</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
