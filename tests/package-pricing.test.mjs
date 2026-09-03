import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePackagePriceMatrix,
  resolvePackageHotelRate,
} from "../src/lib/packages/pricing.ts";

const category = { id: "cat", name: "Comfort", slug: "comfort" };
const detail = {
  itinerary: [{ id:"day", package_id:"pkg", day_number:1, title:"Arrival", summary:null, description:null, start_location_id:null, end_location_id:null,
    overnight_location_id:"loc", distance_km:null, travel_minutes:null, vehicle_required:true, breakfast_included:false, lunch_included:false,
    dinner_included:false, notes:null, activities:[], hotels:[{ id:"ph", itinerary_day_id:"day", hotel_category_id:"cat", hotel_id:"hotel",
      hotel_room_id:null, meal_plan:"CP", is_primary:true, notes:null, display_order:0 }] }],
  vehicles: [{ id:"pv", package_id:"pkg", minimum_pax:1, maximum_pax:6, base_location_id:"loc", vehicle_category_id:"vc", vehicle_model_id:null,
    vendor_id:null, quantity:1, billable_days:1, notes:null, display_order:0 }],
  price_adjustments: [],
};
const refs = {
  hotel_categories:[category], activity_offerings:[],
  hotels:[{ id:"hotel", name:"Hotel", location_id:"loc", status:"active", rooms:[] }],
  hotel_rates:[{ id:"rate", location_id:"loc", category_id:"cat", hotel_id:null, room_id:null, meal_plan:"CP", base_room_rate_paise:200000,
    extra_adult_bed_paise:100000, child_with_bed_paise:0, child_without_bed_paise:0, infant_sharing_paise:0, child_pricing_policy:"child_rates",
    child_with_bed_allowed:true, child_without_bed_allowed:true, currency:"INR", tax_included:true, notes:null, status:"active", category }],
  vehicle_rates:[{ id:"vr", base_location_id:"loc", category_id:"vc", model_id:null, vendor_id:null, daily_rate_paise:600000, currency:"INR",
    all_inclusive:true, notes:null, status:"active", created_at:"", base_location:null, category:null, model:null, vendor:null }],
};

test("builds per-person package price from hotel and vehicle totals", () => {
  const [cell] = calculatePackagePriceMatrix(detail, refs, [2]);
  assert.equal(cell.groupTotalPaise, 800000);
  assert.equal(cell.perPersonPaise, 400000);
  assert.deepEqual(cell.warnings, []);
});

test("reports missing dependencies instead of silently returning a misleading price", () => {
  const [cell] = calculatePackagePriceMatrix({ ...detail, vehicles: [] }, refs, [2]);
  assert.equal(cell.warnings.length, 1);
  assert.match(cell.warnings[0], /Vehicle rule/);
});

test("package hotels resolve room override before hotel and location pricing", () => {
  const locationRate = refs.hotel_rates[0];
  const hotelRate = {
    ...locationRate,
    id: "hotel-rate",
    hotel_id: "hotel",
    base_room_rate_paise: 225000,
  };
  const roomRate = {
    ...locationRate,
    id: "room-rate",
    hotel_id: "hotel",
    room_id: "room",
    base_room_rate_paise: 250000,
  };
  const resolved = resolvePackageHotelRate(
    [locationRate, hotelRate, roomRate],
    {
      locationId: "loc",
      categoryId: "cat",
      hotelId: "hotel",
      roomId: "room",
      mealPlan: "CP",
    },
  );
  assert.equal(resolved?.rate.id, "room-rate");
  assert.equal(resolved?.source, "room_override");

  const withRoom = {
    ...detail,
    itinerary: detail.itinerary.map((day) => ({
      ...day,
      hotels: day.hotels.map((hotel) => ({
        ...hotel,
        hotel_room_id: "room",
      })),
    })),
  };
  const [cell] = calculatePackagePriceMatrix(
    withRoom,
    { ...refs, hotel_rates: [locationRate, hotelRate, roomRate] },
    [2],
  );
  assert.equal(cell.hotelPaise, 250000);
  assert.match(cell.lines[0].label, /room override/);
});

test("overnight locations automatically add category pricing without a selected hotel",()=>{
  const automatic={
    ...detail,
    itinerary:detail.itinerary.map(day=>({...day,hotels:[]})),
  };
  const [cell]=calculatePackagePriceMatrix(automatic,refs,[2]);
  assert.equal(cell.hotelPaise,200000);
  assert.equal(cell.groupTotalPaise,800000);
  assert.deepEqual(cell.warnings,[]);
  assert.match(cell.lines[0].label,/location default CP/);
});

test("hotel and included activity prices accumulate across itinerary days",()=>{
  const offering={
    id:"offering",activity_id:"activity",location_id:"loc",pricing_model:"per_person",base_price_paise:100000,
    minimum_participants:1,maximum_participants_per_unit:null,maximum_units_per_booking:null,maximum_participants_per_booking:null,
    minimum_billable_participants:1,tax_included:true,tax_rate_bps:0,status:"active",activity:{id:"activity",name:"Safari"},location:null,
    variants:[],participant_prices:[],charges:[],
  };
  const baseDay={...detail.itinerary[0],hotels:[]};
  const itinerary=[
    {...baseDay,id:"day-1",day_number:1,activities:[{id:"pa",itinerary_day_id:"day-1",activity_offering_id:"offering",activity_variant_id:null,quantity:1,is_optional:false,notes:null,display_order:0}]},
    {...baseDay,id:"day-2",day_number:2,activities:[]},
  ];
  const [cell]=calculatePackagePriceMatrix({...detail,itinerary},{...refs,activity_offerings:[offering]},[2]);
  assert.equal(cell.hotelPaise,400000);
  assert.equal(cell.activityPaise,200000);
  assert.equal(cell.groupTotalPaise,1200000);
  assert.deepEqual(cell.warnings,[]);
});
