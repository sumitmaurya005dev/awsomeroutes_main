import test from "node:test";
import assert from "node:assert/strict";

import {
  canCreateRoomForHotel,
  requiresHotelRateOverridePermission,
} from "../src/lib/hotels/authorization.ts";
import { isAllowedHotelWebsiteUrl } from "../src/lib/hotels/validations.ts";
import { detectImageMime } from "../src/lib/media/file-validation.ts";

test("an existing hotel override remains protected when changed to a location default", () => {
  assert.equal(
    requiresHotelRateOverridePermission(
      { hotel_id: "hotel-1", room_id: null },
      { hotel_id: null, room_id: null },
    ),
    true,
  );
});

test("creating a hotel or room override requires override permission", () => {
  assert.equal(
    requiresHotelRateOverridePermission(null, {
      hotel_id: "hotel-1",
      room_id: "room-1",
    }),
    true,
  );
  assert.equal(
    requiresHotelRateOverridePermission(null, {
      hotel_id: null,
      room_id: null,
    }),
    false,
  );
});

test("create-only users can add rooms only to hotels they created", () => {
  assert.equal(
    canCreateRoomForHotel({
      permissions: ["hotels.create"],
      currentUserId: "user-1",
      hotelCreatedBy: "user-1",
    }),
    true,
  );
  assert.equal(
    canCreateRoomForHotel({
      permissions: ["hotels.create"],
      currentUserId: "user-1",
      hotelCreatedBy: "user-2",
    }),
    false,
  );
  assert.equal(
    canCreateRoomForHotel({
      permissions: ["hotels.update"],
      currentUserId: "user-1",
      hotelCreatedBy: "user-2",
    }),
    true,
  );
});

test("image signature detection rejects spoofed or unsupported content", () => {
  assert.equal(detectImageMime(Uint8Array.from([0xff, 0xd8, 0xff])), "image/jpeg");
  assert.equal(
    detectImageMime(
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    "image/png",
  );
  assert.equal(
    detectImageMime(
      Uint8Array.from([
        0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
      ]),
    ),
    "image/webp",
  );
  assert.equal(detectImageMime(new TextEncoder().encode("not-an-image")), null);
});

test("hotel website links allow only HTTP and HTTPS protocols", () => {
  assert.equal(isAllowedHotelWebsiteUrl("https://hotel.example.com"), true);
  assert.equal(isAllowedHotelWebsiteUrl("http://hotel.example.com"), true);
  assert.equal(isAllowedHotelWebsiteUrl("javascript:alert(1)"), false);
  assert.equal(isAllowedHotelWebsiteUrl("data:text/html,test"), false);
});
