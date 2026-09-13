import Hero from "../components/home/Hero";
import Stats from "../components/home/Stats";
import WhyChooseUs from "../components/home/WhyChooseUs";
import FeaturedPackages from "../components/home/FeaturedPackages";
import SignatureExperiences from "../components/home/SignatureExperiences";
import PopularDestinations from "../components/home/PopularDestinations";
import TravelGallery from "../components/home/TravelGallery";
import JourneySection from "../components/home/JourneySection";
import Testimonials from "../components/home/Testimonials";
import AgencySubscription from "../components/home/AgencySubscription";
import FAQ from "../components/home/FAQ";
import CTA from "../components/home/CTA";
import Reveal from "../components/shared/Reveal";

export default function Home() {
  return (
    <div className="w-full relative overflow-x-hidden">
      {/* 1. Hero banner with floating Search Card */}
      <Hero />

      {/* 2. Blue statistics summary banner */}
      <Reveal variant="up" delay={80}>
        <Stats />
      </Reveal>

      {/* 3. Grid outlining values/why choose us */}
      <Reveal variant="left" delay={100}>
        <WhyChooseUs />
      </Reveal>

      {/* 4. Complete Vacation Bundles with rich info-dense offer cards */}
      <Reveal variant="zoom" delay={120}>
        <FeaturedPackages />
      </Reveal>

      {/* 5. Asymmetric Bento Grid of Signature Luxury Experiences */}
      <Reveal variant="right" delay={100}>
        <SignatureExperiences />
      </Reveal>

      {/* 6. Trending destinations with magazine-style masonry layout */}
      <Reveal variant="up" delay={120}>
        <PopularDestinations />
      </Reveal>

      {/* 7. Scattered photo mosaic gallery: Moments Around the World */}
      <Reveal variant="zoom" delay={100}>
        <TravelGallery />
      </Reveal>

      {/* 8. Columns highlighting company statistics and visual image grid collage */}
      <Reveal variant="left" delay={120}>
        <JourneySection />
      </Reveal>

      {/* 9. Client testimonials column split layout */}
      <Reveal variant="right" delay={100}>
        <Testimonials />
      </Reveal>

      {/* 10. B2B — For Travel Agencies: subscription tiers & module unlocks */}
      <Reveal variant="zoom" delay={120}>
        <AgencySubscription />
      </Reveal>

      {/* 11. Frequently Asked Questions interactive accordions */}
      <Reveal variant="up" delay={100}>
        <FAQ />
      </Reveal>

      {/* 12. Immersive scenic call to action and VIP subscription banner */}
      <Reveal variant="zoom" delay={120}>
        <CTA />
      </Reveal>
    </div>
  );
}

