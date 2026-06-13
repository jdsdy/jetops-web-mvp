import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { SimpleFormPage } from "@/components/simple-form-page";
import { simpleFormCardClassName } from "@/components/simple-form-styles";
import { createClient } from "@/lib/supabase/server";

/**
 * Placeholder for personal account users until personal features are available.
 */
export default async function PersonalAppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <SimpleFormPage>
      <div className={`${simpleFormCardClassName} text-center`}>
        <p className="text-sm leading-relaxed text-aviation-slate">
          Personal use of the Jet Operations tool is not currently available.
        </p>
        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </SimpleFormPage>
  );
}
