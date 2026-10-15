"use client";

import CallReceivedRoundedIcon from "@mui/icons-material/CallReceivedRounded";
import TransactionForm from "../../components/TransactionForm";

const CONFIG = {
  direction: "received",
  apiBasePath: "/received-payments",
  counterpartyField: "payerName",
  counterpartyLabel: "Received from (payer)",
  secondaryField: { field: "receiverName", label: "Received by (optional)" },
  amountLabel: "Amount received",
  icon: <CallReceivedRoundedIcon fontSize="small" />,
  gradient: "linear-gradient(135deg, #34D399, #059669)",
  accentColor: "#059669",
  title: { create: "Add Received Payment", edit: "Edit Received Payment" },
  successMessage: { create: "Received payment saved.", edit: "Received payment updated." },
  notFoundMessage: "Could not save this received payment.",
};

export default function ReceivedPaymentForm({ mode = "create", initialData = null, onDone }) {
  return <TransactionForm config={CONFIG} mode={mode} initialData={initialData} onDone={onDone} />;
}
