"use client";

import CallMadeRoundedIcon from "@mui/icons-material/CallMadeRounded";
import TransactionForm from "../../components/TransactionForm";

const CONFIG = {
  direction: "sent",
  apiBasePath: "/sent-payments",
  counterpartyField: "payeeName",
  counterpartyLabel: "Sent to (payee)",
  secondaryField: null,
  amountLabel: "Amount sent",
  icon: <CallMadeRoundedIcon fontSize="small" />,
  gradient: "linear-gradient(135deg, #F87171, #DC2626)",
  accentColor: "#DC2626",
  title: { create: "Add Sent Payment", edit: "Edit Sent Payment" },
  successMessage: { create: "Sent payment saved.", edit: "Sent payment updated." },
  notFoundMessage: "Could not save this sent payment.",
};

export default function SentPaymentForm({ mode = "create", initialData = null, onDone }) {
  return <TransactionForm config={CONFIG} mode={mode} initialData={initialData} onDone={onDone} />;
}
