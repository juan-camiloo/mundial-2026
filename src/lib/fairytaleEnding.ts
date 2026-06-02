import { supabase } from "./supabase";

export const FAIRYTALE_ENDING_DEADLINE_LABEL = "15 de junio de 2026";
export const FAIRYTALE_ENDING_EXTRA_POINTS = 40;

const FAIRYTALE_ENDING_CLOSED_AT = Date.parse("2026-06-16T05:00:00.000Z");

export const isFairytaleEndingClosed = (now = Date.now()) =>
  now >= FAIRYTALE_ENDING_CLOSED_AT;

export const FAIRYTALE_ENDING_CLOSED_MESSAGE =
  "La final soñada ya cerró. Solo se podía enviar hasta el 15 de junio de 2026.";

export const FAIRYTALE_ENDING_REMINDER_MESSAGE =
  "Recuerda rellenar tu final soñada. Si no lo haces antes del 15 de junio de 2026, perderás la oportunidad de ganar 40 puntos extra.";

export const shouldRemindFairytaleEnding = async (userId: string) => {
  if (isFairytaleEndingClosed()) return false;

  const { data, error } = await supabase
    .from("fairytale_ending")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;

  return !data;
};
