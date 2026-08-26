export type VehicleRateCandidate = {
  model_id: string | null;
  vendor_id: string | null;
  daily_rate_paise: number;
  status?: string;
};

export function resolveVehicleDailyRate(
  rates: readonly VehicleRateCandidate[],
  options: { modelId?: string | null; vendorId?: string | null },
) {
  const active = rates.filter((rate) => rate.status !== "inactive");
  const matches = (model: string | null, vendor: string | null) =>
    active.find((rate) => rate.model_id === model && rate.vendor_id === vendor);
  return (
    (options.modelId && options.vendorId ? matches(options.modelId, options.vendorId) : undefined) ??
    (options.modelId ? matches(options.modelId, null) : undefined) ??
    (options.vendorId ? matches(null, options.vendorId) : undefined) ??
    matches(null, null) ??
    null
  );
}

export function calculateVehicleTotalPaise({
  dailyRatePaise,
  days,
  quantity,
}: {
  dailyRatePaise: number;
  days: number;
  quantity: number;
}) {
  if (![dailyRatePaise, days, quantity].every(Number.isSafeInteger))
    throw new Error("Vehicle pricing inputs must be safe integers.");
  if (dailyRatePaise < 0 || days < 1 || quantity < 1)
    throw new Error("Vehicle rate, days and quantity are invalid.");
  const total = dailyRatePaise * days * quantity;
  if (!Number.isSafeInteger(total)) throw new Error("Vehicle total exceeds the supported range.");
  return total;
}

export function assessVehicleCapacity({
  passengers,
  luggage,
  vehicles,
}: {
  passengers: number;
  luggage: number;
  vehicles: readonly { quantity: number; seatingCapacity: number; comfortCapacity: number; luggageCapacity: number }[];
}) {
  const totals = vehicles.reduce(
    (sum, vehicle) => ({
      seats: sum.seats + vehicle.quantity * vehicle.seatingCapacity,
      comfortSeats: sum.comfortSeats + vehicle.quantity * vehicle.comfortCapacity,
      luggage: sum.luggage + vehicle.quantity * vehicle.luggageCapacity,
    }),
    { seats: 0, comfortSeats: 0, luggage: 0 },
  );
  return {
    ...totals,
    legallyFits: passengers <= totals.seats,
    comfortablyFits: passengers <= totals.comfortSeats,
    luggageFits: luggage <= totals.luggage,
  };
}
