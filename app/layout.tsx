import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "MAKA | Restaurant Recommendations",
  description: "A shared space for the team to recommend and discuss restaurants",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-6 flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
