// src/pages/Home.tsx
import AppShell from "../components/ui/AppShell";
import Section from "../components/ui/Section";
import Hero from "../components/home/Hero";
import GlassSearchCard from "../components/home/GlassSearchCard";
import Collage from "../components/home/Collage";
import HowItWorks from "../components/home/HowItWorks";

export default function Home() {
  return (
    <AppShell>
      {/* Hero + search */}
      <Section>
        <div className="grid items-center gap-10 md:grid-cols-[1.05fr_.95fr]">
          <Hero />
          <GlassSearchCard />
        </div>
      </Section>

      {/* Visual break (kept subtle and shorter) */}
      <Section className="-mt-6">
        <Collage />
      </Section>

      {/* Explainer with divider */}
      <Section bordered>
        <HowItWorks />
      </Section>
    </AppShell>
  );
}