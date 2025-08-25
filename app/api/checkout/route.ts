import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const j = await req.json().catch(()=>null);
  if (!j?.planName || !j?.firstName || !j?.lastName || !j?.email || !j?.amount) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const payload = {
    "Plan Name": String(j.planName),
    "First Name": String(j.firstName),
    "Last Name": String(j.lastName),
    "Email": String(j.email),
    "Mobile Number in e164 (PH)": String(j.mobile || ""),
    "Amount": Number(j.amount)
  };

  const url = process.env.MAKE_CHECKOUT_WEBHOOK;
  if (!url) return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });

  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) {
    const txt = await r.text().catch(()=> "");
    return NextResponse.json({ error: "webhook_failed", detail: txt }, { status: 502 });
  }
  const data = await r.json().catch(()=> ({}));
  const payment_url = data?.payment_url || data?.invoice_url || data?.url || null;

  if (!payment_url) return NextResponse.json({ error: "no_payment_url" }, { status: 502 });

  return NextResponse.json({ payment_url });
}
      