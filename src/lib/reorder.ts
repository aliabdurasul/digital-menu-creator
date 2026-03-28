import { createClient } from "@/lib/supabase/client";

/** Move an item from `from` to `to` in an array and return the new array. */
export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const clone = [...arr];
  const [item] = clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
}

/**
 * Persist new `order` values for a list of items to Supabase.
 * Each item must have an `id` property. The `order` column in the given
 * table is set to the item's index in the array.
 */
export async function persistReorder(
  table: "categories" | "menu_items",
  items: { id: string }[]
): Promise<void> {
  const supabase = createClient();
  await Promise.all(
    items.map((item, idx) =>
      supabase.from(table).update({ order: idx }).eq("id", item.id)
    )
  );
}
