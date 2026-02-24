"use server";

import { createClient } from "@/lib/supabase/server";
import { checkFeatureServer } from "@/lib/features";

/* ─────────────────────── Query Functions ─────────────────── */

export async function getRestaurantTranslations(
  restaurantId: string,
  language: string
) {
  const supabase = createClient();
  const { data } = await supabase
    .from("restaurant_translations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("language", language)
    .maybeSingle();
  return data;
}

export async function getCategoryTranslations(
  restaurantId: string,
  language: string
) {
  const supabase = createClient();
  // Get category ids for this restaurant first
  const { data: cats } = await supabase
    .from("categories")
    .select("id")
    .eq("restaurant_id", restaurantId);

  if (!cats?.length) return [];

  const { data } = await supabase
    .from("category_translations")
    .select("*")
    .in("category_id", cats.map((c) => c.id))
    .eq("language", language);

  return data || [];
}

export async function getMenuItemTranslations(
  restaurantId: string,
  language: string
) {
  const supabase = createClient();
  const { data: items } = await supabase
    .from("menu_items")
    .select("id")
    .eq("restaurant_id", restaurantId);

  if (!items?.length) return [];

  const { data } = await supabase
    .from("menu_item_translations")
    .select("*")
    .in("menu_item_id", items.map((i) => i.id))
    .eq("language", language);

  return data || [];
}

/* ─────────────────────── Upsert Functions ─────────────────── */

export async function upsertRestaurantTranslation(
  restaurantId: string,
  language: string,
  fields: { name?: string; description?: string }
): Promise<{ ok: boolean; error?: string }> {
  const allowed = await checkFeatureServer(restaurantId, "translations");
  if (!allowed) return { ok: false, error: "Bu özellik Pro plana aittir." };

  const supabase = createClient();

  // Check if translation exists
  const { data: existing } = await supabase
    .from("restaurant_translations")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("language", language)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("restaurant_translations")
      .update(fields)
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("restaurant_translations")
      .insert({ restaurant_id: restaurantId, language, ...fields });
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function upsertCategoryTranslation(
  categoryId: string,
  language: string,
  fields: { name?: string },
  restaurantId?: string
): Promise<{ ok: boolean; error?: string }> {
  if (restaurantId) {
    const allowed = await checkFeatureServer(restaurantId, "translations");
    if (!allowed) return { ok: false, error: "Bu özellik Pro plana aittir." };
  }

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("category_translations")
    .select("id")
    .eq("category_id", categoryId)
    .eq("language", language)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("category_translations")
      .update(fields)
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("category_translations")
      .insert({ category_id: categoryId, language, ...fields });
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function upsertMenuItemTranslation(
  menuItemId: string,
  language: string,
  fields: {
    name?: string;
    description?: string;
    ingredients?: string;
    portion_info?: string;
    allergen_info?: string;
  },
  restaurantId?: string
): Promise<{ ok: boolean; error?: string }> {
  if (restaurantId) {
    const allowed = await checkFeatureServer(restaurantId, "translations");
    if (!allowed) return { ok: false, error: "Bu özellik Pro plana aittir." };
  }

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("menu_item_translations")
    .select("id")
    .eq("menu_item_id", menuItemId)
    .eq("language", language)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("menu_item_translations")
      .update(fields)
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("menu_item_translations")
      .insert({ menu_item_id: menuItemId, language, ...fields });
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}

/* ─────────────────────── Language Toggle ─────────────────── */

/**
 * Toggle a language on/off in the restaurant's enabled_languages array.
 */
export async function toggleLanguage(
  restaurantId: string,
  language: string,
  enable: boolean
): Promise<{ ok: boolean; error?: string }> {
  const allowed = await checkFeatureServer(restaurantId, "translations");
  if (!allowed) return { ok: false, error: "Bu özellik Pro plana aittir." };

  const supabase = createClient();

  const { data: restaurant, error: fetchErr } = await supabase
    .from("restaurants")
    .select("enabled_languages, default_language")
    .eq("id", restaurantId)
    .single();

  if (fetchErr || !restaurant) {
    return { ok: false, error: "Restoran bulunamadı." };
  }

  let languages = restaurant.enabled_languages || ["tr"];

  if (enable && !languages.includes(language)) {
    languages = [...languages, language];
  } else if (!enable) {
    // Cannot disable the default language
    if (language === restaurant.default_language) {
      return { ok: false, error: "Varsayılan dil devre dışı bırakılamaz." };
    }
    languages = languages.filter((l: string) => l !== language);
  }

  const { error } = await supabase
    .from("restaurants")
    .update({ enabled_languages: languages })
    .eq("id", restaurantId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
