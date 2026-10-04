// Supabase Edge Function: notify-area
// Invoked on INSERT into public.complaints via Database Webhook
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ComplaintRecord {
  id: number;
  citizen_id: string;
  area_id: number;
  category: string;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: ComplaintRecord;
  old_record: null | any;
}

serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json();
    const record = payload.record;

    if (!record || !record.area_id) {
      return new Response(
        JSON.stringify({ error: "No complaint record or area_id found in request." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch area name for readable notification body
    const { data: areaData } = await supabase
      .from("areas")
      .select("name")
      .eq("id", record.area_id)
      .single();

    const areaName = areaData?.name || `Ward ${record.area_id}`;

    // 2. Select worker profiles assigned to this area that have an expo_push_token
    const { data: workers, error: workersError } = await supabase
      .from("profiles")
      .select("id, name, expo_push_token")
      .eq("role", "worker")
      .eq("area_id", record.area_id)
      .not("expo_push_token", "is", null);

    if (workersError) {
      throw workersError;
    }

    if (!workers || workers.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No collectors with registered push tokens found for this area.",
          recipients: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Construct Expo Push notification payloads
    const locationString =
      record.latitude && record.longitude
        ? `${areaName} (GPS: ${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)})`
        : areaName;

    const messages = workers.map((worker: { id: string; name?: string; expo_push_token: string }) => ({
      to: worker.expo_push_token,
      sound: "default",
      title: "New complaint in your area",
      body: `${record.category || "Waste report"} at ${locationString}: ${record.description.slice(0, 100)}`,
      data: {
        complaintId: record.id,
        areaId: record.area_id,
        category: record.category,
      },
    }));

    // 4. Send notifications via the official Expo Push API
    const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const pushResult = await pushResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        recipients: messages.length,
        expoResponse: pushResult,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
