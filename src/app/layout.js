import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import BottomNav from "@/components/BottomNav";

export const metadata = {
  title: "nexus",
  description: "our little corner",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
