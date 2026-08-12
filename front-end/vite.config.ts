import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// SPAルーターを使わず、URLごとに別々のHTML(ページ)を返す構成にしている。
// 開発サーバー上では、/tickets/1 のようなキレイなURLでも実体はtickets/detail.htmlを返すように
// ここでリライトする(本番配信時は、ホスティング側の書き換えルールで同じことをする想定)。
function cleanUrlRewrite(): Plugin {
  return {
    name: "ticket-clean-url-rewrite",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? "";
        const path = url.split("?")[0];
        const parts = path.split("/").filter(Boolean);

        if (parts[0] === "tickets") {
          if (parts.length === 2 && parts[1] === "new") {
            req.url = "/tickets/new.html";
          } else if (parts.length === 2) {
            req.url = "/tickets/detail.html";
          } else if (parts.length === 3 && parts[2] === "edit") {
            req.url = "/tickets/edit.html";
          }
        } else if (parts.length === 1 && parts[0] === "upload") {
          req.url = "/upload.html";
        } else if (parts.length === 1 && parts[0] === "points-exchange") {
          req.url = "/points-exchange.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), cleanUrlRewrite()],
  build: {
    rollupOptions: {
      // マルチページ構成: ページごとに別々のHTML/バンドルとしてビルドする
      input: {
        main: resolve(__dirname, "index.html"),
        ticketNew: resolve(__dirname, "tickets/new.html"),
        ticketDetail: resolve(__dirname, "tickets/detail.html"),
        ticketEdit: resolve(__dirname, "tickets/edit.html"),
        upload: resolve(__dirname, "upload.html"),
        pointsExchange: resolve(__dirname, "points-exchange.html"),
      },
    },
  },
});
