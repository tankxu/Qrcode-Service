import type { FC, PropsWithChildren } from "hono/jsx";

interface LayoutProps {
  title: string;
  description?: string;
  ogImage?: string;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({ title, description, ogImage, children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
        <title>{title}</title>
        {description && <meta name="description" content={description} />}
        {description && <meta property="og:description" content={description} />}
        <meta property="og:title" content={title} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="theme-color" content="#4f46e5" />
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%234f46e5'/%3E%3Ctext y='62' x='50' text-anchor='middle' font-size='52' fill='white' font-family='system-ui'%3EQ%3C/text%3E%3C/svg%3E" />
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
};

const CRITICAL_CSS = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";-webkit-font-smoothing:antialiased;color:#0f172a;background:#f8fafc}
img{max-width:100%;display:block}
a{color:inherit}
.card{background:#fff;border-radius:18px;box-shadow:0 1px 3px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.04)}
.center{display:flex;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh;padding:16px}
.frame{width:100%;max-width:420px}
.muted{color:#64748b}
.brand{display:flex;align-items:center;gap:8px;font-size:13px;color:#64748b;justify-content:center;margin-top:24px}
.brand-logo{width:18px;height:18px;background:#4f46e5;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px}
.btn{display:inline-flex;align-items:center;justify-content:center;height:48px;padding:0 20px;border-radius:12px;background:#4f46e5;color:#fff;font-weight:600;text-decoration:none;font-size:15px;border:none;cursor:pointer}
.btn-secondary{background:#fff;color:#0f172a;border:1px solid #e2e8f0}
.title{font-size:20px;font-weight:700;margin:0 0 4px}
.desc{font-size:14px;color:#64748b;margin:0 0 16px;line-height:1.5}
`;
