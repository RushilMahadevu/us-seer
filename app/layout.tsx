import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "BioMap | Biomedical & Demographic Risk Mapping Tool",
  description:
    "Explore environmental hazards, public health risk metrics, pollution data, and demographic analytics across all U.S. counties.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          async
          crossOrigin="anonymous"
          src="https://tweakcn.com/live-preview.min.js"
        />
      </head>
      <body className="antialiased min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
