export function confirmVehicleCommand(message: string, command: () => void): boolean {
  if (typeof window === "undefined" || !window.confirm(message)) return false;
  command();
  return true;
}
