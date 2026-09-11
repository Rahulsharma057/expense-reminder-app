
"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ToastProvider() {
  return (
    <ToastContainer
      position="bottom-left"
      autoClose={2200}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable
      pauseOnFocusLoss
      theme="light"
      toastStyle={{
        borderRadius: "14px",
        fontSize: "13px",
        fontWeight: 600,
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
      }}
    />
  );
}
