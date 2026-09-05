import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { fixture, uid } from "./fixtures/custom-itinerary.mjs";
test("real PostgreSQL migration: transactions, RBAC, concurrency, revisions and immutability", async () => {
  const db = new PGlite();
  const { value, ids } = fixture(),
    admin = uid(),
    viewer = uid(),
    editor = uid(),
    inactive = uid(),
    adminRole = uid(),
    viewRole = uid(),
    editRole = uid();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create table public.roles(id uuid primary key,name text,slug text); create table public.permissions(id uuid primary key default gen_random_uuid(),module text,action text,permission_key text unique,description text); create table public.role_permissions(role_id uuid,permission_id uuid,primary key(role_id,permission_id)); create table public.profiles(id uuid primary key,role_id uuid,status text,must_change_password boolean default false); create function public.has_permission(text) returns boolean language sql stable as 'select false'; create table public.packages(id uuid primary key); create table public.locations(id uuid primary key,destination_id uuid); create table public.hotels(id uuid primary key,location_id uuid); create table public.hotel_categories(id uuid primary key); create table public.hotel_rooms(id uuid primary key,hotel_id uuid,category_id uuid); create table public.activity_offerings(id uuid primary key); create table public.activity_variants(id uuid primary key,activity_offering_id uuid); create table public.activity_charges(id uuid primary key,activity_offering_id uuid,activity_variant_id uuid); create table public.vehicle_categories(id uuid primary key); create table public.vehicle_models(id uuid primary key,category_id uuid); create table public.transport_vendors(id uuid primary key,base_location_id uuid); create table public.fleet_vehicles(id uuid primary key,model_id uuid,vendor_id uuid); create table public.drivers(id uuid primary key,vendor_id uuid);",
    );
    for (const [id, slug] of [
      [adminRole, "super_admin"],
      [viewRole, "viewer"],
      [editRole, "editor"],
    ])
      await db.query("insert into roles values($1,$2,$2)", [id, slug]);
    await db.exec(
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20260903100000_custom_itineraries.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20260904100000_custom_itinerary_total_override.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    for (const [id, role, status] of [
      [admin, adminRole, "active"],
      [viewer, viewRole, "active"],
      [editor, editRole, "active"],
      [inactive, adminRole, "inactive"],
    ]) {
      await db.query("insert into auth.users values($1)", [id]);
      await db.query("insert into profiles values($1,$2,$3,false)", [
        id,
        role,
        status,
      ]);
    }
    await db.query(
      "insert into role_permissions select $1,id from permissions where action='view'",
      [viewRole],
    );
    await db.query(
      "insert into role_permissions select $1,id from permissions where action in('view','create','update')",
      [editRole],
    );
    await db.query("insert into locations values($1,$2)", [
      ids.loc,
      ids.destination,
    ]);
    await db.query("insert into hotels values($1,$2)", [ids.hotel, ids.loc]);
    await db.query("insert into hotel_categories values($1)", [ids.category]);
    await db.query("insert into hotel_rooms values($1,$2,$3)", [
      ids.room,
      ids.hotel,
      ids.category,
    ]);
    await db.query("insert into activity_offerings values($1)", [ids.offering]);
    await db.query("insert into activity_variants values($1,$2)", [
      ids.variant,
      ids.offering,
    ]);
    await db.query("insert into vehicle_categories values($1)", [
      ids.vehicleCategory,
    ]);
    await db.query("insert into vehicle_models values($1,$2)", [
      ids.model,
      ids.vehicleCategory,
    ]);
    await db.query("insert into transport_vendors values($1,$2)", [
      ids.vendor,
      ids.loc,
    ]);
    const save = (who, v) =>
      db.query("select save_custom_itinerary($1,$2::jsonb)", [
        who,
        JSON.stringify(v),
      ]);
    await assert.rejects(save(viewer, value), /create permission/);
    await assert.rejects(save(inactive, value), /view permission/);
    await save(admin, value);
    assert.equal(
      (await db.query("select version from custom_itineraries")).rows[0]
        .version,
      1,
    );
    await assert.rejects(save(admin, value), /changed in another session/);
    value.version = 1;
    await assert.rejects(
      save(editor, {
        ...value,
        total_override_paise: 0,
        total_override_reason: "Unauthorized discount",
      }),
      /pricing permission/,
    );
    await assert.rejects(
      save(admin, {
        ...value,
        total_override_paise: 0,
        total_override_reason: "  ",
      }),
      /total_override_reason/,
    );
    // Verify approved totals survive saves, including a legitimate zero quote;
    // roll back this isolated check to preserve the version sequence below.
    await db.exec("begin");
    await save(admin, {
      ...value,
      total_override_paise: 0,
      total_override_reason: "Complimentary tour",
    });
    const approved = (
      await db.query(
        "select total_override_paise,total_override_reason from custom_itineraries where id=$1",
        [value.id],
      )
    ).rows[0];
    assert.equal(Number(approved.total_override_paise), 0);
    assert.equal(approved.total_override_reason, "Complimentary tour");
    await assert.rejects(
      save(editor, { ...value, version: 2 }),
      /pricing permission/,
    );
    await db.exec("rollback");
    await assert.rejects(
      save(editor, { ...value, markup_bps: 100 }),
      /pricing permission/,
    );
    await save(editor, value);
    value.version = 2;
    // Failed child selection must roll the whole replacement back.
    const bad = structuredClone(value);
    bad.days[0].stays[0].room_id = uid();
    await assert.rejects(save(admin, bad), /room.category mismatch/i);
    assert.equal(
      (await db.query("select version from custom_itineraries")).rows[0]
        .version,
      2,
    );
    assert.equal(
      (await db.query("select count(*)::int as n from custom_itinerary_stays"))
        .rows[0].n,
      1,
    );
    await db.exec("set role authenticated");
    assert.equal(
      (await db.query("select count(*)::int as n from custom_itineraries"))
        .rows[0].n,
      0,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      viewer,
    ]);
    assert.equal(
      (await db.query("select count(*)::int as n from custom_itineraries"))
        .rows[0].n,
      1,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      inactive,
    ]);
    assert.equal(
      (await db.query("select count(*)::int as n from custom_itineraries"))
        .rows[0].n,
      0,
    );
    await assert.rejects(save(admin, value), /permission denied/);
    await db.exec("reset role");
    await db.query(
      "update profiles set must_change_password=true where id=$1",
      [viewer],
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      viewer,
    ]);
    await db.exec("set role authenticated");
    assert.equal(
      (await db.query("select count(*)::int as n from custom_itineraries"))
        .rows[0].n,
      0,
    );
    await db.exec("reset role");
    const doc = {
      days: [{ day_number: 1 }],
      total_paise: 1151000,
      revision: 1,
    };
    const final = (who, version) =>
      db.query(
        "select finalize_custom_itinerary($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb)",
        [
          who,
          value.id,
          version,
          JSON.stringify(doc),
          JSON.stringify({ warnings: [] }),
          JSON.stringify(value),
        ],
      );
    await assert.rejects(final(editor, 2), /finalize permission/);
    await final(admin, 2);
    await assert.rejects(final(admin, 2), /changed or is already locked/);
    await assert.rejects(save(admin, { ...value, version: 3 }), /locked/);
    await assert.rejects(
      db.exec("update custom_itinerary_revisions set document='{}'"),
      /immutable/,
    );
    await assert.rejects(
      db.exec("delete from custom_itinerary_revisions"),
      /immutable/,
    );
    await db.query("select transition_custom_itinerary($1,$2,3,'draft')", [
      editor,
      value.id,
    ]);
    value.version = 4;
    value.title = "Revised trip";
    await save(editor, value);
    value.version = 5;
    await final(admin, 5);
    const snapshots = (
      await db.query(
        "select revision,source_snapshot from custom_itinerary_revisions order by revision",
      )
    ).rows;
    assert.equal(snapshots.length, 2);
    assert.equal(snapshots[0].source_snapshot.title, "Assam discovery");
    assert.equal(snapshots[1].source_snapshot.title, "Revised trip");
    await db.query("select transition_custom_itinerary($1,$2,6,'accepted')", [
      admin,
      value.id,
    ]);
    await assert.rejects(
      db.query("select transition_custom_itinerary($1,$2,7,'draft')", [
        admin,
        value.id,
      ]),
      /not allowed/,
    );
    await assert.rejects(
      db.query("select delete_custom_itinerary($1,$2,7)", [admin, value.id]),
      /never-finalized/,
    );
  } finally {
    await db.close();
  }
});
