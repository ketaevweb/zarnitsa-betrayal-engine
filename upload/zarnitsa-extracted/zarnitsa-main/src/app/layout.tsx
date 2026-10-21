import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, PT_Serif } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
});

const body = PT_Serif({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "ЗАРНИЦА — вертикальный срез «Три ночи»",
  description:
    "Играбельный прототип тёмного славянского action-RPG: ватага с памятью, обетная пауза, лестница разрыва. По мотивам GDD «ЗАРНИЦА».",
};

export const viewport: Viewport = {
  themeColor: "#131111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
