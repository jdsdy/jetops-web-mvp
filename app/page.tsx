import Image from "next/image";
import Link from "next/link";

import { LandingFooter } from "@/components/landing-footer";
import {
  LandingHeader,
  signInClassName,
} from "@/components/landing-header";

const heroBackgroundLayerClassName =
  "absolute inset-0 bg-cover bg-right bg-no-repeat";

const heroReadabilityGradientClassName =
  "absolute inset-0 bg-gradient-to-b from-white via-white/55 to-white/10 lg:bg-gradient-to-r";

const efbPlatforms = [
  {
    name: "ForeFlight",
    logo: "/foreflight.png",
    description:
      "Full flight context and NOTAM extraction is supported with ForeFlight standard format PDF flight plans.",
  },
  {
    name: "OzRunways",
    logo: "/ozrunways.png",
    description:
      "Submit OzRunways flight plan PDFs and specify specific flight details to get accurate NOTAM analysis.",
  },
  {
    name: "NAIPS",
    logo: "/naips.png",
    description:
      "Use NAIPS-generated flight plan documents to provide context for NOTAM analysis.",
  },
];

const capabilities = [
  {
    title: "Upload flight plans",
    description:
      "Submit PDF flight plans for your organisation's aircraft and routes.",
  },
  {
    title: "Extract route details",
    description:
      "Automatically pull departure, arrival, route, and timing from each plan.",
  },
  {
    title: "Review analysed NOTAMs",
    description:
      "Track analysis progress and review NOTAMs relevant to your flight.",
  },
];

export default function Home() {
  return (
    <>
      <LandingHeader />

      <main className="flex-1">
        <section className="relative flex min-h-[calc(100vh-4.5rem)] items-start overflow-hidden lg:items-center">
          <div
            aria-hidden
            className={`${heroBackgroundLayerClassName} bg-[url('/hero_bg_mobile.png')] lg:hidden`}
          />
          <div
            aria-hidden
            className={`${heroBackgroundLayerClassName} hidden bg-[url('/hero_bg.png')] lg:block`}
          />
          <div aria-hidden className={heroReadabilityGradientClassName} />

          <div className="relative mx-auto w-full max-w-6xl px-6 pt-14 pb-20 md:pt-32 lg:py-20">
            <div className="max-w-xl animate-fade-up">
              <p className="mb-4 text-sm font-medium tracking-wide text-aviation-blue uppercase">
                Flight briefing intelligence
              </p>

              <h1 className="text-4xl leading-tight sm:text-5xl sm:leading-tight">
                <span className="font-bold text-neutral-900">Understand NOTAMs</span>
                <span className="font-light text-neutral-500">{"\n"}with confidence.</span>
              </h1>

              <p className="mt-6 max-w-md text-base leading-relaxed text-aviation-slate">
                Jet Operations helps aviation teams remove the headaches and guess work
                of reading and understanding NOTAMs.
              </p>

              <div className="mt-8 animate-fade-up-delay">
                <Link href="/auth" className={signInClassName}>
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-neutral-200 bg-neutral-50">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="max-w-2xl">
              <p className="text-sm font-medium tracking-wide text-aviation-blue uppercase">
                How it works
              </p>
              <h2 className="mt-3 text-3xl leading-tight">
                <span className="font-bold text-neutral-900">
                  Built for operational
                </span>{" "}
                <span className="font-light text-neutral-400">
                  flight planning workflows.
                </span>
              </h2>
            </div>

            <ul className="mt-12 grid gap-8 sm:grid-cols-3">
              {capabilities.map((item, index) => (
                <li
                  key={item.title}
                  className="border-t border-neutral-200 pt-6"
                >
                  <p className="text-sm font-semibold text-aviation-blue">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-neutral-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-aviation-slate">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-neutral-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="max-w-2xl">
              <p className="text-sm font-medium tracking-wide text-aviation-blue uppercase">
                Supported platforms
              </p>
              <h2 className="mt-3 text-3xl leading-tight">
                <span className="font-bold text-neutral-900">
                  Works with your EFB.
                </span>{" "}
                <span className="font-light text-neutral-400">
                  Upload flight plans from the tools you already use.
                </span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-aviation-slate">
                Jet Operations currently supports PDF flight plans from three
                electronic flight bag and briefing platforms. Export your plan,
                upload it, and let the analysis pipeline handle the rest.
              </p>
            </div>

            <ul className="mt-12 grid gap-8 sm:grid-cols-3">
              {efbPlatforms.map((platform) => (
                <li
                  key={platform.name}
                  className="flex flex-col border border-neutral-200 bg-neutral-50 p-6"
                >
                  <div className="flex h-14 items-center">
                    <Image
                      src={platform.logo}
                      alt={platform.name}
                      width={160}
                      height={56}
                      className="h-10 w-auto max-w-[160px] object-contain object-left"
                    />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                    {platform.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-aviation-slate">
                    {platform.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <LandingFooter />
    </>
  );
}
