import { useEffect, useState } from "react";

export function ConnectionNotice() {
  const [offline, setOffline] = useState(() => !navigator.onLine);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return offline ? <div role="status" className="connection-notice">
    Нет подключения к сети. Сохранение на сервер и AI могут быть недоступны. Проверьте соединение.
  </div> : null;
}
