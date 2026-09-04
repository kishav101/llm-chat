import "./globals.css";

export const metadata = {
  title: "DDevelopmentData ai",
  description: "Chat with the model running on my server",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f1113",
};

const THEME_INIT = `
try {
  var t = localStorage.getItem("theme");
  if (t) document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;650;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
