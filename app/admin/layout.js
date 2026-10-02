export const metadata = {
  title: "SafeTrack Admin",
  manifest: "/admin-manifest.json",
  icons: {
    icon: "/admin-icon-192.png",
    apple: "/admin-apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "ST Admin", statusBarStyle: "default" },
};

export const viewport = { themeColor: "#1e3a5f" };

export default function AdminLayout({ children }) {
  return children;
}
