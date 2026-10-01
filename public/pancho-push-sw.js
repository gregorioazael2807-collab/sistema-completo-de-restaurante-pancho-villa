// Prepared for a VAPID sender. Deliberately does not cache authenticated pages or responses.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {}
  const title =
    typeof payload.title === "string" ? payload.title : "Pancho Villa";
  const publicId =
    typeof payload.publicId === "string" &&
    /^MX-[A-F0-9]{20}$/.test(payload.publicId)
      ? payload.publicId
      : null;
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof payload.body === "string" ? payload.body : "",
      tag: typeof payload.eventKey === "string" ? payload.eventKey : undefined,
      data: { url: publicId ? `/pedido/${publicId}` : "/cuenta" },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(
      new URL(event.notification.data?.url ?? "/cuenta", self.location.origin)
        .href,
    ),
  );
});
