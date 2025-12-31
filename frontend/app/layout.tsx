import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from './providers/ReactQueryProvider'
import { AuthProvider } from './contexts/AuthContext'
import NavBar from "./components/NavBar";
import 'reactflow/dist/style.css'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoOps",
  description: "Create automated workflows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-black`}
      >
        <AuthProvider>
          <ReactQueryProvider>
            <NavBar />
              {children}
          </ReactQueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
