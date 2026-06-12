"use client";

import { BounceLoader } from "react-spinners";

const loaderColor = "#a3a3a3";

/**
 * Centred loading indicator for auth and portal callback pages.
 */
export function CallbackLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <BounceLoader color={loaderColor} loading size={40} />
    </div>
  );
}
