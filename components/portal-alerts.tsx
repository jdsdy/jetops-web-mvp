import {
  portalAlertErrorClassName,
  portalAlertSuccessClassName,
} from "@/components/portal-styles";

type PortalAlertsProps = {
  error?: string | null;
  message?: string | null;
};

/**
 * Standard error and success messages for portal sections.
 */
export function PortalAlerts({ error, message }: PortalAlertsProps) {
  return (
    <>
      {error ? (
        <p role="alert" className={portalAlertErrorClassName}>
          {error}
        </p>
      ) : null}
      {message ? (
        <p className={portalAlertSuccessClassName}>{message}</p>
      ) : null}
    </>
  );
}
