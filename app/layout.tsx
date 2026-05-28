import type { Metadata } from "next";
import { Inter } from "next/font/google";
// @ts-ignore
import "./globals.css";
import { AuthProvider } from "../components/AuthContext";
import { ThemeProvider } from "../components/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ObraSys V2",
  description: "Gestão Way Service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* suppressHydrationWarning é essencial para não dar erro de tema no Next.js */
    <html lang="pt-br" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  (function() {
                    try {
                      var savedTheme = localStorage.getItem('theme');
                      if (savedTheme === 'dark') {
                        document.documentElement.classList.add('dark');
                      } else {
                        document.documentElement.classList.remove('dark');
                      }
                    } catch (e) {}
                  })();
                `,
              }}
            />
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
