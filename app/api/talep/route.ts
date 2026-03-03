import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restoranAdi, yetkili, telefon, eposta, isletmeTipi, moduller, notlar } = body;

    if (!restoranAdi || !yetkili || !telefon || !isletmeTipi) {
      return NextResponse.json({ error: "Zorunlu alanlar eksik." }, { status: 400 });
    }

    const supabase = createClient();

    const { error } = await supabase.from("talep_formu").insert({
      restoran_adi: restoranAdi,
      yetkili,
      telefon,
      eposta: eposta || null,
      isletme_tipi: isletmeTipi,
      moduller: moduller || [],
      notlar: notlar || null,
    });

    if (error) {
      console.error("[talep] Supabase insert error:", error);
      return NextResponse.json(
        { error: "Talep kaydedilemedi. Lütfen tekrar deneyin." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[talep] Unexpected error:", err);
    return NextResponse.json({ error: "Bir hata oluştu." }, { status: 500 });
  }
}
