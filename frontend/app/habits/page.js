"use client";

import { useEffect, useState } from "react";
import { Box, Container, Typography, Stack, Button, Tabs, Tab, Paper, CircularProgress, Divider } from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import HabitRow from "../../components/HabitRow";
import HabitCard from "../../components/HabitCard";
import HabitFormDialog from "../../components/HabitFormDialog";
import HabitStatsDialog from "../../components/HabitStatsDialog";
import api from "../../lib/api";

function HabitsInner() {
  const [tab, setTab] = useState(0);

  const [todayItems, setTodayItems] = useState([]);
  const [todayDate, setTodayDate] = useState(null);
  const [goodHabits, setGoodHabits] = useState([]);
  const [badHabits, setBadHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [statsHabit, setStatsHabit] = useState(null);

  const loadToday = () => {
    api.get("/habits/today").then((res) => {
      setTodayItems(res.data.items || []);
      setTodayDate(res.data.date);
    });
  };

  const loadHabits = () => {
    return Promise.all([
      api.get("/habits", { params: { type: "Good", active: true } }),
      api.get("/habits", { params: { type: "Bad", active: true } }),
    ]).then(([g, b]) => {
      setGoodHabits(g.data || []);
      setBadHabits(b.data || []);
    });
  };

  const loadAll = () => {
    setLoading(true);
    Promise.all([loadToday(), loadHabits()]).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const openNewHabit = () => { setEditingHabit(null); setFormOpen(true); };
  const openEditHabit = (habit) => { setEditingHabit(habit); setFormOpen(true); };
  const handleFormSaved = () => { setFormOpen(false); loadAll(); };
  const handleFormDeleted = () => { setFormOpen(false); loadAll(); };

  const goodDone = todayItems.filter((i) => i.habit.type === "Good" && i.success).length;
  const goodTotal = todayItems.filter((i) => i.habit.type === "Good").length;
  const badAvoided = todayItems.filter((i) => i.habit.type === "Bad" && i.success).length;
  const badTotal = todayItems.filter((i) => i.habit.type === "Bad").length;
  const loggedToday = todayItems.filter((i) => i.success !== null).length;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.25, sm: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.75 }}>
          <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
            <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#FFFFFF" }}>
              <TrackChangesIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary" }}>Habit Tracker</Typography>
              <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: "text.secondary", display: { xs: "none", sm: "block" } }}>Build good ones, break the bad ones</Typography>
            </Box>
          </Stack>

          <Button variant="contained" size="small" startIcon={<AddCircleIcon sx={{ fontSize: 18 }} />} onClick={openNewHabit} sx={{ minHeight: 38, px: { xs: 1.4, sm: 2 }, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11.5, sm: 12.5 }, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
            New Habit
          </Button>
        </Stack>

        <Paper elevation={0} sx={{ mb: 2, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="fullWidth">
            <Tab label={`Today${todayItems.length ? ` (${loggedToday}/${todayItems.length})` : ""}`} />
            <Tab label={`Good (${goodHabits.length})`} />
            <Tab label={`Bad (${badHabits.length})`} />
          </Tabs>
        </Paper>

        {loading ? (
          <Paper elevation={0} sx={{ minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <CircularProgress size={28} thickness={4} sx={{ color: "primary.main" }} />
          </Paper>
        ) : tab === 0 ? (
          <Stack spacing={1.25}>
            {todayItems.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mb: 0.5 }}>
                {goodTotal > 0 && (
                  <Paper elevation={0} sx={{ flex: 1, p: 1.2, borderRadius: 2.5, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                    <Typography variant="caption" color="text.secondary">Good habits today</Typography>
                    <Typography fontWeight={800} sx={{ color: "#4ADE80" }}>{goodDone}/{goodTotal}</Typography>
                  </Paper>
                )}
                {badTotal > 0 && (
                  <Paper elevation={0} sx={{ flex: 1, p: 1.2, borderRadius: 2.5, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                    <Typography variant="caption" color="text.secondary">Bad habits avoided</Typography>
                    <Typography fontWeight={800} sx={{ color: "#F87171" }}>{badAvoided}/{badTotal}</Typography>
                  </Paper>
                )}
              </Stack>
            )}

            {todayItems.length === 0 ? (
              <Paper elevation={0} sx={{ minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2, borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
                <Typography sx={{ fontSize: 14, fontWeight: 750, color: "text.primary" }}>No habits yet</Typography>
                <Button variant="contained" startIcon={<AddCircleIcon />} onClick={openNewHabit} sx={{ mt: 2, textTransform: "none", fontWeight: 700, borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
                  Add your first habit
                </Button>
              </Paper>
            ) : (
              todayItems.map((item) => <HabitRow key={item.habit._id} item={item} date={todayDate} onSaved={loadAll} />)
            )}
          </Stack>
        ) : tab === 1 ? (
          <Stack spacing={1.25}>
            {goodHabits.length === 0 ? (
              <Paper elevation={0} sx={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
                <Typography variant="body2" color="text.secondary">No good habits yet.</Typography>
              </Paper>
            ) : (
              goodHabits.map((h) => <HabitCard key={h._id} habit={h} onEdit={openEditHabit} onViewStats={setStatsHabit} />)
            )}
          </Stack>
        ) : (
          <Stack spacing={1.25}>
            {badHabits.length === 0 ? (
              <Paper elevation={0} sx={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
                <Typography variant="body2" color="text.secondary">No bad habits tracked yet.</Typography>
              </Paper>
            ) : (
              badHabits.map((h) => <HabitCard key={h._id} habit={h} onEdit={openEditHabit} onViewStats={setStatsHabit} />)
            )}
          </Stack>
        )}

        <Divider sx={{ mt: 3, opacity: 0.3 }} />
        <Typography sx={{ textAlign: "center", mt: 1.5, mb: 1, fontSize: 10, color: "text.secondary" }}>Habit Tracker</Typography>
      </Container>

      <HabitFormDialog open={formOpen} habit={editingHabit} onClose={() => setFormOpen(false)} onSaved={handleFormSaved} onDeleted={handleFormDeleted} />
      <HabitStatsDialog open={!!statsHabit} habit={statsHabit} onClose={() => setStatsHabit(null)} />
    </Box>
  );
}

export default function HabitsPage() {
  return (
    <ProtectedRoute>
      <HabitsInner />
    </ProtectedRoute>
  );
}