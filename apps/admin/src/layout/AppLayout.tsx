import { useState } from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../auth/AuthContext';

const drawerWidth = 240;

const nav = [
  { to: '/members', label: 'Members', icon: PeopleIcon },
  { to: '/trips', label: 'Trips', icon: DirectionsCarIcon },
  { to: '/validation', label: 'Validation', icon: VerifiedUserIcon },
];

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { signOut, user } = useAuth();

  const drawer = (
    <Box onClick={() => setOpen(false)} sx={{ textAlign: 'center' }}>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h2" noWrap sx={{ fontSize: '1rem' }}>
          RYR Admin
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {nav.map((item) => {
          const Icon = item.icon;
          const selected =
            item.to === '/members'
              ? location.pathname.startsWith('/members')
              : location.pathname.startsWith(item.to);
          return (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              selected={selected}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <List>
        <ListItemButton onClick={() => signOut()}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Sign out" />
        </ListItemButton>
      </List>
    </Box>
  );

  const email =
    user && typeof user.email === 'string' ? user.email : 'Staff';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setOpen(true)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h2" component="div" sx={{ flexGrow: 1, fontSize: '1.1rem' }}>
            {email}
          </Typography>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
