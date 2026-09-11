import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
