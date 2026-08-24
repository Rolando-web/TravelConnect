import Hero from "../components/home/Hero";
import Stats from "../components/home/Stats";
import WhyChooseUs from "../components/home/WhyChooseUs";
import FeaturedPackages from "../components/home/FeaturedPackages";
import PopularDestinations from "../components/home/PopularDestinations";
import JourneySection from "../components/home/JourneySection";
import Testimonials from "../components/home/Testimonials";
import FAQ from "../components/home/FAQ";
import CTA from "../components/home/CTA";

export default function Home() {
  return (
    <div className="w-full relative overflow-x-hidden">
      {/* 1. Hero banner with floating Search Card */}
      <Hero />

      {/* 2. Blue statistics summary banner */}
      <Stats />

      {/* 3. Grid outlining values/why choose us */}
      <WhyChooseUs />

      {/* 4. Grid detailing Romantic Paris, Tokyo, NY packages */}
      <FeaturedPackages />

      {/* 5. Popular destinations with overlays */}
      <PopularDestinations />

      {/* 6. Columns highlighting company statistics and visual image grid collage */}
      <JourneySection />

      {/* 7. Client testimonials column split layout */}
      <Testimonials />

      {/* 8. Frequently Asked Questions interactive accordions */}
      <FAQ />

      {/* 9. Bottom call to action banner */}
      <CTA />
    </div>
  );
}
