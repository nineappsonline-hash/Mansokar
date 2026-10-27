import type { Instrumentation } from "next";
export const onRequestError: Instrumentation.onRequestError = (
  error,
  _request,
  context,
) => {
  console.error(
    JSON.stringify({
      event: "request_error",
      route: context.routePath,
      type: context.routeType,
      digest:
        typeof error === "object" && error !== null && "digest" in error
          ? String(error.digest)
          : undefined,
    }),
  );
};
