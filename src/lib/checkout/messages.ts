export function getCheckoutErrorMessage(status: number | undefined, serverError: string | undefined, unavailableMessage: string): string {
  if (status === 401) return "Tu sesión expiró. Inicia sesión nuevamente.";
  if (status === 403) return "Verifica tu correo antes de comprar.";
  if (status === 422) return serverError || "Revisa los datos del pedido.";
  return unavailableMessage;
}
