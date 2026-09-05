import test from "node:test";
import assert from "node:assert/strict";
import { sidebarGroups } from "../src/config/sidebar-navigation/navigation-groups.ts";
import { superAdminNavigation } from "../src/config/sidebar-navigation/super-admin.ts";
import { filterSidebar } from "../src/lib/auth/fiter-sidebar.ts";

const renderedItems = (permissions) => {
  const allowed = filterSidebar(superAdminNavigation, permissions);
  return sidebarGroups.flatMap(group => allowed.filter(item => group.menus.includes(item.title)));
};

test("every configured sidebar menu belongs to exactly one rendered group", () => {
  for (const item of superAdminNavigation) {
    assert.equal(sidebarGroups.filter(group => group.menus.includes(item.title)).length, 1,
      item.title + " must not be silently omitted or duplicated by sidebar grouping");
  }
});

test("custom itineraries appears with view permission and only allowed child links", () => {
  const item = renderedItems(["custom_itineraries.view"]).find(x => x.title === "Custom Itineraries");
  assert.ok(item);
  assert.deepEqual(item.children.map(x => x.href), ["/home/custom-itineraries"]);
});

test("custom itinerary creation link appears for an authorized creator", () => {
  const item = renderedItems(["custom_itineraries.view", "custom_itineraries.create"])
    .find(x => x.title === "Custom Itineraries");
  assert.ok(item);
  assert.deepEqual(item.children.map(x => x.href), [
    "/home/custom-itineraries", "/home/custom-itineraries/create",
  ]);
});

test("unrelated permissions cannot reveal custom itineraries", () => {
  assert.ok(!renderedItems(["countries.view", "packages.view"])
    .some(x => x.title === "Custom Itineraries"));
});

