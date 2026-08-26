export type HotelRateScope = {
  hotel_id: string | null;
  room_id?: string | null;
};

export function isHotelRateOverride(scope: HotelRateScope | null | undefined) {
  return Boolean(scope?.hotel_id || scope?.room_id);
}

export function requiresHotelRateOverridePermission(
  current: HotelRateScope | null | undefined,
  next: HotelRateScope,
) {
  return isHotelRateOverride(current) || isHotelRateOverride(next);
}

export function canCreateRoomForHotel({
  permissions,
  currentUserId,
  hotelCreatedBy,
}: {
  permissions: readonly string[];
  currentUserId: string | null | undefined;
  hotelCreatedBy: string | null | undefined;
}) {
  if (permissions.includes("hotels.update")) return true;
  return (
    permissions.includes("hotels.create") &&
    Boolean(currentUserId) &&
    currentUserId === hotelCreatedBy
  );
}
