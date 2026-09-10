import { useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { averonApi } from "../lib/averonApi";
import { firebaseAuth } from "../lib/firebase";

/** Verifies the shared API boundary without changing the existing public interface. */
export default function ApiHealthProbe() {
  useEffect(() => {
    void averonApi.health().catch(() => undefined);
    return onIdTokenChanged(firebaseAuth, (user) => {
      if (user) void averonApi.session().catch(() => undefined);
    });
  }, []);
  return null;
}
