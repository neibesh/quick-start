"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Html5Qrcode } from "html5-qrcode";

function websiteFromQr(text: string): string | null {
  const value = text.trim();

  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}

function isIgnorableScanError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("notfoundexception") ||
    lower.includes("no qr code") ||
    lower.includes("not found")
  );
}

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function cameraErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("NotAllowedError") ||
    message.toLowerCase().includes("permission")
  ) {
    return "Camera permission was denied. Allow camera access and try again.";
  }

  return "Could not start the camera. Use a browser that supports camera access, and stay on HTTPS or localhost.";
}

function isPermissionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("NotAllowedError") ||
    message.toLowerCase().includes("permission")
  );
}

let cameraQueue: Promise<unknown> = Promise.resolve();

function enqueueCameraWork<T>(work: () => Promise<T>): Promise<T> {
  const next = cameraQueue.then(work, work);
  cameraQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function waitForFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function waitForReaderHost(
  readerId: string,
  isCancelled: () => boolean,
): Promise<HTMLElement | null> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (isCancelled()) {
      return null;
    }

    const host = document.getElementById(readerId);
    if (host && host.clientWidth > 0 && host.clientHeight > 0) {
      return host;
    }

    await waitForFrame();
  }

  return document.getElementById(readerId);
}

const QrReaderHost = memo(function QrReaderHost({
  readerId,
}: {
  readerId: string;
}) {
  return (
    <div
      id={readerId}
      className="qr-reader min-h-64 overflow-hidden rounded-2xl bg-zinc-950"
    />
  );
});

function faviconCandidates(url: string): string[] {
  try {
    const parsed = new URL(url);
    return [
      `${parsed.origin}/favicon.ico`,
      `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`,
    ];
  } catch {
    return [];
  }
}

