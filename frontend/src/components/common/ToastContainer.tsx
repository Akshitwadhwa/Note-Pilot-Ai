import { CheckCircle, Info, XCircle, X } from "lucide-react";
import clsx from "clsx";
import { useToast } from "../../context/ToastContext";

const iconMap = { success: CheckCircle, error: XCircle, info: Info };
const colorMap = {
  success:
    "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200",
  error:
    "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200",
  info: "bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950 dark:border-sky-800 dark:text-sky-200"
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={clsx(
              "animate-toast-in flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg text-sm",
              colorMap[toast.type]
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
