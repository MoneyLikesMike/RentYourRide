import { Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function MemberProfilePlaceholder() {
  const { id } = useParams();
  return (
    <>
      <Typography variant="h1" gutterBottom>
        Member profile
      </Typography>
      <Typography color="text.secondary">
        Member ID: {id}. Full profile, trips, listings, Stripe, and notes will
        be ported from the legacy admin next.
      </Typography>
    </>
  );
}
