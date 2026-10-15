
import "./globals.css";
import ToastProvider from "../components/ToastProvider";
import ServiceWorkerRegistrar from "../components/ServiceWorkerRegistrar";

export const metadata = {
  title: "Expenses & Reminders",
  description: "Personal expense tracking and reminders",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistrar />
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}

