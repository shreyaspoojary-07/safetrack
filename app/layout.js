import "./globals.css";

export const metadata = {
  title: "SafeTrack",
  description: "Opt-in location sharing for safety",
  manifest: "/manifest.json",
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#14532d" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
