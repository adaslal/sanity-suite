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
  openGraph: {
    title: "Sanity Suite — DevOps Toolkit for Salesforce Flow Governance",
    description:
      "Audit Flows in 2ms. Patch Permission Sets surgically. Extract deterministic logic hashes. 100% client-side — no AI, no server, no data leaves your org.",
    url: "https://sanity-suite.vercel.app",
    siteName: "Sanity Suite",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sanity Suite — Salesforce Flow Governance Toolkit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sanity Suite — DevOps Toolkit for Salesforce Flow Governance",
    description:
      "Audit Flows in 2ms. Patch Permission Sets surgically. 100% client-side — no AI, no server.",
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://sanity-suite.vercel.app"),
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