function SiteFavicon({ url }: { url: string }) {
  const sources = faviconCandidates(url);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const src = sources[sourceIndex];

  if (!src) {
    return null;
  }

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden transition-[width,margin,opacity] duration-500 ease-out ${
        visible ? "mr-3 w-5 opacity-100" : "mr-0 w-0 opacity-0"
      }`}
    >
      {/* Favicons come from whatever site was scanned, so next/image remote config cannot cover them. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={20}
        height={20}
        onLoad={() => {
          requestAnimationFrame(() => setVisible(true));
        }}
        onError={() => {
          setVisible(false);
          setSourceIndex((current) => current + 1);
        }}
        className="h-5 w-5 max-w-none rounded-sm object-contain"
      />
    </span>
  );
}

type QrScannerModalProps = {
  onClose: () => void;
};

export function QrScannerModal({ onClose }: QrScannerModalProps) {
  const [readerId] = useState(() => `qr-reader-${crypto.randomUUID()}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cancelledRef = useRef(false);
  const runIdRef = useRef(0);
  const readErrorCountRef = useRef(0);
  const [status, setStatus] = useState("Starting camera…");
  const [error, setError] = useState<string | null>(null);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [scannedText, setScannedText] = useState<string | null>(null);
  const [foundUrl, setFoundUrl] = useState<string | null>(null);

  const stopScannerInternal = useCallback(async () => {
    runIdRef.current += 1;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) {
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch (stopError) {
      if (!isAbortError(stopError)) {
        // Closing the modal can interrupt the camera; ignore that.
      }
    }
  }, []);

  const stopScanner = useCallback(() => {
    return enqueueCameraWork(stopScannerInternal);
  }, [stopScannerInternal]);

  const onScanSuccess = useCallback((decodedText: string) => {
    readErrorCountRef.current = 0;
    const website = websiteFromQr(decodedText);
    if (!website) {
      setFoundUrl(null);
      setScannedText(decodedText);
      setError(
        "Couldn't read a website from that QR code. Present a code that contains a link.",
      );
      setStatus("Present a QR code");
      return;
    }

    setError(null);
    setScannedText(null);
    setFoundUrl(website);
    setStatus("QR code found");
  }, []);

  const onScanFailure = useCallback((message: string) => {
    if (isIgnorableScanError(message)) {
      readErrorCountRef.current = 0;
      return;
    }

    readErrorCountRef.current += 1;
    if (readErrorCountRef.current < 8) {
      return;
    }

    setError("Couldn't read that QR code. Hold it still and try again.");
    setStatus("Present a QR code");
  }, []);

  const startScanner = useCallback(async () => {
    return enqueueCameraWork(async () => {
      if (cancelledRef.current) {
        return false;
      }

      readErrorCountRef.current = 0;
      await stopScannerInternal();
      const runId = runIdRef.current;

      const host = await waitForReaderHost(readerId, () => {
        return cancelledRef.current || runId !== runIdRef.current;
      });
      if (!host || cancelledRef.current || runId !== runIdRef.current) {
        return false;
      }

      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelledRef.current || runId !== runIdRef.current) {
        return false;
      }

      const scanner = new Html5Qrcode(readerId, { verbose: false });
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 8,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const edge = Math.max(
                50,
                Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72),
              );
              return { width: edge, height: edge };
            },
          },
          (decodedText) => {
            onScanSuccess(decodedText);
          },
          (message) => {
            onScanFailure(message);
          },
        );
      } catch (startError) {
        scannerRef.current = null;
        if (
          isAbortError(startError) ||
          cancelledRef.current ||
          runId !== runIdRef.current
        ) {
          return false;
        }
        throw startError;
      }

      if (cancelledRef.current || runId !== runIdRef.current) {
        await scanner.stop().catch(() => undefined);
        scanner.clear();
        scannerRef.current = null;
        return false;
      }

      return true;
    });
  }, [onScanFailure, onScanSuccess, readerId, stopScannerInternal]);

  useEffect(() => {
    let cancelled = false;
    cancelledRef.current = false;

    const ignoreAbort = (event: PromiseRejectionEvent) => {
      if (isAbortError(event.reason)) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", ignoreAbort);

    const start = (async () => {
      let lastError: unknown;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (cancelled) {
          return false;
        }

        try {
          const started = await startScanner();
          if (started) {
            return true;
          }
        } catch (startError) {
          if (cancelled || isAbortError(startError)) {
            return false;
          }
          if (isPermissionError(startError)) {
            throw startError;
          }
          lastError = startError;
        }

        await new Promise((resolve) => {
          window.setTimeout(resolve, 200 * (attempt + 1));
        });
      }

      if (lastError) {
        throw lastError;
      }

      return false;
    })();

    void start
      .then((started) => {
        if (cancelled || !started) {
          return;
        }
        setStatus("Present a QR code");
        setError(null);
        setCameraFailed(false);
      })
      .catch((startError: unknown) => {
        if (cancelled || isAbortError(startError)) {
          return;
        }
        setStatus("Camera is not running.");
        setCameraFailed(true);
        setError(cameraErrorMessage(startError));
      });

    return () => {
      cancelled = true;
      cancelledRef.current = true;
      window.removeEventListener("unhandledrejection", ignoreAbort);
      void stopScanner();
    };
  }, [startScanner, stopScanner]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-scanner-title"
        className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-2xl sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="qr-scanner-title"
                className="text-xl font-semibold tracking-tight"
              >
                Scan QR code
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {status}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3 py-1 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            >
              Close
            </button>
          </div>

          <QrReaderHost readerId={readerId} />

          {foundUrl ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-900">
                <SiteFavicon key={foundUrl} url={foundUrl} />
                <p className="min-w-0 flex-1 break-all text-sm text-zinc-800 dark:text-zinc-200">
                  {foundUrl}
                </p>
              </div>
              <a
                href={foundUrl}
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                Go
              </a>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-800 dark:bg-red-950/70 dark:text-red-200"
            >
              {error}
            </p>
          ) : null}

          {scannedText ? (
            <p className="break-all rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {scannedText}
            </p>
          ) : null}

          {cameraFailed ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setScannedText(null);
                setFoundUrl(null);
                setCameraFailed(false);
                setStatus("Starting camera…");
                void startScanner()
                  .then((started) => {
                    if (started) {
                      setStatus("Present a QR code");
                      setError(null);
                      setCameraFailed(false);
                    }
                  })
                  .catch((startError: unknown) => {
                    if (isAbortError(startError)) {
                      return;
                    }
                    setStatus("Camera is not running.");
                    setCameraFailed(true);
                    setError(cameraErrorMessage(startError));
                  });
              }}
              className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Try again
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
