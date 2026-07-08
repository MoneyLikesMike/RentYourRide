import { Typography } from '@mui/material';

export default function TripsPage() {
  return (
    <>
      <Typography variant="h1" gutterBottom>
        Trips
      </Typography>
      <Typography color="text.secondary">
        Active, requests, completed, and canceled trips will appear here. Next
        step: wire this screen to the legacy admin trips API.
      </Typography>
    </>
  );
}
