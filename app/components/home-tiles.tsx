"use client";

import { useCallback, useState } from "react";
import { QrScannerModal } from "./qr-scanner-modal";

const tileClassName =
  "group flex h-full min-h-44 w-full flex-col rounded-3xl border border-zinc-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700";

export function HomeTiles() {
  const [scannerOpen, setScannerOpen] = useState(false);

  const closeScanner = useCallback(() => {
    setScannerOpen(false);
  }, []);

  return (
    <>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        <li>
          <a href="https://www.google.com" className={tileClassName}>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8">
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14"
                />
              </svg>
            </span>
            <span className="mt-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Google
            </span>
            <span className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Search the web
            </span>
          </a>
        </li>
        <li>
          <a
            href="https://www.volunteerhub.dfes.wa.gov.au/"
            className={tileClassName}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8">
                <path
                  fill="currentColor"
                  d="M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5zm0 2.18 6 2.25v4.66c0 3.87-2.5 7.54-6 8.66-3.5-1.12-6-4.79-6-8.66V6.43zM11 7v5.17l3.5 2.03.75-1.23-2.75-1.6V7z"
                />
              </svg>
            </span>
            <span className="mt-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              VolunteerHub
            </span>
            <span className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              DFES volunteer portal
            </span>
          </a>
        </li>
        <li>
          <a href="https://eacademy.dfes.wa.gov.au" className={tileClassName}>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8">
                <path
                  fill="currentColor"
                  d="M12 3 1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9zm6.82 6L12 12.72 5.18 9 12 5.28zM17 16l-5 2.73L7 16v-3.72L12 15l5-2.73z"
                />
              </svg>
            </span>
            <span className="mt-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              eAcademy
            </span>
            <span className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              DFES training portal
            </span>
          </a>
        </li>
        <li>
          <button
            type="button"
            className={tileClassName}
            onClick={() => setScannerOpen(true)}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8">
                <path
                  fill="currentColor"
                  d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm10-2h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v6h-6v-2h4zm-4 4h2v2h-2z"
                />
              </svg>
            </span>
            <span className="mt-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Scan QR code
            </span>
            <span className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Open a site with your camera
            </span>
          </button>
        </li>
      </ul>
      {scannerOpen ? <QrScannerModal onClose={closeScanner} /> : null}
    </>
  );
}
