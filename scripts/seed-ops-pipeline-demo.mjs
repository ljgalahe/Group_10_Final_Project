/**
 * Seed Ops pipeline demo rows (Inquiry → Site Survey → Quote stages).
 * Usage: node scripts/seed-ops-pipeline-demo.mjs
 * Reads .env.local (does not print secrets). Target: ashhludptczpogtwmzvd only.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_CUSTOMER_ID = "11111111-1111-1111-1111-111111111101";

function loadEnv() {
  const envPath = join(__dirname, "..", ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url.includes("ashhludptczpogtwmzvd")) {
  console.error("Refusing to run: URL is not Group_10 project ashhludptczpogtwmzvd");
  process.exit(1);
}
if (!key) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function lineItems(acres, keys) {
  const catalog = {
    mowing: { label: "Mowing & Grounds Care", mid: acres >= 5 ? 42 : 100 },
    edging: { label: "Edging", mid: acres >= 5 ? 22 : 35 },
    irrigation: { label: "Irrigation", mid: acres >= 5 ? 45 : 75 },
    seasonal_color: { label: "Seasonal Color", mid: acres >= 5 ? 70 : 110 },
    fertilization: {
      label: "Fertilization & Weed Control",
      mid: acres >= 5 ? 55 : 85,
    },
    leaf_cleanup: { label: "Leaf Cleanup", mid: acres >= 5 ? 40 : 65 },
    snow_removal: { label: "Snow Removal", mid: acres >= 5 ? 90 : 140 },
    full_service: {
      label: "Full-Service Bundle",
      mid: acres >= 5 ? 950 : 1200,
    },
    other: { label: "Other Services", mid: acres >= 5 ? 55 : 80 },
  };
  return keys.map((k) => {
    const c = catalog[k] ?? { label: k, mid: 80 };
    const unitPrice = c.mid;
    return {
      serviceKey: k,
      label: c.label,
      acres,
      unitPrice,
      lineTotal: Math.round(unitPrice * acres * 100) / 100,
    };
  });
}

async function ensureInquiry(row) {
  const { data: existing } = await sb
    .from("inquiries")
    .select("id")
    .eq("company_name", row.company_name)
    .maybeSingle();
  if (existing?.id) {
    await sb
      .from("inquiries")
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await sb
    .from("inquiries")
    .insert(row)
    .select("id")
    .single();
  if (error) throw new Error(`inquiry ${row.company_name}: ${error.message}`);
  return data.id;
}

async function upsertSurvey({
  inquiryId,
  customerId,
  propertyAddress,
  acres,
  services,
  status,
  proposed,
  notes,
  concerns = null,
  photoUrls = [],
}) {
  const { data: existing } = await sb
    .from("site_surveys")
    .select("id, quote_id")
    .eq("inquiry_id", inquiryId)
    .maybeSingle();

  const payload = {
    inquiry_id: inquiryId,
    customer_id: customerId,
    property_address: propertyAddress,
    acres,
    interested_services: services,
    proposed_services: proposed,
    catalog_snapshot: [],
    initial_notes: notes,
    property_concerns: concerns,
    photo_urls: photoUrls,
    status,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await sb.from("site_surveys").update(payload).eq("id", existing.id);
    return { id: existing.id, quote_id: existing.quote_id };
  }
  const { data, error } = await sb
    .from("site_surveys")
    .insert(payload)
    .select("id, quote_id")
    .single();
  if (error) throw new Error(`survey: ${error.message}`);
  return data;
}

async function main() {
  console.log("Seeding Ops pipeline demo on Group_10...");

  // Fix inconsistent Converted rows (Converted without completed survey).
  const { data: bad } = await sb
    .from("inquiries")
    .select("id, status, survey_status, quote_id")
    .eq("status", "Converted to quote");
  for (const row of bad ?? []) {
    if (row.survey_status !== "completed") {
      await sb
        .from("inquiries")
        .update({
          status: "Under review",
          quote_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      console.log("Reset inconsistent Converted inquiry", row.id);
    }
  }

  // 1) Needs Scheduling — new prospect, no survey
  const cedarId = await ensureInquiry({
    company_name: "Cedar Business Park",
    contact_name: "Alex Rivera",
    contact_email: "alex.rivera@cedar-demo.example",
    contact_phone: "555-0201",
    property_address: "900 Cedar Blvd, Springfield",
    property_type: "office_park",
    services_interested: ["mowing", "other"],
    message: "New commercial inquiry — needs a site survey before quoting.",
    status: "New",
    acres: 3.2,
    survey_status: "needs_scheduling",
    survey_id: null,
    quote_id: null,
  });
  // Clear any accidental survey link
  await sb
    .from("inquiries")
    .update({
      survey_status: "needs_scheduling",
      survey_id: null,
      quote_id: null,
      status: "New",
    })
    .eq("id", cedarId);

  // 2) Survey Scheduled — Harbor
  const harborId = await ensureInquiry({
    company_name: "Harbor Retail Plaza",
    contact_name: "Sam Ortiz",
    contact_email: "sam.ortiz@harbor-demo.example",
    contact_phone: "555-0102",
    property_address: "88 Harbor Ave, Springfield",
    property_type: "retail_center",
    services_interested: ["mowing", "seasonal_color"],
    message: "Looking for weekly mowing plus spring color beds.",
    status: "Under review",
    acres: 2.5,
    survey_status: "scheduled",
    quote_id: null,
    converted_customer_id: null,
  });
  const harborSurvey = await upsertSurvey({
    inquiryId: harborId,
    customerId: null,
    propertyAddress: "88 Harbor Ave, Springfield",
    acres: 2.5,
    services: ["mowing", "seasonal_color"],
    status: "draft",
    proposed: [],
    notes: "Survey scheduled — complete form on site.",
    concerns: "Busy lot entrance; confirm irrigation clock location.",
    photoUrls: [],
  });
  await sb
    .from("inquiries")
    .update({
      survey_id: harborSurvey.id,
      survey_status: "scheduled",
      status: "Under review",
      quote_id: null,
    })
    .eq("id", harborId);

  // 3) Survey Completed, ready for quote — Northridge
  const northId = await ensureInquiry({
    company_name: "Northridge Multifamily",
    contact_name: "Casey Nguyen",
    contact_email: "casey.nguyen@northridge-demo.example",
    contact_phone: "555-0103",
    property_address: "450 Northridge Dr, Springfield",
    property_type: "multifamily",
    services_interested: ["mowing", "snow_removal", "irrigation"],
    message: "Full-service grounds + winter snow for 8 acres.",
    status: "Under review",
    acres: 8,
    survey_status: "completed",
    quote_id: null,
  });
  const northItems = lineItems(8, ["mowing", "irrigation", "snow_removal"]);
  const northSurvey = await upsertSurvey({
    inquiryId: northId,
    customerId: null,
    propertyAddress: "450 Northridge Dr, Springfield",
    acres: 8,
    services: ["mowing", "snow_removal", "irrigation"],
    status: "completed",
    proposed: northItems,
    notes: "Survey complete. Ready to draft quote from proposed services.",
    concerns: "Steep rear slope near buildings C–D; snow priority on main drives.",
    photoUrls: [
      "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=640&q=80",
    ],
  });
  await sb
    .from("inquiries")
    .update({
      survey_id: northSurvey.id,
      survey_status: "completed",
      status: "Under review",
      quote_id: null,
    })
    .eq("id", northId);
  // Clear quote link on survey if we want this stage quote-less
  await sb
    .from("site_surveys")
    .update({ quote_id: null })
    .eq("id", northSurvey.id);

  // 4) Lakeside — completed survey + quote pending manager (Customer demo path)
  const lakesideId = await ensureInquiry({
    company_name: "Lakeside Office Commons",
    contact_name: "Jordan Hale",
    contact_email: "jordan.hale@lakeside-demo.example",
    contact_phone: "555-0101",
    property_address: "1200 Lakeside Pkwy, Springfield",
    property_type: "office_park",
    services_interested: ["mowing", "irrigation"],
    message: "Need a pre-season grounds proposal for our 4-acre campus.",
    status: "Converted to quote",
    acres: 4,
    survey_status: "completed",
    converted_customer_id: DEMO_CUSTOMER_ID,
  });
  const lakeItems = lineItems(4, ["mowing", "irrigation"]);
  const monthly = lakeItems.reduce((s, li) => s + li.lineTotal, 0);
  const lakeSurvey = await upsertSurvey({
    inquiryId: lakesideId,
    customerId: DEMO_CUSTOMER_ID,
    propertyAddress: "1200 Lakeside Pkwy, Springfield",
    acres: 4,
    services: ["mowing", "irrigation"],
    status: "completed",
    proposed: lakeItems,
    notes: "Campus survey complete; quote prepared for management approval.",
  });

  let quoteId = lakeSurvey.quote_id;
  if (quoteId) {
    await sb
      .from("quote_requests")
      .update({
        customer_id: DEMO_CUSTOMER_ID,
        service_description:
          "Site survey quote: Mowing & Grounds Care, Irrigation",
        status: "pending_manager_approval",
        survey_id: lakeSurvey.id,
        line_items: lakeItems,
        monthly_fee: monthly,
        visits_per_week: 1,
        submitted_for_approval_at: new Date().toISOString(),
        property_address: "1200 Lakeside Pkwy, Springfield",
      })
      .eq("id", quoteId);
  } else {
    const today = new Date();
    const seasonEnd = new Date(today);
    seasonEnd.setMonth(seasonEnd.getMonth() + 6);
    const { data: quote, error: qErr } = await sb
      .from("quote_requests")
      .insert({
        customer_id: DEMO_CUSTOMER_ID,
        service_description:
          "Site survey quote: Mowing & Grounds Care, Irrigation",
        notes: "Demo pipeline quote from Lakeside site survey.",
        property_address: "1200 Lakeside Pkwy, Springfield",
        status: "pending_manager_approval",
        survey_id: lakeSurvey.id,
        line_items: lakeItems,
        monthly_fee: monthly,
        visits_per_week: 1,
        season_start: today.toISOString().slice(0, 10),
        season_end: seasonEnd.toISOString().slice(0, 10),
        submitted_for_approval_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (qErr) throw new Error(`quote: ${qErr.message}`);
    quoteId = quote.id;
    await sb
      .from("site_surveys")
      .update({ quote_id: quoteId })
      .eq("id", lakeSurvey.id);
  }

  await sb
    .from("inquiries")
    .update({
      survey_id: lakeSurvey.id,
      survey_status: "completed",
      status: "Converted to quote",
      quote_id: quoteId,
      converted_customer_id: DEMO_CUSTOMER_ID,
    })
    .eq("id", lakesideId);

  // Counts
  const { count: surveyCount } = await sb
    .from("site_surveys")
    .select("id", { count: "exact", head: true });
  console.log("Done. site_surveys count:", surveyCount ?? "?");
  console.log("Stages:");
  console.log("  Cedar Business Park → Needs Scheduling");
  console.log("  Harbor Retail Plaza → Survey Scheduled (draft form)");
  console.log("  Northridge Multifamily → Survey Completed (draft quote)");
  console.log("  Lakeside Office Commons → Quote Pending Manager Approval");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
