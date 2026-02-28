import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Sanity Suite — DevOps Toolkit for Salesforce Flow Governance",
  description:
    "Audit Flows, patch Permission Sets, and extract deterministic logic — no AI, no server, pure structural analysis. Built for Salesforce Admins, Developers, and Architects.",
  keywords: [
    "Salesforce",
    "Flow",
    "DevOps",
    "Governance",
    "Permission Set",
    "Logic Audit",
    "LWC",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
