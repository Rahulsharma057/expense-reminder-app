"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import MeetingForm from "../MeetingForm";

function NewMeetingInner() {
  const router = useRouter();
  return (
    <>
      <Navbar />
      <MeetingForm mode="create" onDone={() => router.push("/meetings")} />
    </>
  );
}

export default function NewMeetingPage() {
  return (
    <ProtectedRoute>
      <NewMeetingInner />
    </ProtectedRoute>
  );
}