"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import MeetingForm from "../MeetingForm";
import api from "../../../lib/api";

function EditMeetingInner() {
  const { id } = useParams();
  const router = useRouter();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety net: agar routing timing issue se "new" yahan aa jaaye,
    // to seedha naya-meeting page pe bhej do, API call mat karo.
    if (id === "new") {
      router.replace("/meetings/new");
      return;
    }

    api.get(`/meetings/${id}`).then((res) => setMeeting(res.data)).finally(() => setLoading(false));
  }, [id, router]);

  if (id === "new") return null;

  return (
    <>
      <Navbar />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <MeetingForm mode="edit" initialData={meeting} onDone={() => router.push("/meetings")} />
      )}
    </>
  );
}

export default function EditMeetingPage() {
  return (
    <ProtectedRoute>
      <EditMeetingInner />
    </ProtectedRoute>
  );
}