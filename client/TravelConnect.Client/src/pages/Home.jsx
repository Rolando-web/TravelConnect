import Hero from "../components/home/Hero";
import Stats from "../components/home/Stats";
import WhyChooseUs from "../components/home/WhyChooseUs";
import FeaturedPackages from "../components/home/FeaturedPackages";
import SignatureExperiences from "../components/home/SignatureExperiences";
import PopularDestinations from "../components/home/PopularDestinations";
import TravelGallery from "../components/home/TravelGallery";
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

      {/* 4. Complete Vacation Bundles with rich info-dense offer cards */}
      <FeaturedPackages />

      {/* 5. Asymmetric Bento Grid of Signature Luxury Experiences */}
      <SignatureExperiences />

      {/* 6. Trending destinations with magazine-style masonry layout */}
      <PopularDestinations />

      {/* 7. Scattered photo mosaic gallery: Moments Around the World */}
      <TravelGallery />

      {/* 8. Columns highlighting company statistics and visual image grid collage */}
      <JourneySection />

      {/* 9. Client testimonials column split layout */}
      <Testimonials />

      {/* 10. Frequently Asked Questions interactive accordions */}
      <FAQ />

      {/* 11. Immersive scenic call to action and VIP subscription banner */}
      <CTA />
    </div>
  );
}

