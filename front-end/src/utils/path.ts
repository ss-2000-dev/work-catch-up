// SPAルーターを使わないので、現在のURL(パス)からIDを自分で読み取る
export function getTicketIdFromPath(): string | undefined {
  // "/tickets/1" -> ["tickets", "1"]
  // "/tickets/1/edit" -> ["tickets", "1", "edit"]
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[1];
}
