"use client";

import { useEffect, useState } from "react";
import { Box, Container, Typography, Stack, Paper, Divider, CircularProgress, Tabs, Tab } from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import RecipientPreferenceCard from "../../components/RecipientPreferenceCard";
import CustomMessageManager from "../../components/CustomMessageManager";
import api from "../../lib/api";

function RandomMessagesInner() {
  const [tab, setTab] = useState(0);
  const [recipients, setRecipients] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/random-messages/recipients"),
      api.get("/random-messages/preferences"),
      api.get("/random-messages/categories"),
    ]).then(([r, p, c]) => {
      setRecipients(r.data || []);
      setPreferences(p.data || []);
      setCategories(c.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const prefFor = (recipientId) => preferences.find((p) => (p.recipientUser?._id || p.recipientUser) === recipientId);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.25, sm: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1.1} sx={{ mb: 1.75 }}>
          <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#FFFFFF" }}>
            <NotificationsActiveIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary" }}>Random Messages</Typography>
            <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: "text.secondary" }}>Surprise notifications — quotes, compliments, and more</Typography>
          </Box>
        </Stack>

        <Paper elevation={0} sx={{ mb: 2, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="fullWidth">
            <Tab label="Who Gets What" />
            <Tab label="Custom Messages" />
          </Tabs>
        </Paper>

        {loading ? (
          <Paper elevation={0} sx={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}><CircularProgress size={28} /></Paper>
        ) : tab === 0 ? (
          <Stack spacing={1.25}>
            {recipients.map((r) => (
              <RecipientPreferenceCard key={r._id} recipient={r} categories={categories} existingPref={prefFor(r._id)} onSaved={load} />
            ))}
          </Stack>
        ) : (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <CustomMessageManager categories={categories} />
          </Paper>
        )}

        <Divider sx={{ mt: 3, opacity: 0.3 }} />
        <Typography sx={{ textAlign: "center", mt: 1.5, mb: 1, fontSize: 10, color: "text.secondary" }}>Random Messages</Typography>
      </Container>
    </Box>
  );
}

export default function RandomMessagesPage() {
  return (
    <ProtectedRoute>
      <RandomMessagesInner />
    </ProtectedRoute>
  );
}