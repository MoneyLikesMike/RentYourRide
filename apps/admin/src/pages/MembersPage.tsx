import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
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
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { fetchMembers } from '../api/members';
import type { MemberListQuery } from '../api/types';

export default function MembersPage() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [pageOpts, setPageOpts] = useState<Omit<MemberListQuery, 'query'>>({
    order: 'DESC',
    page: 1,
    take: 10,
    field: 'createdAt',
  });

  const listQuery: MemberListQuery = useMemo(
    () => ({ ...pageOpts, query: search || undefined }),
    [pageOpts, search],
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
      </Stack>
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
                    <TableCell>{row.email}</TableCell>
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
