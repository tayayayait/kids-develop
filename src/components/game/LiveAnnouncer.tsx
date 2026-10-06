import { useEffect, useState } from "react";
import { subscribeAnnouncer } from "@/services/a11y/liveAnnouncer";

export function LiveAnnouncer() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    return subscribeAnnouncer((text) => {
      setMessage(text);
    });
  }, []);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
