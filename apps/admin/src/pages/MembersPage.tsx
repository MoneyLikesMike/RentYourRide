import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { fetchMembers } from '../api/members';
import type { MemberListQuery } from '../api/types';

export default function MembersPage() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [emailTypoOnly, setEmailTypoOnly] = useState(false);
  const [pageOpts, setPageOpts] = useState<
    Omit<MemberListQuery, 'query' | 'emailTypo'>
  >({
    order: 'DESC',
    page: 1,
    take: 10,
    field: 'createdAt',
  });

  const listQuery: MemberListQuery = useMemo(
    () => ({
      ...pageOpts,
      query: search || undefined,
      emailTypo: emailTypoOnly || undefined,
    }),
    [pageOpts, search, emailTypoOnly],
  );

  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ['admin-members', listQuery],
    queryFn: () => fetchMembers(listQuery),
  });

  const onSearch = () => {
    setSearch(query.trim());
    setPageOpts((o) => ({ ...o, page: 1 }));
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h1">Members</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
        <TextField
          size="small"
          placeholder="Search name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch();
          }}
          sx={{ minWidth: 280 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <Button variant="outlined" onClick={onSearch}>
          Search
        </Button>
        <Chip
          label="Email typos"
          color={emailTypoOnly ? 'warning' : 'default'}
          variant={emailTypoOnly ? 'filled' : 'outlined'}
          onClick={() => {
            setEmailTypoOnly((v) => !v);
            setPageOpts((o) => ({ ...o, page: 1 }));
          }}
          sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
        />
      </Stack>
      {emailTypoOnly ? (
        <Alert severity="warning">
          Showing members whose email domain matches a known typo (e.g. gmil.com →
          gmail.com). Use for LC/BD cleanup.
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error">
          {(error as Error).message || 'Could not load members'}
        </Alert>
      ) : null}
      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Verified</TableCell>
                <TableCell align="right">Logins</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Box display="flex" justifyContent="center" py={4}>
                      <CircularProgress size={32} />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary" py={3} px={1}>
                      {emailTypoOnly
                        ? 'No members with known typo email domains.'
                        : 'No members found.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Button
                        component={Link}
                        to={`/members/profile/info/${row.id}`}
                        variant="text"
                        sx={{ textTransform: 'none', fontWeight: 600, p: 0 }}
                      >
                        {row.fullName}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>{row.email}</span>
                        {row.emailDomainTypo ? (
                          <Tooltip
                            title={`Did you mean ${row.emailDomainTypo.suggestedEmail}?`}
                          >
                            <Chip
                              size="small"
                              color="warning"
                              label={`→ ${row.emailDomainTypo.suggestion}`}
                            />
                          </Tooltip>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {row.signUpDate
                        ? new Date(row.signUpDate).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {row.isActive ? <Yes /> : <No />}
                    </TableCell>
                    <TableCell align="right">{row.loginsCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {data?.meta ? (
          <TablePagination
            component="div"
            count={data.meta.itemCount}
            page={data.meta.page - 1}
            onPageChange={(_, p) =>
              setPageOpts((o) => ({ ...o, page: p + 1 }))
            }
            rowsPerPage={data.meta.take}
            onRowsPerPageChange={(e) =>
              setPageOpts((o) => ({
                ...o,
                take: Number.parseInt(e.target.value, 10),
                page: 1,
              }))
            }
            rowsPerPageOptions={[10, 25, 50]}
          />
        ) : null}
      </Paper>
      {isFetching && !isPending ? (
        <Typography variant="caption" color="text.secondary">
          Updating…
        </Typography>
      ) : null}
    </Stack>
  );
}

function Yes() {
  return (
    <Box component="span" color="success.main" fontWeight={500}>
      Yes
    </Box>
  );
}

function No() {
  return (
    <Box component="span" color="text.secondary">
      No
    </Box>
  );
}
